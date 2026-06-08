const Paper = require('../models/Paper');
const mongoose = require('mongoose');

const getOverviewStats = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const [
      totalPapers,
      totalAuthors,
      totalCitations,
      yearRange,
      topKeywords
    ] = await Promise.all([
      Paper.countDocuments({ uploadedBy: userId }),
      Paper.aggregate([
        { $match: { uploadedBy: userId } },
        { $unwind: '$authors' },
        { $group: { _id: '$authors' } },
        { $count: 'count' }
      ]),
      Paper.aggregate([
        { $match: { uploadedBy: userId } },
        { $group: { _id: null, total: { $sum: '$citations' } } }
      ]),
      Paper.aggregate([
        { $match: { uploadedBy: userId, year: { $exists: true } } },
        { $group: { _id: null, minYear: { $min: '$year' }, maxYear: { $max: '$year' } } }
      ]),
      Paper.getTopKeywords(userId, 10)
    ]);

    res.json({
      success: true,
      data: {
        totalPapers,
        totalAuthors: totalAuthors[0]?.count || 0,
        totalCitations: totalCitations[0]?.total || 0,
        avgCitations: totalPapers > 0 
          ? Math.round((totalCitations[0]?.total || 0) / totalPapers * 100) / 100 
          : 0,
        yearRange: yearRange[0] 
          ? { min: yearRange[0].minYear, max: yearRange[0].maxYear }
          : { min: null, max: null },
        topKeywords
      }
    });
  } catch (error) {
    next(error);
  }
};

