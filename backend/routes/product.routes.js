const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { uploadSingle } = require('../middleware/upload.middleware');

/**
 * @route POST /api/product/upload
 * @desc 上传商品库存文件
 * @access Private (管理员)
 */
router.post('/upload', uploadSingle('file'), productController.upload);

/**
 * @route GET /api/product/list
 * @desc 获取商品列表
 * @access Private
 */
router.get('/list', productController.getList);

/**
 * @route GET /api/product/detail/:sku
 * @desc 获取商品详情
 * @access Private
 */
router.get('/detail/:sku', productController.getDetail);

/**
 * @route GET /api/product/stats
 * @desc 获取商品统计信息
 * @access Private
 */
router.get('/stats', productController.getStats);

/**
 * @route GET /api/product/sku-list
 * @desc 获取SKU列表（用于下拉选择）
 * @access Private
 */
router.get('/sku-list', productController.getSkuList);

/**
 * @route GET /api/product/export
 * @desc 导出商品数据
 * @access Private
 */
router.get('/export', productController.exportData);

/**
 * @route PUT /api/product/:sku
 * @desc 更新商品信息
 * @access Private (管理员)
 */
router.put('/:sku', productController.update);

/**
 * @route DELETE /api/product/:sku
 * @desc 删除商品
 * @access Private (管理员)
 */
router.delete('/:sku', productController.delete);

module.exports = router;