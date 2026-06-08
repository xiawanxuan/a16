const express = require('express');
const router = express.Router();
const { 
  getUsers, 
  getUser, 
  updateUser, 
  deleteUser,
  createUser,
  toggleUserStatus,
  getUserStats
} = require('../controllers/userController');
const { protect, requireRole } = require('../middleware/authMiddleware');

router.use(protect);
router.use(requireRole('admin'));

router.get('/', getUsers);
router.get('/stats', getUserStats);
router.get('/:id', getUser);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.patch('/:id/toggle-status', toggleUserStatus);

module.exports = router;
