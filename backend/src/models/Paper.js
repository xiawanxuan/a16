const mongoose = require('mongoose');

const paperSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, '论文标题不能为空'],
    trim: true
  },
  authors: [{
    type: String,
    trim: true
  }],
  authorAffiliations: [{
    author: String,
    affiliation: String
  }],
  journal: {
    type: String,
    trim: true
  },
  year: {
    type: Number,
    index: true
  },
  volume: String,
  issue: String,
  pages: String,
  doi: {
    type: String,
    trim: true,
    index: true
  },
  abstract: {
    type: String,
    trim: true
  },
  keywords: [{
    type: String,
    trim: true
  }],
  funding: [{
    type: String,
    trim: true
  }],
  fundingAgencies: [{
    type: String,
    trim: true
  }],
  affiliations: [{
    type: String,
    trim: true
  }],
  citations: {
    type: Number,
    default: 0,
    index: true
  },
  references: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Paper'
  }],
  citedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Paper'
  }],
  source: {
    type: String,
    enum: ['bibtex', 'csv', 'manual', 'api'],
    default: 'manual'
  },
  sourceFile: {
    type: String
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  fields: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

paperSchema.index({ title: 'text', abstract: 'text', keywords: 'text' });
paperSchema.index({ authors: 1 });
paperSchema.index({ year: 1, citations: -1 });

paperSchema.statics.getYearDistribution = async function(userId) {
  const match = userId ? { uploadedBy: mongoose.Types.ObjectId(userId) } : {};
  const result = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$year',
        count: { $sum: 1 },
        avgCitations: { $avg: '$citations' }
      }
    },
    { $sort: { _id: 1 } }
  ]);
  return result.map(item => ({
    year: item._id,
    count: item.count,
    avgCitations: Math.round(item.avgCitations * 100) / 100
  })).filter(item => item.year);
};

paperSchema.statics.getTopAuthors = async function(userId, limit = 20) {
  const match = userId ? { uploadedBy: mongoose.Types.ObjectId(userId) } : {};
  const result = await this.aggregate([
    { $match: match },
    { $unwind: '$authors' },
    {
      $group: {
        _id: '$authors',
        paperCount: { $sum: 1 },
        totalCitations: { $sum: '$citations' },
        avgCitations: { $avg: '$citations' }
      }
    },
    { $sort: { paperCount: -1 } },
    { $limit: limit }
  ]);
  return result.map(item => ({
    author: item._id,
    paperCount: item.paperCount,
    totalCitations: item.totalCitations,
    avgCitations: Math.round(item.avgCitations * 100) / 100
  }));
};

paperSchema.statics.getTopJournals = async function(userId, limit = 20) {
  const match = userId ? { uploadedBy: mongoose.Types.ObjectId(userId) } : {};
  const result = await this.aggregate([
    { $match: match },
    { $match: { journal: { $exists: true, $ne: '' } } },
    {
      $group: {
        _id: '$journal',
        paperCount: { $sum: 1 },
        totalCitations: { $sum: '$citations' },
        avgCitations: { $avg: '$citations' }
      }
    },
    { $sort: { paperCount: -1 } },
    { $limit: limit }
  ]);
  return result.map(item => ({
    journal: item._id,
    paperCount: item.paperCount,
    totalCitations: item.totalCitations,
    avgCitations: Math.round(item.avgCitations * 100) / 100
  }));
};

