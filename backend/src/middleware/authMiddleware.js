const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: '未授权访问，请先登录' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user || !user.isActive) {
      return res.status(401).json({ message: '用户不存在或已被禁用' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: '无效的令牌，请重新登录' });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: '未授权访问' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: '权限不足，无法执行此操作' });
    }
    
    next();
  };
};

module.exports = { protect, requireRole };
