// 错误处理中间件
const errorHandler = (err, req, res, next) => {
  console.error('错误详情:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // 默认错误响应
  const statusCode = err.statusCode || 500;
  const message = err.message || '服务器内部错误';
  
  // 生产环境下隐藏详细错误信息
  const errorResponse = {
    code: statusCode,
    message: process.env.NODE_ENV === 'production' && statusCode === 500 
      ? '服务器内部错误' 
      : message,
    data: null
  };

  // 如果是开发环境，添加堆栈信息
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;