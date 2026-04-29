const BaseModel = require('./BaseModel');

class DomesticInventoryModel extends BaseModel {
  constructor() {
    super('domestic_inventory_stock');
  }

  /**
   * 获取库存列表（支持分页、搜索）
   * @param {Object} options
   * @returns {Promise<Array>}
   */
  async getList(options = {}) {
    const {
      page = 1,
      pageSize = 20,
      search = ''
    } = options;

    let sql = `
      SELECT s.*
      FROM domestic_inventory_stock s
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      sql += ' AND s.product_name_cn LIKE ?';
      params.push(`%${search}%`);
    }

    sql += ' ORDER BY s.updated_at DESC';

    const offset = (page - 1) * pageSize;
    sql += ` LIMIT ${pageSize} OFFSET ${offset}`;

    return this.query(sql, params);
  }

  /**
   * 统计库存记录数量
   * @param {Object} filters
   * @returns {Promise<number>}
   */
  async count(filters = {}) {
    const { search = '' } = filters;

    let sql = 'SELECT COUNT(*) as count FROM domestic_inventory_stock s WHERE 1=1';
    const params = [];

    if (search) {
      sql += ' AND s.product_name_cn LIKE ?';
      params.push(`%${search}%`);
    }

    const rows = await this.query(sql, params);
    return parseInt(rows[0].count);
  }

  /**
   * 根据中文名称查找库存
   * @param {string} productNameCn
   * @returns {Promise<Object|null>}
   */
  async findByProductNameCn(productNameCn) {
    const rows = await this.query(
      'SELECT * FROM domestic_inventory_stock WHERE product_name_cn = ?',
      [productNameCn]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * 创建库存记录
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async create(data) {
    const keys = Object.keys(data);
    const values = Object.values(data);

    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO domestic_inventory_stock (${keys.join(', ')}) VALUES (${placeholders})`;

    const [result] = await this.pool.execute(sql, values);
    return { id: result.insertId, ...data };
  }

  /**
   * 更新库存（按中文名称）
   * @param {string} productNameCn
   * @param {Object} data
   * @returns {Promise<boolean>}
   */
  async update(productNameCn, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);

    const setClause = keys.map(key => `${key} = ?`).join(', ');
    const sql = `UPDATE domestic_inventory_stock SET ${setClause} WHERE product_name_cn = ?`;