const getCooperationNetwork = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { minCollaborations = 1, maxNodes = 50 } = req.query;

    const papers = await Paper.find(
      { uploadedBy: userId, authors: { $exists: true, $not: { $size: 0 } } },
      'authors citations year'
    );

    const authorMap = new Map();
    const collaborationMap = new Map();

    papers.forEach(paper => {
      const authors = paper.authors.filter(a => a && a.trim());
      
      authors.forEach(author => {
        if (!authorMap.has(author)) {
          authorMap.set(author, {
            name: author,
            paperCount: 0,
            totalCitations: 0,
            years: new Set()
          });
        }
        const authorData = authorMap.get(author);
        authorData.paperCount++;
        authorData.totalCitations += paper.citations || 0;
        if (paper.year) authorData.years.add(paper.year);
      });

      for (let i = 0; i < authors.length; i++) {
        for (let j = i + 1; j < authors.length; j++) {
          const key = [authors[i], authors[j]].sort().join('||');
          if (!collaborationMap.has(key)) {
            collaborationMap.set(key, {
              source: authors[i],
              target: authors[j],
              weight: 0,
              papers: []
            });
          }
          const collab = collaborationMap.get(key);
          collab.weight++;
        }
      }
    });

    let nodes = Array.from(authorMap.values())
      .sort((a, b) => b.paperCount - a.paperCount)
      .slice(0, Number(maxNodes))
      .map((author, index) => ({
        id: index,
        name: author.name,
        value: author.paperCount,
        paperCount: author.paperCount,
        totalCitations: author.totalCitations,
        avgCitations: author.paperCount > 0 
          ? Math.round(author.totalCitations / author.paperCount * 100) / 100 
          : 0,
        yearRange: author.years.size > 0
          ? { min: Math.min(...author.years), max: Math.max(...author.years) }
          : null,
        category: 0
      }));

    const authorNameToId = new Map(nodes.map(n => [n.name, n.id]));

    let links = Array.from(collaborationMap.values())
      .filter(collab => 
        authorNameToId.has(collab.source) && 
        authorNameToId.has(collab.target) &&
        collab.weight >= Number(minCollaborations)
      )
      .map(collab => ({
        source: authorNameToId.get(collab.source),
        target: authorNameToId.get(collab.target),
        value: collab.weight
      }));

    const connectedAuthors = new Set();
    links.forEach(link => {
      connectedAuthors.add(link.source);
      connectedAuthors.add(link.target);
    });

    nodes = nodes.map(node => ({
      ...node,
      category: connectedAuthors.has(node.id) ? 0 : 1
    }));

    const maxPaperCount = Math.max(...nodes.map(n => n.paperCount), 1);
    nodes.forEach(node => {
      node.symbolSize = Math.max(15, Math.min(60, (node.paperCount / maxPaperCount) * 50 + 15));
    });

    const categories = [
      { name: '合作网络节点' },
      { name: '独立作者' }
    ];

    res.json({
      success: true,
      data: {
        nodes,
        links,
        categories,
        stats: {
          totalNodes: nodes.length,
          totalLinks: links.length,
          maxCollaborations: links.length > 0 ? Math.max(...links.map(l => l.value)) : 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

const getCitationAnalysis = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { limit = 50 } = req.query;

    const papers = await Paper.find(
      { uploadedBy: userId },
      'title authors journal year citations doi keywords'
    )
    .sort({ citations: -1 })
    .limit(Number(limit));

    const citationsDistribution = await Paper.aggregate([
      { $match: { uploadedBy: userId } },
      {
        $bucket: {
          groupBy: '$citations',
          boundaries: [0, 1, 5, 10, 25, 50, 100, 500, 1000],
          default: '1000+',
          output: {
            count: { $sum: 1 }
          }
        }
      }
    ]);

    const citationRanges = ['0', '1-4', '5-9', '10-24', '25-49', '50-99', '100-499', '500-999', '1000+'];
    const distMap = new Map();
    citationsDistribution.forEach(item => {
      const idx = typeof item._id === 'number' ? item._id : 8;
      distMap.set(citationRanges[idx], item.count);
    });
    const distribution = citationRanges.map(range => ({
      range,
      count: distMap.get(range) || 0
    }));

    const yearCitationTrend = await Paper.aggregate([
      { $match: { uploadedBy: userId, year: { $exists: true } } },
      {
        $group: {
          _id: '$year',
          paperCount: { $sum: 1 },
          totalCitations: { $sum: '$citations' },
          avgCitations: { $avg: '$citations' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const hIndex = calculateHIndex(papers.map(p => p.citations));

    res.json({
      success: true,
      data: {
        topCitedPapers: papers,
        distribution,
        yearTrend: yearCitationTrend.map(item => ({
          year: item._id,
          paperCount: item.paperCount,
          totalCitations: item.totalCitations,
          avgCitations: Math.round(item.avgCitations * 100) / 100
        })),
        hIndex,
        totalPapers: papers.length,
        totalCitations: papers.reduce((sum, p) => sum + p.citations, 0)
      }
    });
  } catch (error) {
    next(error);
  }
};

const calculateHIndex = (citations) => {
  if (!citations || citations.length === 0) return 0;
  const sorted = [...citations].sort((a, b) => b - a);
  let h = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i] >= i + 1) {
      h = i + 1;
    } else {
      break;
    }
  }
  return h;
};

const getKeywordTrends = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { topN = 15 } = req.query;

    const trends = await Paper.getKeywordTrends(userId, Number(topN));

    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    next(error);
  }
};

const getAuthorProductivity = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { limit = 30 } = req.query;

    const allAuthors = await Paper.aggregate([
      { $match: { uploadedBy: userId } },
      { $unwind: '$authors' },
      {
        $group: {
          _id: '$authors',
          paperCount: { $sum: 1 },
          totalCitations: { $sum: '$citations' },
          avgCitations: { $avg: '$citations' },
          firstYear: { $min: '$year' },
          lastYear: { $max: '$year' },
          journals: { $addToSet: '$journal' }
        }
      },
      { $sort: { paperCount: -1 } }
    ]);

    const totalAuthors = allAuthors.length;
    const topAuthors = allAuthors.slice(0, Number(limit));

    const authors = topAuthors.map(author => ({
      author: author._id,
      paperCount: author.paperCount,
      totalCitations: author.totalCitations,
      avgCitations: Math.round(author.avgCitations * 100) / 100,
      activeYears: author.firstYear && author.lastYear 
        ? author.lastYear - author.firstYear + 1 
        : 0,
      firstYear: author.firstYear,
      lastYear: author.lastYear,
      journalCount: author.journals.filter(j => j).length
    }));

    const totalPapersByAuthors = allAuthors.reduce((sum, a) => sum + a.paperCount, 0);
    const maxPapers = allAuthors.length > 0 ? allAuthors[0].paperCount : 0;
    const activeAuthors = allAuthors.filter(a => a.paperCount >= 2).length;
    const avgPapersPerAuthor = totalAuthors > 0 
      ? Math.round((totalPapersByAuthors / totalAuthors) * 100) / 100 
      : 0;

    res.json({
      success: true,
      data: {
        authors,
        totalAuthors,
        avgPapersPerAuthor,
        maxPapers,
        activeAuthors
      }
    });
  } catch (error) {
    next(error);
  }
};

