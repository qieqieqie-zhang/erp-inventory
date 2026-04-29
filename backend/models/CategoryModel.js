const BaseModel = require('./BaseModel');

class CategoryModel extends BaseModel {
  constructor() {
    super('product_categories');
  }

  /**
   * 获取所有启用的分类（下拉用）
   * @returns {Promise<Array>}
   */
  async getAllEnabled() {
    return this.query(
      'SELECT id, category_name, sort_order FROM product_categories WHERE is_enabled = 1 ORDER BY sort_order ASC, id ASC'
    );
  }

  /**
   * 获取分类列表（分页）
   * @param {Object} options
   * @returns {Promise<Array>}
   */
  async getList(options = {}) {
    const { page = 1, pageSize = 20, search = '', includeDisabled = false } = options;

    let sql = `
      SELECT pc.*,
             (SELECT COUNT(*) FROM product_master WHERE category_id = pc.id) as product_count
      FROM product_categories pc
      WHERE 1=1
    `;
    const params = [];

    if (!includeDisabled) {
      sql += ' AND pc.is_enabled = 1';
    }

    if (search) {
      sql += ' AND pc.category_name LIKE ?';
      params.push(`%${search}%`);
    }

    sql += ' ORDER BY pc.sort_order ASC, pc.id ASC';

    const offset = (page - 1) * pageSize;
    sql += ` LIMIT ${pageSize} OFFSET ${offset}`;

    return this.query(sql, params);
  }

  /**
   * 统计分类数量
   * @param {Object} options
   * @returns {Promise<number>}
   */
  async count(options = {}) {
    const { search = '', includeDisabled = false } = options;

    let sql = 'SELECT COUNT(*) as count FROM product_categories WHERE 1=1';
    const params = [];

    if (!includeDisabled) {
      sql += ' AND is_enabled = 1';
    }

    if (search) {
      sql += ' AND category_name LIKE ?';
      params.push(`%${search}%`);
    }

    const rows = await this.query(sql, params);
    return parseInt(rows[0].count);
  }

  /**
   * 根据名称查找分类
   * @param {string} name
   * @returns {Promise<Object|null>}
   */
  async findByName(name) {
    const rows = await this.query(
      'SELECT * FROM product_categories WHERE category_name = ?',
      [name]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * 创建分类
   * @param {Object} data
   * @returns {Promise<number>} 新分类ID
   */
  async create(data) {
    const { category_name, sort_order = 0, is_enabled = 1, remark = '' } = data;

    const sql = `
      INSERT INTO product_categories (category_name, sort_order, is_enabled, remark)
      VALUES (?, ?, ?, ?)
    `;

    const result = await this.query(sql, [category_name, sort_order, is_enabled, remark]);
    return result.insertId;
  }

  /**
   * 更新分类
   * @param {number} id
   * @param {Object} data
   * @returns {Promise<boolean>}
   */
  async update(id, data) {
    const fields = [];
    const values = [];

    if (data.category_name !== undefined) {
      fields.push('category_name = ?');
      values.push(data.category_name);
    }
    if (data.sort_order !== undefined) {
      fields.push('sort_order = ?');
      values.push(data.sort_order);
    }
    if (data.is_enabled !== undefined) {
      fields.push('is_enabled = ?');
      values.push(data.is_enabled);
    }
    if (data.remark !== undefined) {
      fields.push('remark = ?');
      values.push(data.remark);
    }

    if (fields.length === 0) {
      return false;
    }

    values.push(id);
    const sql = `UPDATE product_categories SET ${fields.join(', ')} WHERE id = ?`;
    const result = await this.query(sql, values);
    return result.affectedRows > 0;
  }

  /**
   * 删除分类
   * @param {number} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    // 先检查是否有商品关联到此分类
    const productCheck = await this.query(
      'SELECT COUNT(*) as count FROM product_master WHERE category_id = ?',
      [id]
    );

    if (productCheck[0].count > 0) {
      throw new Error(`该分类下有 ${productCheck[0].count} 个商品，无法删除`);
    }

    const result = await this.query(
      'DELETE FROM product_categories WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }
}

module.exports = new CategoryModel();
