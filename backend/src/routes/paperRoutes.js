const express = require('express');
const router = express.Router();
const { 
  getPapers, 
  getPaper, 
  createPaper, 
  updatePaper, 
  deletePaper,
  getPaperStats,
  batchDelete
} = require('../controllers/paperController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getPapers);
router.get('/stats', getPaperStats);
router.get('/:id', getPaper);
router.post('/', createPaper);
router.put('/:id', updatePaper);
router.delete('/:id', deletePaper);
router.post('/batch-delete', batchDelete);

module.exports = router;
