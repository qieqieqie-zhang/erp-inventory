const express = require('express');
const router = express.Router();
const controller = require('../controllers/product.name.sku.mapping.controller');

/**
 * @route GET /api/product-name-sku-mapping/list
 * @desc 获取映射列表
 */
router.get('/list', controller.getList);

/**
 * @route POST /api/product-name-sku-mapping/upsert
 * @desc 创建或更新映射
 */
router.post('/upsert', controller.upsert);

/**
 * @route DELETE /api/product-name-sku-mapping/:id
 * @desc 删除映射
 */
router.delete('/:id', controller.delete);

/**
 * @route POST /api/product-name-sku-mapping/import-from-products
 * @desc 从商品资料导入映射
 */
router.post('/import-from-products', controller.importFromProducts);

module.exports = router;