    const [result] = await this.pool.execute(sql, [...values, productNameCn]);
    return result.affectedRows > 0;
  }

  /**
   * 删除库存记录（按中文名称）
   * @param {string} productNameCn
   * @returns {Promise<boolean>}
   */
  async delete(productNameCn) {
    const [result] = await this.pool.execute(
      'DELETE FROM domestic_inventory_stock WHERE product_name_cn = ?',
      [productNameCn]
    );
    return result.affectedRows > 0;
  }

  /**
   * 获取库存统计
   * @returns {Promise<Object>}
   */
  async getStats() {
    const sql = `
      SELECT
        COUNT(*) as total_skus,
        COALESCE(SUM(on_hand_qty), 0) as total_on_hand,
        COALESCE(SUM(available_qty), 0) as total_available,
        COALESCE(SUM(CASE WHEN available_qty < 10 THEN 1 ELSE 0 END), 0) as low_stock_count,
        COALESCE(SUM(CASE WHEN available_qty = 0 THEN 1 ELSE 0 END), 0) as out_of_stock_count
      FROM domestic_inventory_stock
    `;
    const rows = await this.query(sql);
    return rows[0];
  }

  // ==================== 日志操作 ====================

  /**
   * 获取库存变动日志列表
   * @param {Object} options
   * @returns {Promise<Array>}
   */
  async getLogList(options = {}) {
    const {
      page = 1,
      pageSize = 20,
      search = '',
      productNameCn = '',
      changeType = '',
      bizType = '',
      startDate = null,
      endDate = null
    } = options;

    let sql = `
      SELECT l.*
      FROM domestic_inventory_log l
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      sql += ' AND l.product_name_cn LIKE ?';
      params.push(`%${search}%`);
    }

    if (productNameCn) {
      sql += ' AND l.product_name_cn = ?';
      params.push(productNameCn);
    }

    if (changeType) {
      sql += ' AND l.change_type = ?';
      params.push(changeType);
    }

    if (bizType) {
      sql += ' AND l.biz_type = ?';
      params.push(bizType);
    }

    if (startDate) {
      sql += ' AND l.created_at >= ?';
      params.push(new Date(startDate));
    }

    if (endDate) {
      sql += ' AND l.created_at <= ?';
      params.push(new Date(endDate));
    }

    sql += ' ORDER BY l.created_at DESC';

    const offset = (page - 1) * pageSize;
    sql += ` LIMIT ${pageSize} OFFSET ${offset}`;

    return this.query(sql, params);
  }

  /**
   * 统计日志数量
   * @param {Object} filters
   * @returns {Promise<number>}
   */
  async countLogs(filters = {}) {
    const { search = '', productNameCn = '', changeType = '', bizType = '', startDate = null, endDate = null } = filters;

    let sql = 'SELECT COUNT(*) as count FROM domestic_inventory_log l WHERE 1=1';
    const params = [];

    if (search) {
      sql += ' AND l.product_name_cn LIKE ?';
      params.push(`%${search}%`);
    }

    if (productNameCn) {
      sql += ' AND l.product_name_cn = ?';
      params.push(productNameCn);
    }

    if (changeType) {
      sql += ' AND l.change_type = ?';
      params.push(changeType);
    }

    if (bizType) {
      sql += ' AND l.biz_type = ?';
      params.push(bizType);
    }

    if (startDate) {
      sql += ' AND l.created_at >= ?';
      params.push(new Date(startDate));
    }

    if (endDate) {
      sql += ' AND l.created_at <= ?';
      params.push(new Date(endDate));
    }

    const rows = await this.query(sql, params);
    return parseInt(rows[0].count);
  }

  /**
   * 创建库存变动日志
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async createLog(data) {
    const keys = Object.keys(data);
    const values = Object.values(data);

    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO domestic_inventory_log (${keys.join(', ')}) VALUES (${placeholders})`;

    const [result] = await this.pool.execute(sql, values);
    return { id: result.insertId, ...data };
  }

  /**
   * 执行库存变动（原子操作：更新库存 + 记录日志）
   * @param {string} productNameCn - 中文名称
   * @param {string} changeType - 'in' | 'out' | 'adjust'
   * @param {string} bizType
   * @param {number} quantity - 变动数量（正数）
   * @param {Object} extra - 额外字段（remark, related_doc_type, related_doc_id, operator）
   * @returns {Promise<Object>}
   */
  async changeStock(productNameCn, changeType, bizType, quantity, extra = {}) {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. 获取当前库存
      const [stockRows] = await connection.execute(
        'SELECT * FROM domestic_inventory_stock WHERE product_name_cn = ? FOR UPDATE',
        [productNameCn]
      );

      let beforeQty = 0;
      let afterQty = 0;
      let onHandQty = 0;
      let availableQty = 0;

      if (stockRows.length === 0) {
        // 如果库存记录不存在，创建新记录
        if (changeType === 'out') {
          throw new Error('库存记录不存在，无法出库');
        }
        onHandQty = quantity;
        availableQty = quantity;

        await connection.execute(
          'INSERT INTO domestic_inventory_stock (product_name_cn, on_hand_qty, available_qty) VALUES (?, ?, ?)',
          [productNameCn, onHandQty, availableQty]
        );
        beforeQty = 0;
        afterQty = quantity;
      } else {
        const stock = stockRows[0];
        beforeQty = stock.available_qty;
        onHandQty = stock.on_hand_qty;
        availableQty = stock.available_qty;

        if (changeType === 'in') {
          onHandQty += quantity;
          availableQty += quantity;
          afterQty = availableQty;
        } else if (changeType === 'out') {
          if (availableQty < quantity) {
            throw new Error(`可用库存不足：当前 ${availableQty}，需要 ${quantity}`);
          }
          onHandQty -= quantity;
          availableQty -= quantity;
          afterQty = availableQty;
        } else if (changeType === 'adjust') {
          onHandQty += quantity;
          availableQty += quantity;
          afterQty = availableQty;
        }

        await connection.execute(
          'UPDATE domestic_inventory_stock SET on_hand_qty = ?, available_qty = ? WHERE product_name_cn = ?',
          [onHandQty, availableQty, productNameCn]
        );
      }

      // 2. 记录日志
      await connection.execute(
        `INSERT INTO domestic_inventory_log
         (product_name_cn, change_type, biz_type, quantity, before_qty, after_qty, related_doc_type, related_doc_id, remark, operator)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          productNameCn,
          changeType,
          bizType,
          quantity,
          beforeQty,
          afterQty,
          extra.related_doc_type || null,
          extra.related_doc_id || null,
          extra.remark || null,
          extra.operator || null
        ]
      );

      await connection.commit();

      return {
        success: true,
        beforeQty,
        afterQty,
        changeQty: quantity
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 从商品上传同步库存（商品上传时自动调用）
   * 为每个有中文名称的商品创建/更新国内库存记录，并记录入库日志
   * @param {Array} products - 商品列表，每个元素包含 product_name_cn 和 quantity
   * @param {string} uploadBatch - 上传批次号
   * @param {string} operator - 操作人
   * @returns {Promise<Object>} { created, updated }
   */
  async syncFromProductUpload(products, uploadBatch, operator = 'system') {
    const connection = await this.pool.getConnection();
    let created = 0;
    let updated = 0;

    try {
      await connection.beginTransaction();

      for (const product of products) {
        const productNameCn = product.product_name_cn;
        const quantity = parseInt(product.quantity || 0);

        if (!productNameCn) continue;

        // 检查是否已存在库存记录
        const [stockRows] = await connection.execute(
          'SELECT * FROM domestic_inventory_stock WHERE product_name_cn = ? FOR UPDATE',
          [productNameCn]
        );

        let beforeQty = 0;
        let afterQty = quantity;

        if (stockRows.length === 0) {
          // 不存在，创建新记录
          await connection.execute(
            'INSERT INTO domestic_inventory_stock (product_name_cn, on_hand_qty, available_qty) VALUES (?, ?, ?)',
            [productNameCn, quantity, quantity]
          );
          beforeQty = 0;
          afterQty = quantity;
          created++;
        } else {
          // 已存在，更新库存
          const stock = stockRows[0];
          beforeQty = stock.available_qty;
          const newAvailable = quantity;
          afterQty = newAvailable;

          await connection.execute(
            'UPDATE domestic_inventory_stock SET on_hand_qty = ?, available_qty = ? WHERE product_name_cn = ?',
            [newAvailable, newAvailable, productNameCn]
          );
          updated++;
        }

        // 记录入库日志（biz_type = 'purchase' 表示采购入库）
        await connection.execute(
          `INSERT INTO domestic_inventory_log
           (product_name_cn, change_type, biz_type, quantity, before_qty, after_qty, related_doc_type, related_doc_id, remark, operator)
           VALUES (?, 'in', 'purchase', ?, ?, ?, 'product_upload', ?, ?, ?)`,
          [
            productNameCn,
            quantity,
            beforeQty,
            afterQty,
            uploadBatch,
            `商品上传自动沉淀`,
            operator
          ]
        );
      }

      await connection.commit();
      return { created, updated };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 获取日志统计（按类型汇总）
   * @param {Object} filters
   * @returns {Promise<Object>}
   */
  async getLogStats(filters = {}) {
    const { startDate = null, endDate = null, productNameCn = '' } = filters;

    let sql = `
      SELECT
        change_type,
        biz_type,
        COUNT(*) as count,
        SUM(quantity) as total_quantity
      FROM domestic_inventory_log
      WHERE 1=1
    `;
    const params = [];

    if (productNameCn) {
      sql += ' AND product_name_cn = ?';
      params.push(productNameCn);
    }

    if (startDate) {
      sql += ' AND created_at >= ?';
      params.push(new Date(startDate));
    }

    if (endDate) {
      sql += ' AND created_at <= ?';
      params.push(new Date(endDate));
    }

    sql += ' GROUP BY change_type, biz_type';

    return this.query(sql, params);
  }

  /**
   * 业务类型列表
   */
  static getBizTypeList() {
    return [
      { value: 'purchase', label: '采购入库' },
      { value: 'return', label: '退货入库' },
      { value: 'transfer', label: '调拨入库' },
      { value: 'order', label: '订单出库' },
      { value: 'damage', label: '损耗出库' },
      { value: 'return_supplier', label: '退货给供应商' }
    ];
  }

  /**
   * 变动类型列表
   */
  static getChangeTypeList() {
    return [
      { value: 'in', label: '入库' },
      { value: 'out', label: '出库' },
      { value: 'adjust', label: '调整' }
    ];
  }
}

module.exports = new DomesticInventoryModel();
