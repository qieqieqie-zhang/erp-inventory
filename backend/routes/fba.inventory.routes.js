const express = require('express');
const router = express.Router();
const fbaInventoryController = require('../controllers/fba.inventory.controller');
const { uploadSingle } = require('../middleware/upload.middleware');
const { authenticateToken, authorizeRoles } = require('../middleware/auth.middleware');

/**
 * @route POST /api/fba/inventory/upload
 * @desc 上传FBA库存报告文件（全量覆盖）
 * @access Private (管理员)
 */
router.post('/upload', 
  authenticateToken,
  authorizeRoles(['admin']),
  uploadSingle('file'),
  fbaInventoryController.upload
);

/**
 * @route GET /api/fba/inventory/list
 * @desc 获取FBA库存列表（支持搜索、筛选、分页）
 * @access Private
 */
router.get('/list', 
  authenticateToken,
  fbaInventoryController.getList
);

/**
 * @route GET /api/fba/inventory/stats
 * @desc 获取FBA库存统计信息
 * @access Private
 */
router.get('/stats', 
  authenticateToken,
  fbaInventoryController.getStats
);

/**
 * @route GET /api/fba/inventory/alerts
 * @desc 获取库存预警列表（即将断货、零库存、积压库存）
 * @access Private
 */
router.get('/alerts', 
  authenticateToken,
  fbaInventoryController.getAlerts
);

/**
 * @route GET /api/fba/inventory/export
 * @desc 导出FBA库存数据（支持JSON/CSV格式）
 * @access Private
 */
router.get('/export', 
  authenticateToken,
  fbaInventoryController.exportData
);

/**
 * @route GET /api/fba/inventory/detail/:sku
 * @desc 按SKU获取FBA库存详情
 * @access Private
 */
router.get('/detail/:sku', 
  authenticateToken,
  fbaInventoryController.getDetail
);

module.exports = router;