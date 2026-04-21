const express = require('express');
const router = express.Router();
const fbaReservedController = require('../controllers/fba.reserved.controller');
const { uploadSingle } = require('../middleware/upload.middleware');
const { authenticateToken, authorizeRoles } = require('../middleware/auth.middleware');

/**
 * @route POST /api/fba/reserved/upload
 * @desc 上传FBA预留库存报告文件（全量覆盖）
 * @access Private (管理员)
 */
router.post('/upload', 
  authenticateToken,
  authorizeRoles(['admin']),
  uploadSingle('file'),
  fbaReservedController.upload
);

/**
 * @route GET /api/fba/reserved/list
 * @desc 获取FBA预留库存列表（支持搜索、筛选、分页）
 * @access Private
 */
router.get('/list', 
  authenticateToken,
  fbaReservedController.getList
);

/**
 * @route GET /api/fba/reserved/stats
 * @desc 获取FBA预留库存统计信息
 * @access Private
 */
router.get('/stats', 
  authenticateToken,
  fbaReservedController.getStats
);

/**
 * @route GET /api/fba/reserved/export
 * @desc 导出FBA预留库存数据（支持JSON/CSV格式）
 * @access Private
 */
router.get('/export', 
  authenticateToken,
  fbaReservedController.exportData
);

/**
 * @route GET /api/fba/reserved/detail/:sku
 * @desc 按SKU获取FBA预留库存详情
 * @access Private
 */
router.get('/detail/:sku', 
  authenticateToken,
  fbaReservedController.getDetail
);

/**
 * @route GET /api/fba/reserved/distribution
 * @desc 获取预留类型分布统计
 * @access Private
 */
router.get('/distribution', 
  authenticateToken,
  fbaReservedController.getReservationTypeDistribution
);

module.exports = router;