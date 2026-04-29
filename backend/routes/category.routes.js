const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const categoryController = require('../controllers/category.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// 所有分类路由都需要登录
router.use(authenticateToken);

/**
 * GET /api/category/list
 * 获取分类列表（分页）
 */
router.get('/list', categoryController.getList);

/**
 * GET /api/category/all
 * 获取所有启用的分类（下拉用）
 */
router.get('/all', categoryController.getAllEnabled);

/**
 * GET /api/category/:id
 * 获取单个分类
 */
router.get('/:id', categoryController.getById);

/**
 * POST /api/category
 * 创建分类
 */
router.post('/',
  [
    body('category_name').notEmpty().withMessage('分类名称不能为空').trim(),
    body('sort_order').optional().isInt().withMessage('排序必须为整数'),
    body('is_enabled').optional().isBoolean().withMessage('is_enabled必须为布尔值')
  ],
  categoryController.create
);

/**
 * PUT /api/category/:id
 * 更新分类
 */
router.put('/:id',
  [
    body('category_name').optional().notEmpty().withMessage('分类名称不能为空').trim(),
    body('sort_order').optional().isInt().withMessage('排序必须为整数'),
    body('is_enabled').optional().isBoolean().withMessage('is_enabled必须为布尔值')
  ],
  categoryController.update
);

/**
 * DELETE /api/category/:id
 * 删除分类
 */
router.delete('/:id', categoryController.remove);

module.exports = router;
