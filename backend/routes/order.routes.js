const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { uploadSingle } = require('../middleware/upload.middleware');

/**
 * 订单销量汇总 API
 *
 * 核心设计：
 * - 不再按 dimension 独立存储数据，所有订单原始数据存入 amazon_order_items 表
 * - 统计时根据 purchase_date 动态计算时间范围
 * - 支持自定义日期范围
 */

/**
 * @route POST /api/orders/upload
 * @desc 上传订单报告
 * @access Private (管理员)
 */
router.post('/upload', uploadSingle('file'), orderController.upload);

/**
 * @route GET /api/orders/summary
 * @desc 获取订单汇总统计（基于时间维度或自定义日期范围）
 * @access Private
 */
router.get('/summary', orderController.getSummary);

/**
 * @route GET /api/orders/sku-list
 * @desc 获取 SKU 销量汇总列表
 * @access Private
 */
router.get('/sku-list', orderController.getSkuList);

/**
 * @route GET /api/orders/sku/:sku/details
 * @desc 获取 SKU 的订单明细
 * @access Private
 */
router.get('/sku/:sku/details', orderController.getSkuDetails);

/**
 * @route GET /api/orders/charts
 * @desc 获取图表数据（趋势图、分布图、热门商品）
 * @access Private
 */
router.get('/charts', orderController.getChartsData);

/**
 * @route GET /api/orders/export
 * @desc 导出 SKU 汇总数据
 * @access Private
 */
router.get('/export', orderController.exportSkuSummary);

/**
 * @route GET /api/orders/replenishment
 * @desc 获取补货辅助数据
 * @access Private
 */
router.get('/replenishment', orderController.getReplenishment);

/**
 * @route DELETE /api/orders/all
 * @desc 清空所有订单数据
 * @access Private (管理员)
 */
router.delete('/all', orderController.deleteAll);

/**
 * @route DELETE /api/orders/sku/:sku
 * @desc 按SKU删除订单数据
 * @access Private (管理员)
 */
router.delete('/sku/:sku', orderController.deleteBySku);

module.exports = router;