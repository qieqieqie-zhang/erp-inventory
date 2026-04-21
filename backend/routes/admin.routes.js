const express = require('express');
const router = express.Router();

// TODO: 实现系统管理路由
router.get('/user/list', (req, res) => {
  res.json({
    code: 501,
    message: '功能待实现',
    data: null
  });
});

router.get('/upload/logs', (req, res) => {
  res.json({
    code: 501,
    message: '功能待实现',
    data: null
  });
});

module.exports = router;