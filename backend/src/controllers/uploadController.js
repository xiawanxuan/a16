const Paper = require('../models/Paper');
const BibTeXParser = require('../utils/bibtexParser');
const CSVParser = require('../utils/csvParser');

const uploadPapers = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请选择要上传的文件' });
    }

    const content = req.file.buffer.toString('utf-8');
    const fileName = req.file.originalname.toLowerCase();
    let papers = [];

    if (fileName.endsWith('.bib') || fileName.endsWith('.bibtex')) {
      const parser = new BibTeXParser();
      papers = parser.parseToPapers(content);
    } else if (fileName.endsWith('.csv')) {
      const parser = new CSVParser();
      papers = parser.parseToPapers(content);
    } else if (fileName.endsWith('.txt')) {
      const bibParser = new BibTeXParser();
      const bibPapers = bibParser.parseToPapers(content);
      
      if (bibPapers.length > 0) {
        papers = bibPapers;
      } else {
        const csvParser = new CSVParser();
        papers = csvParser.parseToPapers(content);
      }
    } else {
      return res.status(400).json({ message: '不支持的文件格式' });
    }

    papers = papers.filter(p => p.title && p.title.trim());

    if (papers.length === 0) {
      return res.status(400).json({ message: '未在文件中找到有效的论文数据' });
    }

    const papersWithUser = papers.map(paper => ({
      ...paper,
      uploadedBy: req.user._id,
      sourceFile: req.file.originalname
    }));

    let insertedCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (let i = 0; i < papersWithUser.length; i++) {
      try {
        const paper = papersWithUser[i];
        
        if (paper.doi) {
          const existing = await Paper.findOne({
            doi: paper.doi,
            uploadedBy: req.user._id
          });
          if (existing) {
            skippedCount++;
            continue;
          }
        }

        await Paper.create(paper);
        insertedCount++;
      } catch (err) {
        skippedCount++;
        errors.push({
          index: i,
          title: papersWithUser[i].title,
          error: err.message
        });
      }
    }

    res.json({
      success: true,
      message: `文件处理完成，成功导入 ${insertedCount} 篇论文，跳过 ${skippedCount} 篇`,
      data: {
        total: papers.length,
        inserted: insertedCount,
        skipped: skippedCount,
        errors: errors.slice(0, 10)
      }
    });
  } catch (error) {
    next(error);
  }
};

const getSampleData = async (req, res, next) => {
  try {
    const samplePapers = generateSamplePapers();
    
    res.json({
      success: true,
      data: {
        count: samplePapers.length,
        preview: samplePapers.slice(0, 5),
        description: '示例数据包含计算机科学领域的模拟论文数据，涵盖人工智能、机器学习、深度学习等研究方向'
      }
    });
  } catch (error) {
    next(error);
  }
};

const importSampleData = async (req, res, next) => {
  try {
    const samplePapers = generateSamplePapers();
    
    const papersWithUser = samplePapers.map(paper => ({
      ...paper,
      uploadedBy: req.user._id,
      sourceFile: 'sample-data'
    }));

    let insertedCount = 0;

    for (const paper of papersWithUser) {
      try {
        await Paper.create(paper);
        insertedCount++;
      } catch (err) {
        console.warn('跳过重复论文:', paper.title);
      }
    }

    res.json({
      success: true,
      message: `成功导入 ${insertedCount} 篇示例论文`,
      data: {
        inserted: insertedCount,
        total: samplePapers.length
      }
    });
  } catch (error) {
    next(error);
  }
};

