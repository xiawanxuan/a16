const express = require('express');
const router = express.Router();
const { 
  getCooperationNetwork,
  getCitationAnalysis,
  getKeywordTrends,
  getAuthorProductivity,
  getJournalAnalysis,
  getOverviewStats
} = require('../controllers/analysisController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/overview', getOverviewStats);
router.get('/cooperation-network', getCooperationNetwork);
router.get('/citation-analysis', getCitationAnalysis);
router.get('/keyword-trends', getKeywordTrends);
router.get('/author-productivity', getAuthorProductivity);
router.get('/journal-analysis', getJournalAnalysis);

module.exports = router;