const getJournalAnalysis = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { limit = 30 } = req.query;

    const journals = await Paper.aggregate([
      { $match: { uploadedBy: userId, journal: { $exists: true, $ne: '' } } },
      {
        $group: {
          _id: '$journal',
          paperCount: { $sum: 1 },
          totalCitations: { $sum: '$citations' },
          avgCitations: { $avg: '$citations' },
          firstYear: { $min: '$year' },
          lastYear: { $max: '$year' }
        }
      },
      { $sort: { paperCount: -1 } },
      { $limit: Number(limit) }
    ]);

    const result = journals.map(journal => ({
      journal: journal._id,
      paperCount: journal.paperCount,
      totalCitations: journal.totalCitations,
      avgCitations: Math.round(journal.avgCitations * 100) / 100,
      firstYear: journal.firstYear,
      lastYear: journal.lastYear
    }));

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const getFundingAnalysis = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { limit = 20, trendTopN = 8 } = req.query;

    const [fundingStats, fundingTrends, totalWithFunding] = await Promise.all([
      Paper.getFundingStats(userId, Number(limit)),
      Paper.getFundingTrends(userId, Number(trendTopN)),
      Paper.countDocuments({ 
        uploadedBy: userId, 
        funding: { $exists: true, $not: { $size: 0 } } 
      })
    ]);

    const totalPapers = await Paper.countDocuments({ uploadedBy: userId });

    const totalFundingProjects = fundingStats.reduce((sum, f) => sum + f.paperCount, 0);

    res.json({
      success: true,
      data: {
        fundings: fundingStats,
        trends: fundingTrends,
        stats: {
          totalWithFunding,
          totalPapers,
          fundingRate: totalPapers > 0 
            ? Math.round(totalWithFunding / totalPapers * 10000) / 100 
            : 0,
          totalFundingProjects: fundingStats.length,
          avgFundingPerPaper: totalWithFunding > 0
            ? Math.round(totalFundingProjects / totalWithFunding * 100) / 100
            : 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

const getAffiliationNetwork = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { limit = 30, minCollaborations = 1 } = req.query;

    const networkData = await Paper.getAffiliationNetwork(userId, Number(limit));

    const { nodes, links } = networkData;

    const filteredLinks = links.filter(l => l.value >= Number(minCollaborations));

    const connectedNodeIds = new Set();
    filteredLinks.forEach(l => {
      connectedNodeIds.add(l.source);
      connectedNodeIds.add(l.target);
    });

    const finalNodes = nodes.map(node => ({
      ...node,
      category: connectedNodeIds.has(node.id) ? 0 : 1
    }));

    const maxPaperCount = Math.max(...finalNodes.map(n => n.paperCount), 1);
    finalNodes.forEach(node => {
      node.symbolSize = Math.max(20, Math.min(70, (node.paperCount / maxPaperCount) * 50 + 20));
    });

    const categories = [
      { name: '合作机构' },
      { name: '独立机构' }
    ];

    res.json({
      success: true,
      data: {
        nodes: finalNodes,
        links: filteredLinks,
        categories,
        stats: {
          totalAffiliations: networkData.totalAffiliations,
          totalPapers: networkData.totalPapers,
          visibleNodes: finalNodes.length,
          visibleLinks: filteredLinks.length,
          maxCollaborations: filteredLinks.length > 0 
            ? Math.max(...filteredLinks.map(l => l.value)) 
            : 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

const exportReport = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { format = 'html', sections = 'all' } = req.query;

    const [
      overview,
      yearDistribution,
      topAuthors,
      topJournals,
      topKeywords,
      citationAnalysis,
      topFundings,
      topAffiliations
    ] = await Promise.all([
      Paper.countDocuments({ uploadedBy: userId }),
      Paper.getYearDistribution(userId),
      Paper.getTopAuthors(userId, 10),
      Paper.getTopJournals(userId, 10),
      Paper.getTopKeywords(userId, 15),
      Paper.aggregate([
        { $match: { uploadedBy: userId } },
        {
          $group: {
            _id: null,
            totalCitations: { $sum: '$citations' },
            avgCitations: { $avg: '$citations' }
          }
        }
      ]),
      Paper.getFundingStats(userId, 10),
      Paper.getTopAffiliations(userId, 10)
    ]);

    const totalCitations = citationAnalysis[0]?.totalCitations || 0;
    const avgCitations = citationAnalysis[0]?.avgCitations || 0;

    const hIndexPapers = await Paper.find({ uploadedBy: userId })
      .select('citations')
      .sort({ citations: -1 });
    const hIndex = calculateHIndex(hIndexPapers.map(p => p.citations));

    const reportData = {
      generatedAt: new Date().toLocaleString('zh-CN'),
      overview: {
        totalPapers: overview,
        totalAuthors: topAuthors.length,
        totalCitations,
        avgCitations: Math.round(avgCitations * 100) / 100,
        hIndex,
        yearRange: yearDistribution.length > 0 
          ? `${yearDistribution[0].year} - ${yearDistribution[yearDistribution.length - 1].year}`
          : 'N/A'
      },
      yearDistribution,
      topAuthors,
      topJournals,
      topKeywords,
      topFundings,
      topAffiliations
    };

    if (format === 'json') {
      res.json({
        success: true,
        data: reportData
      });
      return;
    }

    const htmlReport = generateHTMLReport(reportData);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="bibliometrics-report-${Date.now()}.html"`);
    res.send(htmlReport);
  } catch (error) {
    next(error);
  }
};

function generateHTMLReport(data) {
  const { generatedAt, overview, yearDistribution, topAuthors, topJournals, topKeywords, topFundings, topAffiliations } = data;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>文献计量分析报告</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
      background: #f5f7fa;
      color: #303133;
      padding: 30px;
      line-height: 1.6;
    }
    .report-container {
      max-width: 900px;
      margin: 0 auto;
      background: #fff;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    }
    .report-header {
      text-align: center;
      padding-bottom: 25px;
      border-bottom: 2px solid #409eff;
      margin-bottom: 30px;
    }
    .report-header h1 {
      font-size: 28px;
      color: #303133;
      margin-bottom: 10px;
    }
    .report-header .subtitle {
      color: #909399;
      font-size: 14px;
    }
    .section {
      margin-bottom: 30px;
    }
    .section-title {
      font-size: 18px;
      font-weight: 600;
      color: #303133;
      padding-bottom: 10px;
      border-bottom: 1px solid #ebeef5;
      margin-bottom: 15px;
      padding-left: 10px;
      border-left: 4px solid #409eff;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 15px;
      margin-bottom: 15px;
    }
    .stat-card {
      background: #f5f7fa;
      padding: 18px;
      border-radius: 8px;
      text-align: center;
    }
    .stat-card .number {
      font-size: 28px;
      font-weight: 700;
      color: #409eff;
      margin-bottom: 5px;
    }
    .stat-card .label {
      font-size: 13px;
      color: #606266;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    th, td {
      padding: 10px 12px;
      text-align: left;
      border-bottom: 1px solid #ebeef5;
      font-size: 14px;
    }
    th {
      background: #f5f7fa;
      font-weight: 600;
      color: #606266;
    }
    tr:hover td {
      background: #fafcff;
    }
    .rank {
      display: inline-block;
      width: 24px;
      height: 24px;
      line-height: 24px;
      text-align: center;
      border-radius: 50%;
      font-size: 12px;
      font-weight: 600;
      background: #e4e7ed;
      color: #606266;
    }
    .rank.top-1 { background: #f56c6c; color: #fff; }
    .rank.top-2 { background: #e6a23c; color: #fff; }
    .rank.top-3 { background: #e6a23c; color: #fff; }
    .keyword-tag {
      display: inline-block;
      padding: 4px 10px;
      margin: 3px;
      background: #ecf5ff;
      color: #409eff;
      border-radius: 4px;
      font-size: 12px;
    }
    .report-footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ebeef5;
      text-align: center;
      color: #909399;
      font-size: 12px;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .report-container { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="report-header">
      <h1>📊 文献计量分析报告</h1>
      <div class="subtitle">生成时间：${generatedAt}</div>
    </div>

    <div class="section">
      <h2 class="section-title">一、总体概览</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="number">${overview.totalPapers}</div>
          <div class="label">论文总数</div>
        </div>
        <div class="stat-card">
          <div class="number">${overview.totalAuthors}</div>
          <div class="label">涉及作者数</div>
        </div>
        <div class="stat-card">
          <div class="number">${overview.totalCitations}</div>
          <div class="label">总被引次数</div>
        </div>
        <div class="stat-card">
          <div class="number">${overview.avgCitations}</div>
          <div class="label">篇均被引</div>
        </div>
        <div class="stat-card">
          <div class="number">${overview.hIndex}</div>
          <div class="label">H指数</div>
        </div>
        <div class="stat-card">
          <div class="number" style="font-size: 16px; line-height: 28px;">${overview.yearRange}</div>
          <div class="label">时间跨度</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">二、年度发文趋势</h2>
      <table>
        <thead>
          <tr>
            <th>年份</th>
            <th>论文数</th>
            <th>篇均被引</th>
          </tr>
        </thead>
        <tbody>
          ${yearDistribution.map(y => `
            <tr>
              <td><strong>${y.year}</strong></td>
              <td>${y.count}</td>
              <td>${y.avgCitations}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2 class="section-title">三、高产作者 Top 10</h2>
      <table>
        <thead>
          <tr>
            <th width="60">排名</th>
            <th>作者</th>
            <th>论文数</th>
            <th>总被引</th>
            <th>篇均被引</th>
          </tr>
        </thead>
        <tbody>
          ${topAuthors.map((a, i) => `
            <tr>
              <td><span class="rank ${i < 3 ? 'top-' + (i+1) : ''}">${i + 1}</span></td>
              <td><strong>${a.author}</strong></td>
              <td>${a.paperCount}</td>
              <td>${a.totalCitations}</td>
              <td>${a.avgCitations}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2 class="section-title">四、发文期刊 Top 10</h2>
      <table>
        <thead>
          <tr>
            <th width="60">排名</th>
            <th>期刊名称</th>
            <th>论文数</th>
            <th>总被引</th>
            <th>篇均被引</th>
          </tr>
        </thead>
        <tbody>
          ${topJournals.map((j, i) => `
            <tr>
              <td><span class="rank ${i < 3 ? 'top-' + (i+1) : ''}">${i + 1}</span></td>
              <td><strong>${j.journal}</strong></td>
              <td>${j.paperCount}</td>
              <td>${j.totalCitations}</td>
              <td>${j.avgCitations}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2 class="section-title">五、研究热点关键词 Top 15</h2>
      <div style="margin-top: 10px;">
        ${topKeywords.map((k, i) => `
          <span class="keyword-tag" style="font-size: ${Math.max(12, 20 - i * 0.5)}px;">
            ${k.keyword} (${k.count})
          </span>
        `).join('')}
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">六、基金项目统计 Top 10</h2>
      <table>
        <thead>
          <tr>
            <th width="60">排名</th>
            <th>基金项目</th>
            <th>论文数</th>
            <th>总被引</th>
          </tr>
        </thead>
        <tbody>
          ${topFundings.length > 0 ? topFundings.map((f, i) => `
            <tr>
              <td><span class="rank ${i < 3 ? 'top-' + (i+1) : ''}">${i + 1}</span></td>
              <td><strong>${f.funding}</strong></td>
              <td>${f.paperCount}</td>
              <td>${f.totalCitations}</td>
            </tr>
          `).join('') : '<tr><td colspan="4" style="text-align:center;color:#909399;">暂无基金数据</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2 class="section-title">七、合作机构 Top 10</h2>
      <table>
        <thead>
          <tr>
            <th width="60">排名</th>
            <th>机构名称</th>
            <th>论文数</th>
            <th>总被引</th>
          </tr>
        </thead>
        <tbody>
          ${topAffiliations.length > 0 ? topAffiliations.map((a, i) => `
            <tr>
              <td><span class="rank ${i < 3 ? 'top-' + (i+1) : ''}">${i + 1}</span></td>
              <td><strong>${a.affiliation}</strong></td>
              <td>${a.paperCount}</td>
              <td>${a.totalCitations}</td>
            </tr>
          `).join('') : '<tr><td colspan="4" style="text-align:center;color:#909399;">暂无机构数据</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="report-footer">
      <p>本报告由文献计量分析平台自动生成，数据仅供参考。</p>
      <p>生成时间：${generatedAt}</p>
    </div>
  </div>
</body>
</html>`;
}

module.exports = {
  getOverviewStats,
  getCooperationNetwork,
  getCitationAnalysis,
  getKeywordTrends,
  getAuthorProductivity,
  getJournalAnalysis,
  getFundingAnalysis,
  getAffiliationNetwork,
  exportReport
};
