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

module.exports = mongoose.model('Paper', paperSchema);
