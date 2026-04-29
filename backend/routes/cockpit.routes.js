const express = require('express');
const router = express.Router();
const cockpitController = require('../controllers/cockpit.controller');

/**
 * 经营驾驶舱路由
 * 聚合多个模块数据，为领导提供经营总览
 */

/**
 * @route GET /api/cockpit/overview
 * @desc 获取经营驾驶舱总览数据
 * @access Private
 */
router.get('/overview', cockpitController.getOverview);

/**
 * @route GET /api/cockpit/core-table
 * @desc 获取经营核心总表
 * @access Private
 */
router.get('/core-table', cockpitController.getCoreTable);

/**
 * @route GET /api/cockpit/alerts
 * @desc 获取重点预警榜单
 * @access Private
 */
router.get('/alerts', cockpitController.getAlerts);

/**
 * @route GET /api/cockpit/trends
 * @desc 获取趋势数据
 * @access Private
 */
router.get('/trends', cockpitController.getTrends);

module.exports = router;