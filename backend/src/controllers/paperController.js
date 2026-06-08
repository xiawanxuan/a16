const Paper = require('../models/Paper');

const getPapers = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search = '', 
      year, 
      journal,
      author,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = { uploadedBy: req.user._id };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { abstract: { $regex: search, $options: 'i' } },
        { keywords: { $regex: search, $options: 'i' } },
        { authors: { $regex: search, $options: 'i' } }
      ];
    }

    if (year) {
      query.year = Number(year);
    }

    if (journal) {
      query.journal = { $regex: journal, $options: 'i' };
    }

    if (author) {
      query.authors = { $regex: author, $options: 'i' };
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const papers = await Paper.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Paper.countDocuments(query);

    res.json({
      success: true,
      data: papers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

const getPaper = async (req, res, next) => {
  try {
    const paper = await Paper.findOne({
      _id: req.params.id,
      uploadedBy: req.user._id
    });

    if (!paper) {
      return res.status(404).json({ message: '论文不存在' });
    }

    res.json({
      success: true,
      data: paper
    });
  } catch (error) {
    next(error);
  }
};

const createPaper = async (req, res, next) => {
  try {
    const paperData = {
      ...req.body,
      uploadedBy: req.user._id,
      source: 'manual'
    };

    const paper = await Paper.create(paperData);

    res.status(201).json({
      success: true,
      data: paper
    });
  } catch (error) {
    next(error);
  }
};

const updatePaper = async (req, res, next) => {
  try {
    const paper = await Paper.findOneAndUpdate(
      { _id: req.params.id, uploadedBy: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!paper) {
      return res.status(404).json({ message: '论文不存在' });
    }

    res.json({
      success: true,
      data: paper
    });
  } catch (error) {
    next(error);
  }
};

const deletePaper = async (req, res, next) => {
  try {
    const paper = await Paper.findOneAndDelete({
      _id: req.params.id,
      uploadedBy: req.user._id
    });

    if (!paper) {
      return res.status(404).json({ message: '论文不存在' });
    }

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    next(error);
  }
};

const batchDelete = async (req, res, next) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: '请提供要删除的论文ID列表' });
    }

    const result = await Paper.deleteMany({
      _id: { $in: ids },
      uploadedBy: req.user._id
    });

    res.json({
      success: true,
      message: `成功删除 ${result.deletedCount} 篇论文`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    next(error);
  }
};

const getPaperStats = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const [
      totalPapers,
      totalCitations,
      yearDistribution,
      topAuthors,
      topJournals,
      topKeywords
    ] = await Promise.all([
      Paper.countDocuments({ uploadedBy: userId }),
      Paper.aggregate([
        { $match: { uploadedBy: userId } },
        { $group: { _id: null, total: { $sum: '$citations' } } }
      ]),
      Paper.getYearDistribution(userId),
      Paper.getTopAuthors(userId, 10),
      Paper.getTopJournals(userId, 10),
      Paper.getTopKeywords(userId, 20)
    ]);

    const avgCitations = totalPapers > 0 
      ? Math.round((totalCitations[0]?.total || 0) / totalPapers * 100) / 100 
      : 0;

    res.json({
      success: true,
      data: {
        totalPapers,
        totalCitations: totalCitations[0]?.total || 0,
        avgCitations,
        yearDistribution,
        topAuthors,
        topJournals,
        topKeywords
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPapers,
  getPaper,
  createPaper,
  updatePaper,
  deletePaper,
  batchDelete,
  getPaperStats
};
