const express = require('express');
const router = express.Router();
const skuInventoryLogController = require('../controllers/skuInventoryLog.controller');

/**
 * @route GET /api/sku-logs
 * @desc 获取所有库存变动日志（分页）
 * @access Private
 */
router.get('/', skuInventoryLogController.getAllLogs);

/**
 * @route GET /api/sku-logs/:sku
 * @desc 获取单个SKU的库存变动日志
 * @access Private
 */
router.get('/:sku', skuInventoryLogController.getLogsBySku);

module.exports = router;
