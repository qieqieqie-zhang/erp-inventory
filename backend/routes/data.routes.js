const express = require('express');
const router = express.Router();

// TODO: 实现全局数据合并路由
router.get('/combine', (req, res) => {
  res.json({
    code: 501,
    message: '功能待实现',
    data: null
  });
});

module.exports = router;