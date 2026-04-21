const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shop.controller');

/**
 * @route GET /api/shops
 * @desc 获取店铺列表（带分页和搜索）
 * @access Private
 */
router.get('/', shopController.getList);

/**
 * @route GET /api/shops/stats
 * @desc 获取店铺统计信息
 * @access Private
 */
router.get('/stats', shopController.getStats);

/**
 * @route GET /api/shops/all
 * @desc 获取所有店铺（下拉选择用）
 * @access Private
 */
router.get('/all', shopController.getAllShops);

/**
 * @route GET /api/shops/:id
 * @desc 获取店铺详情
 * @access Private
 */
router.get('/:id', shopController.getDetail);

/**
 * @route POST /api/shops
 * @desc 创建店铺
 * @access Private (管理员)
 */
router.post('/', shopController.create);

/**
 * @route PUT /api/shops/:id
 * @desc 更新店铺
 * @access Private (管理员)
 */
router.put('/:id', shopController.update);

/**
 * @route DELETE /api/shops/:id
 * @desc 删除店铺
 * @access Private (管理员)
 */
router.delete('/:id', shopController.delete);

module.exports = router;