function generateSamplePapers() {
  const authorsPool = [
    '张伟', '李娜', '王强', '刘洋', '陈明',
    '杨洋', '赵磊', '黄敏', '周杰', '吴秀',
    '郑浩', '孙丽', '马俊', '朱琳', '胡军',
    '林晓', '何勇', '高雪', '罗明', '谢芳'
  ];

  const journals = [
    'IEEE Transactions on Neural Networks and Learning Systems',
    'Nature Communications',
    'Science',
    'Journal of Machine Learning Research',
    'Pattern Recognition',
    'Neural Networks',
    'Information Sciences',
    'Knowledge-Based Systems',
    'Expert Systems with Applications',
    'IEEE Transactions on Cybernetics',
    '计算机学报',
    '软件学报',
    '自动化学报',
    '中国科学:信息科学',
    '人工智能学报'
  ];

  const keywordsPool = [
    '深度学习', '机器学习', '神经网络', '卷积神经网络',
    '循环神经网络', '注意力机制', 'Transformer', '强化学习',
    '迁移学习', '联邦学习', '自然语言处理', '计算机视觉',
    '图像识别', '目标检测', '语义分割', '知识图谱',
    '推荐系统', '数据挖掘', '聚类分析', '分类算法',
    '生成对抗网络', '自编码器', '降维', '特征选择',
    '贝叶斯网络', '支持向量机', '决策树', '随机森林',
    '梯度提升', '集成学习'
  ];

  const titles = [
    '基于深度卷积神经网络的图像分类方法研究',
    '多模态融合的自然语言理解模型',
    '面向大规模数据的联邦学习框架设计',
    '基于注意力机制的机器翻译方法',
    '知识图谱驱动的智能推荐系统',
    '强化学习在自动驾驶中的应用研究',
    '生成对抗网络在图像生成中的进展',
    '基于图神经网络的节点分类方法',
    '迁移学习在跨域图像识别中的应用',
    '面向小样本学习的元学习方法',
    '深度强化学习的优化策略研究',
    '基于Transformer的语音识别模型',
    '半监督学习的理论与方法',
    '聚类算法在文本挖掘中的应用',
    '深度学习在医学影像分析中的研究进展',
    '自然语言处理中的预训练模型综述',
    '基于神经网络的时间序列预测方法',
    '图卷积神经网络的理论与应用',
    '多标签分类的深度学习方法',
    '面向异常检测的自编码器模型',
    '机器学习在金融风控中的应用',
    '基于注意力的图像描述生成方法',
    '联邦学习中的隐私保护机制研究',
    '深度神经网络的可解释性方法',
    '知识图谱补全的表示学习方法',
    '强化学习在机器人控制中的应用',
    '生成模型在自然语言生成中的应用',
    '基于深度学习的目标检测算法综述',
    '图注意力网络的理论与实践',
    '迁移学习中的域适应方法研究'
  ];

  const papers = [];
  const baseYear = 2018;

  for (let i = 0; i < 50; i++) {
    const numAuthors = Math.floor(Math.random() * 4) + 2;
    const paperAuthors = [];
    const shuffledAuthors = [...authorsPool].sort(() => Math.random() - 0.5);
    
    for (let j = 0; j < numAuthors && j < shuffledAuthors.length; j++) {
      paperAuthors.push(shuffledAuthors[j]);
    }

    const numKeywords = Math.floor(Math.random() * 5) + 3;
    const paperKeywords = [];
    const shuffledKeywords = [...keywordsPool].sort(() => Math.random() - 0.5);
    
    for (let j = 0; j < numKeywords && j < shuffledKeywords.length; j++) {
      paperKeywords.push(shuffledKeywords[j]);
    }

    const year = baseYear + Math.floor(Math.random() * 7);
    const citations = Math.floor(Math.random() * 500 * (2024 - year + 1) / 7);

    papers.push({
      title: titles[i % titles.length] + (i >= titles.length ? ` (${Math.floor(i / titles.length) + 1})` : ''),
      authors: paperAuthors,
      journal: journals[Math.floor(Math.random() * journals.length)],
      year,
      volume: String(Math.floor(Math.random() * 30) + 20),
      issue: String(Math.floor(Math.random() * 12) + 1),
      pages: `${Math.floor(Math.random() * 1000) + 1}-${Math.floor(Math.random() * 1000) + 20}`,
      doi: `10.${1000 + Math.floor(Math.random() * 9000)}/example.${10000 + i}`,
      abstract: `本文研究了${paperKeywords.slice(0, 3).join('、')}等相关问题，提出了一种新的方法，在多个数据集上取得了优异的实验结果。`,
      keywords: paperKeywords,
      citations,
      source: 'api',
      tags: ['示例数据']
    });
  }

  return papers;
}

module.exports = {
  uploadPapers,
  getSampleData,
  importSampleData
};