paperSchema.statics.getTopKeywords = async function(userId, limit = 30) {
  const match = userId ? { uploadedBy: mongoose.Types.ObjectId(userId) } : {};
  const result = await this.aggregate([
    { $match: match },
    { $unwind: '$keywords' },
    {
      $group: {
        _id: '$keywords',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: limit }
  ]);
  return result.map(item => ({
    keyword: item._id,
    count: item.count
  })).filter(item => item.keyword && item.keyword.trim());
};

paperSchema.statics.getKeywordTrends = async function(userId, topN = 10) {
  const match = userId ? { uploadedBy: mongoose.Types.ObjectId(userId) } : {};
  
  const topKeywords = await this.aggregate([
    { $match: match },
    { $unwind: '$keywords' },
    { $group: { _id: '$keywords', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: topN }
  ]);
  
  const keywordList = topKeywords.map(k => k._id);
  
  const trends = await this.aggregate([
    { $match: { ...match, keywords: { $in: keywordList } } },
    { $unwind: '$keywords' },
    { $match: { keywords: { $in: keywordList } } },
    {
      $group: {
        _id: { year: '$year', keyword: '$keywords' },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1 } }
  ]);
  
  const years = [...new Set(trends.map(t => t._id.year))].filter(y => y).sort();
  
  const result = keywordList.map(keyword => {
    const data = years.map(year => {
      const found = trends.find(t => t._id.keyword === keyword && t._id.year === year);
      return found ? found.count : 0;
    });
    return { keyword, data };
  });
  
  return { years, keywords: result };
};

paperSchema.statics.getFundingStats = async function(userId, limit = 20) {
  const match = userId ? { uploadedBy: mongoose.Types.ObjectId(userId) } : {};
  
  const result = await this.aggregate([
    { $match: match },
    { $match: { funding: { $exists: true, $ne: [] } } },
    { $unwind: '$funding' },
    { $match: { funding: { $ne: '' } } },
    {
      $group: {
        _id: '$funding',
        paperCount: { $sum: 1 },
        totalCitations: { $sum: '$citations' },
        avgCitations: { $avg: '$citations' },
        papers: { $push: '$title' }
      }
    },
    { $sort: { paperCount: -1 } },
    { $limit: limit }
  ]);
  
  return result.map(item => ({
    funding: item._id,
    paperCount: item.paperCount,
    totalCitations: item.totalCitations,
    avgCitations: Math.round(item.avgCitations * 100) / 100
  }));
};

paperSchema.statics.getFundingTrends = async function(userId, topN = 8) {
  const match = userId ? { uploadedBy: mongoose.Types.ObjectId(userId) } : {};
  
  const topFundings = await this.aggregate([
    { $match: match },
    { $match: { funding: { $exists: true, $ne: [] } } },
    { $unwind: '$funding' },
    { $match: { funding: { $ne: '' } } },
    { $group: { _id: '$funding', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: topN }
  ]);
  
  const fundingList = topFundings.map(f => f._id);
  
  const trends = await this.aggregate([
    { $match: { ...match, funding: { $in: fundingList } } },
    { $unwind: '$funding' },
    { $match: { funding: { $in: fundingList } } },
    {
      $group: {
        _id: { year: '$year', funding: '$funding' },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1 } }
  ]);
  
  const years = [...new Set(trends.map(t => t._id.year))].filter(y => y).sort();
  
  const result = fundingList.map(funding => {
    const data = years.map(year => {
      const found = trends.find(t => t._id.funding === funding && t._id.year === year);
      return found ? found.count : 0;
    });
    return { funding, data };
  });
  
  return { years, fundings: result };
};

paperSchema.statics.getTopAffiliations = async function(userId, limit = 20) {
  const match = userId ? { uploadedBy: mongoose.Types.ObjectId(userId) } : {};
  
  const result = await this.aggregate([
    { $match: match },
    { $match: { affiliations: { $exists: true, $ne: [] } } },
    { $unwind: '$affiliations' },
    { $match: { affiliations: { $ne: '' } } },
    {
      $group: {
        _id: '$affiliations',
        paperCount: { $sum: 1 },
        totalCitations: { $sum: '$citations' },
        avgCitations: { $avg: '$citations' }
      }
    },
    { $sort: { paperCount: -1 } },
    { $limit: limit }
  ]);
  
  return result.map(item => ({
    affiliation: item._id,
    paperCount: item.paperCount,
    totalCitations: item.totalCitations,
    avgCitations: Math.round(item.avgCitations * 100) / 100
  }));
};

paperSchema.statics.getAffiliationNetwork = async function(userId, limit = 30) {
  const match = userId ? { uploadedBy: mongoose.Types.ObjectId(userId) } : {};
  
  const papers = await this.find(match)
    .select('affiliations citations title')
    .where('affiliations').ne([])
    .lean();
  
  const affiliationMap = new Map();
  const connectionMap = new Map();
  
  papers.forEach(paper => {
    const affs = paper.affiliations.filter(a => a && a.trim());
    
    affs.forEach(aff => {
      if (!affiliationMap.has(aff)) {
        affiliationMap.set(aff, {
          name: aff,
          paperCount: 0,
          totalCitations: 0
        });
      }
      const data = affiliationMap.get(aff);
      data.paperCount++;
      data.totalCitations += paper.citations || 0;
    });
    
    for (let i = 0; i < affs.length; i++) {
      for (let j = i + 1; j < affs.length; j++) {
        const key = [affs[i], affs[j]].sort().join('|||');
        if (!connectionMap.has(key)) {
          connectionMap.set(key, {
            source: affs[i],
            target: affs[j],
            value: 0
          });
        }
        connectionMap.get(key).value++;
      }
    }
  });
  
  const topAffiliations = [...affiliationMap.values()]
    .sort((a, b) => b.paperCount - a.paperCount)
    .slice(0, limit);
  
  const topNames = new Set(topAffiliations.map(a => a.name));
  
  const nodes = topAffiliations.map((aff, index) => ({
    id: index,
    name: aff.name,
    paperCount: aff.paperCount,
    totalCitations: aff.totalCitations,
    category: 0
  }));
  
  const nameToIndex = new Map(nodes.map(n => [n.name, n.id]));
  
  const links = [];
  connectionMap.forEach(conn => {
    if (topNames.has(conn.source) && topNames.has(conn.target)) {
      links.push({
        source: nameToIndex.get(conn.source),
        target: nameToIndex.get(conn.target),
        value: conn.value
      });
    }
  });
  
  return {
    nodes,
    links,
    totalAffiliations: affiliationMap.size,
    totalPapers: papers.length
  };
};

module.exports = mongoose.model('Paper', paperSchema);
