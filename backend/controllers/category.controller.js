const CategoryModel = require('../models/CategoryModel');
const { validationResult } = require('express-validator');

/**
 * 获取分类列表（分页）
 */
const getList = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, search = '', include_disabled = false } = req.query;

    const [list, total] = await Promise.all([
      CategoryModel.getList({
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        search,
        includeDisabled: include_disabled === 'true'
      }),
      CategoryModel.count({ search, includeDisabled: include_disabled === 'true' })
    ]);

    res.json({
      code: 200,
      message: 'success',
      data: {
        list,
        pagination: {
          total,
          page: parseInt(page),
          pageSize: parseInt(pageSize)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取所有启用的分类（下拉用）
 */
const getAllEnabled = async (req, res, next) => {
  try {
    const list = await CategoryModel.getAllEnabled();
    res.json({
      code: 200,
      message: 'success',
      data: list
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取单个分类
 */
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sql = `
      SELECT pc.*,
             (SELECT COUNT(*) FROM product_master WHERE category_id = pc.id) as product_count
      FROM product_categories pc
      WHERE pc.id = ?
    `;
    const rows = await CategoryModel.query(sql, [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '分类不存在',
        data: null
      });
    }

    res.json({
      code: 200,
      message: 'success',
      data: rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 创建分类
 */
const create = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        code: 400,
        message: '参数错误',
        data: errors.array()
      });
    }

    const { category_name, sort_order, is_enabled, remark } = req.body;

    // 检查名称是否已存在
    const existing = await CategoryModel.findByName(category_name);
    if (existing) {
      return res.status(400).json({
        code: 400,
        message: '分类名称已存在',
        data: null
      });
    }

    const id = await CategoryModel.create({
      category_name,
      sort_order: parseInt(sort_order) || 0,
      is_enabled: is_enabled !== undefined ? (is_enabled ? 1 : 0) : 1,
      remark: remark || ''
    });

    res.json({
      code: 200,
      message: '创建成功',
      data: { id }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 更新分类
 */
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { category_name, sort_order, is_enabled, remark } = req.body;

    // 检查分类是否存在
    const existing = await CategoryModel.query(
      'SELECT * FROM product_categories WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '分类不存在',
        data: null
      });
    }

    // 如果修改了名称，检查是否与已有分类重名
    if (category_name && category_name !== existing[0].category_name) {
      const duplicate = await CategoryModel.findByName(category_name);
      if (duplicate) {
        return res.status(400).json({
          code: 400,
          message: '分类名称已存在',
          data: null
        });
      }
    }

    await CategoryModel.update(id, {
      category_name,
      sort_order: sort_order !== undefined ? parseInt(sort_order) : undefined,
      is_enabled: is_enabled !== undefined ? (is_enabled ? 1 : 0) : undefined,
      remark
    });

    res.json({
      code: 200,
      message: '更新成功',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 删除分类
 */
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    await CategoryModel.delete(parseInt(id));

    res.json({
      code: 200,
      message: '删除成功',
      data: null
    });
  } catch (error) {
    if (error.message && error.message.includes('该分类下有')) {
      return res.status(400).json({
        code: 400,
        message: error.message,
        data: null
      });
    }
    next(error);
  }
};

module.exports = {
  getList,
  getAllEnabled,
  getById,
  create,
  update,
  remove
};
