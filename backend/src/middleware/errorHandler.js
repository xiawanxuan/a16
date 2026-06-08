const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  
  let statusCode = err.statusCode || 500;
  let message = err.message || '服务器内部错误';
  let errors = err.errors || null;

  if (err.name === 'ValidationError') {
    statusCode = 400;
    errors = {};
    Object.keys(err.errors).forEach(key => {
      errors[key] = err.errors[key].message;
    });
    message = '数据验证失败';
  }

  if (err.name === 'CastError') {
    statusCode = 400;
    message = `无效的ID格式: ${err.value}`;
  }

  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyPattern)[0];
    message = `${field}已存在，请使用其他值`;
  }

  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = '无效的令牌';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = '令牌已过期';
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
