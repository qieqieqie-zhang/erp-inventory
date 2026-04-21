const express = require('express');
const router = express.Router();
const logisticsController = require('../controllers/logistics.controller');
const { uploadSingle } = require('../middleware/upload.middleware');

/**
 * @route GET /api/logistics/status-list
 * @desc 获取物流状态列表
 * @access Private
 */
router.get('/status-list', logisticsController.getStatusList);

/**
 * @route GET /api/logistics/stats
 * @desc 获取物流统计
 * @access Private
 */
router.get('/stats', logisticsController.getStats);

/**
 * @route GET /api/logistics/companies
 * @desc 获取物流公司列表
 * @access Private
 */
router.get('/companies', logisticsController.getCompanies);

/**
 * @route POST /api/logistics/upload
 * @desc 上传物流跟踪文件
 * @access Private
 */
router.post('/upload', uploadSingle('file'), logisticsController.upload);

/**
 * @route POST /api/logistics/preview
 * @desc 预览上传文件内容
 * @access Private
 */
router.post('/preview', uploadSingle('file'), logisticsController.preview);

/**
 * @route GET /api/logistics/export
 * @desc 导出物流跟踪数据
 * @access Private
 */
router.get('/export', logisticsController.exportData);

/**
 * @route GET /api/logistics/list
 * @desc 获取物流跟踪列表
 * @access Private
 */
router.get('/list', logisticsController.getList);

/**
 * @route GET /api/logistics/detail/:id
 * @desc 获取物流详情
 * @access Private
 */
router.get('/detail/:id', logisticsController.getDetail);

/**
 * @route POST /api/logistics
 * @desc 创建物流跟踪记录
 * @access Private
 */
router.post('/', logisticsController.create);

/**
 * @route POST /api/logistics/update-sku-list
 * @desc 更新物流记录的SKU列表
 * @access Private
 */
router.post('/update-sku-list', uploadSingle('file'), logisticsController.updateSkuList);

/**
 * @route POST /api/logistics/preview-sku
 * @desc 预览SKU文件内容（不保存）
 * @access Private
 */
router.post('/preview-sku', uploadSingle('file'), logisticsController.previewSkuList);

/**
 * @route POST /api/logistics/sync-products/:id
 * @desc 将物流SKU列表同步到商品主表（覆盖更新）
 * @access Private
 */
router.post('/sync-products/:id', logisticsController.syncProducts);

/**
 * @route PUT /api/logistics/:id
 * @desc 更新物流跟踪记录
 * @access Private
 */
router.put('/:id', logisticsController.update);

/**
 * @route PATCH /api/logistics/:id/status
 * @desc 更新物流状态
 * @access Private
 */
router.patch('/:id/status', logisticsController.updateStatus);

/**
 * @route DELETE /api/logistics/:id
 * @desc 删除物流跟踪记录
 * @access Private
 */
router.delete('/:id', logisticsController.delete);

module.exports = router;