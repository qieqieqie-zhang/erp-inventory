const express = require('express');
const router = express.Router();
const domesticInventoryController = require('../controllers/domestic.inventory.controller');

/**
 * @route GET /api/domestic-inventory/list
 * @desc 获取国内库存列表
 * @access Private
 */
router.get('/list', domesticInventoryController.getList);

/**
 * @route GET /api/domestic-inventory/stats
 * @desc 获取库存统计
 * @access Private
 */
router.get('/stats', domesticInventoryController.getStats);

/**
 * @route GET /api/domestic-inventory/logs
 * @desc 获取库存变动日志
 * @access Private
 */
router.get('/logs', domesticInventoryController.getLogs);

/**
 * @route GET /api/domestic-inventory/log-stats
 * @desc 获取日志统计
 * @access Private
 */
router.get('/log-stats', domesticInventoryController.getLogStats);

/**
 * @route GET /api/domestic-inventory/biz-types
 * @desc 获取业务类型列表
 * @access Private
 */
router.get('/biz-types', domesticInventoryController.getBizTypes);

/**
 * @route GET /api/domestic-inventory/change-types
 * @desc 获取变动类型列表
 * @access Private
 */
router.get('/change-types', domesticInventoryController.getChangeTypes);

/**
 * @route GET /api/domestic-inventory/:productNameCn
 * @desc 获取单个商品库存详情
 * @access Private
 */
router.get('/:productNameCn', domesticInventoryController.getDetail);

/**
 * @route POST /api/domestic-inventory
 * @desc 创建库存记录
 * @access Private
 */
router.post('/', domesticInventoryController.create);

/**
 * @route POST /api/domestic-inventory/change
 * @desc 库存变动（入库/出库/调整）
 * @access Private
 */
router.post('/change', domesticInventoryController.changeStock);

/**
 * @route PUT /api/domestic-inventory/:productNameCn
 * @desc 更新库存
 * @access Private
 */
router.put('/:productNameCn', domesticInventoryController.update);

/**
 * @route DELETE /api/domestic-inventory/:productNameCn
 * @desc 删除库存记录
 * @access Private
 */
router.delete('/:productNameCn', domesticInventoryController.delete);

module.exports = router;
