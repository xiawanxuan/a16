const Paper = require('../models/Paper');
const BibTeXParser = require('../utils/bibtexParser');
const CSVParser = require('../utils/csvParser');
const RISParser = require('../utils/risParser');
const EndNoteParser = require('../utils/endnoteParser');
const NBibParser = require('../utils/nbibParser');

const SUPPORTED_FORMATS = [
  { ext: '.bib', name: 'BibTeX', parser: BibTeXParser, type: 'text' },
  { ext: '.bibtex', name: 'BibTeX', parser: BibTeXParser, type: 'text' },
  { ext: '.csv', name: 'CSV', parser: CSVParser, type: 'text' },
  { ext: '.ris', name: 'RIS', parser: RISParser, type: 'text' },
  { ext: '.enw', name: 'EndNote', parser: EndNoteParser, type: 'text' },
  { ext: '.nbib', name: 'NBib (PubMed)', parser: NBibParser, type: 'text' },
  { ext: '.txt', name: 'Text', parser: null, type: 'text' }
];

const BINARY_FORMATS = [
  { ext: '.caj', name: 'CAJ (中国知网)', note: 'CAJ 是知网专有格式，请从知网导出为 BibTeX/CSV/RIS 格式后再导入' },
  { ext: '.nh', name: 'NH (中国知网)', note: 'NH 是知网专有格式，请从知网导出为 BibTeX/CSV/RIS 格式后再导入' },
  { ext: '.pdf', name: 'PDF', note: 'PDF 文件需要先提取元数据，建议使用文献管理软件导出为 BibTeX/CSV/RIS 格式' }
];

const detectFormat = (fileName, content) => {
  const lowerName = fileName.toLowerCase();
  
  for (const format of SUPPORTED_FORMATS) {
    if (lowerName.endsWith(format.ext)) {
      return format;
    }
  }
  
  for (const format of BINARY_FORMATS) {
    if (lowerName.endsWith(format.ext)) {
      return { ...format, type: 'binary', parser: null };
    }
  }
  
  if (lowerName.endsWith('.txt')) {
    if (content.includes('@article') || content.includes('@book') || content.includes('@inproceedings')) {
      return { ...SUPPORTED_FORMATS.find(f => f.ext === '.bib'), ext: '.txt' };
    }
    if (content.match(/^TY\s*-\s*/m)) {
      return { ...SUPPORTED_FORMATS.find(f => f.ext === '.ris'), ext: '.txt' };
    }
    if (content.match(/^%A\s/) || content.match(/^%T\s/)) {
      return { ...SUPPORTED_FORMATS.find(f => f.ext === '.enw'), ext: '.txt' };
    }
    if (content.match(/^PMID\s*-/m) || content.match(/^TI\s{2}-/m)) {
      return { ...SUPPORTED_FORMATS.find(f => f.ext === '.nbib'), ext: '.txt' };
    }
    if (content.includes(',') && content.includes('\n')) {
      return { ...SUPPORTED_FORMATS.find(f => f.ext === '.csv'), ext: '.txt' };
    }
  }
  
  return null;
};

const uploadPapers = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请选择要上传的文件' });
    }

    const fileName = req.file.originalname;
    const lowerName = fileName.toLowerCase();
    
    const isBinary = ['.caj', '.nh', '.pdf'].some(ext => lowerName.endsWith(ext));
    
    if (isBinary) {
      const formatInfo = BINARY_FORMATS.find(f => lowerName.endsWith(f.ext));
      return res.status(400).json({
        message: `${formatInfo?.name || '该格式'}暂不支持直接导入`,
        detail: formatInfo?.note || '请转换为支持的文本格式后再导入',
        supportedFormats: SUPPORTED_FORMATS.map(f => f.name + f.ext)
      });
    }

    let content;
    try {
      content = req.file.buffer.toString('utf-8');
    } catch (e) {
      return res.status(400).json({ message: '文件编码不支持，请确保文件为文本格式' });
    }

    const format = detectFormat(fileName, content);
    
    if (!format || !format.parser) {
      return res.status(400).json({
        message: '不支持的文件格式',
        supportedFormats: SUPPORTED_FORMATS.map(f => f.name + f.ext),
        note: 'CAJ、NH、PDF 等二进制格式请先转换为文本格式'
      });
    }

    let papers = [];
    const ParserClass = format.parser;
    
    try {
      const parser = new ParserClass();
      papers = parser.parseToPapers(content);
    } catch (parseError) {
      return res.status(400).json({
        message: `解析${format.name}格式失败`,
        detail: parseError.message
      });
    }

    papers = papers.filter(p => p.title && p.title.trim());

    if (papers.length === 0) {
      return res.status(400).json({ message: '未在文件中找到有效的论文数据，请检查文件格式是否正确' });
    }

    const papersWithUser = papers.map(paper => ({
      ...paper,
      uploadedBy: req.user._id,
      sourceFile: fileName
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
        format: format.name,
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

  const affiliationsPool = [
    '清华大学', '北京大学', '浙江大学', '上海交通大学', '复旦大学',
    '中国科学技术大学', '南京大学', '华中科技大学', '武汉大学', '西安交通大学',
    '哈尔滨工业大学', '中山大学', '同济大学', '北京航空航天大学', '东南大学',
    '中国科学院自动化研究所', '中国科学院计算技术研究所', '中国科学院软件研究所'
  ];

  const fundingPool = [
    '国家自然科学基金', '国家重点研发计划', '国家社科基金', '科技部973计划',
    '教育部博士点基金', '教育部新世纪优秀人才支持计划', '中国博士后科学基金',
    '北京市自然科学基金', '上海市自然科学基金', '广东省自然科学基金',
    '国家高技术研究发展计划(863计划)', '国家科技支撑计划',
    '国家重大科学仪器设备开发专项', '国家国际科技合作专项'
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

    const numAffiliations = Math.floor(Math.random() * 3) + 1;
    const paperAffiliations = [];
    const shuffledAffs = [...affiliationsPool].sort(() => Math.random() - 0.5);
    
    for (let j = 0; j < numAffiliations && j < shuffledAffs.length; j++) {
      paperAffiliations.push(shuffledAffs[j]);
    }

    const numFunding = Math.floor(Math.random() * 3) + 1;
    const paperFunding = [];
    const shuffledFunding = [...fundingPool].sort(() => Math.random() - 0.5);
    
    for (let j = 0; j < numFunding && j < shuffledFunding.length; j++) {
      const num = Math.floor(Math.random() * 1000000) + 100000;
      paperFunding.push(`${shuffledFunding[j]} (No.${num})`);
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
      affiliations: paperAffiliations,
      funding: paperFunding,
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
