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

module.exports = {
  getOverviewStats,
  getCooperationNetwork,
  getCitationAnalysis,
  getKeywordTrends,
  getAuthorProductivity,
  getJournalAnalysis
};
