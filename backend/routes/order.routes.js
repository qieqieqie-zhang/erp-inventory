const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { uploadSingle } = require('../middleware/upload.middleware');

/**
 * @route GET /api/orders/detail/:id
 * @desc 获取订单详情（必须在 :dimension 路由之前，避免路径冲突）
 * @access Private
 */
router.get('/detail/:id', orderController.getDetail);

/**
 * @route GET /api/orders/dimensions
 * @desc 获取可用的时间维度列表
 * @access Private
 */
router.get('/dimensions', orderController.getDimensionList);

/**
 * @route POST /api/orders/:dimension/upload
 * @desc 上传订单文件（通过路径参数指定维度）
 * @access Private (管理员)
 */
router.post('/:dimension/upload', uploadSingle('file'), orderController.upload);

/**
 * @route GET /api/orders/:dimension/list
 * @desc 获取订单列表（通过路径参数指定维度）
 * @access Private
 */
router.get('/:dimension/list', orderController.getList);

/**
 * @route GET /api/orders/:dimension/summary
 * @desc 获取订单销量汇总（按SKU分组，通过路径参数指定维度）
 * @access Private
 */
router.get('/:dimension/summary', orderController.getSummary);

/**
 * @route GET /api/orders/:dimension/stats
 * @desc 获取订单统计信息（通过路径参数指定维度）
 * @access Private
 */
router.get('/:dimension/stats', orderController.getStats);

/**
 * @route GET /api/orders/:dimension/export
 * @desc 导出订单数据（通过路径参数指定维度和格式）
 * @access Private
 */
router.get('/:dimension/export', orderController.exportData);

module.exports = router;