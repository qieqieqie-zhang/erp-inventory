const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');

// 获取看板统计数据
router.get('/stats', dashboardController.getStats);

// 获取销量TOP10商品
router.get('/top-products', dashboardController.getTopProducts);

// 获取库存预警
router.get('/alerts', dashboardController.getAlerts);

// 获取最近上传记录
router.get('/recent-uploads', dashboardController.getRecentUploads);

module.exports = router;
