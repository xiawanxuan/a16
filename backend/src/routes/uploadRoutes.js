const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadPapers, getSampleData, importSampleData } = require('../controllers/uploadController');
const { protect } = require('../middleware/authMiddleware');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'text/plain',
    'text/csv',
    'application/csv',
    'application/x-bibtex',
    'application/x-biblatex',
    'text/x-bibtex'
  ];
  
  const allowedExtensions = ['.bib', '.bibtex', '.csv', '.txt'];
  const originalName = file.originalname.toLowerCase();
  
  const extAllowed = allowedExtensions.some(ext => originalName.endsWith(ext));
  const typeAllowed = allowedTypes.includes(file.mimetype);
  
  if (extAllowed || typeAllowed) {
    cb(null, true);
  } else {
    cb(new Error('不支持的文件格式，仅支持 .bib, .bibtex, .csv, .txt 文件'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024
  }
});

router.use(protect);

router.post('/papers', upload.single('file'), uploadPapers);
router.get('/sample', getSampleData);
router.post('/import-sample', importSampleData);

module.exports = router;
