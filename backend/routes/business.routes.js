const express = require('express');
const router = express.Router();
const businessController = require('../controllers/business.controller');
const { uploadSingle } = require('../middleware/upload.middleware');

/**
 * @route GET /api/business/reports
 * @desc 获取业务报告列表
 * @access Private
 */
router.get('/reports', businessController.getReports);

/**
 * @route GET /api/business/summary
 * @desc 获取业务报告摘要
 * @access Private
 */
router.get('/summary', businessController.getSummary);

/**
 * @route POST /api/business/upload
 * @desc 上传业务报告数据
 * @access Private
 */
router.post('/upload', uploadSingle('file'), businessController.uploadReports);

/**
 * @route DELETE /api/business/reports/:id
 * @desc 删除业务报告
 * @access Private
 */
router.delete('/reports/:id', businessController.deleteReport);

/**
 * @route GET /api/business/export
 * @desc 导出业务报告数据
 * @access Private
 */
router.get('/export', businessController.exportReports);

module.exports = router;