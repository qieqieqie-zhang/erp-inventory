const BaseModel = require('./BaseModel');

class LogisticsModel extends BaseModel {
  constructor() {
    super('logistics_tracking');
  }

  // 日期字段列表
  static DATE_FIELDS = ['ship_date', 'create_date', 'delivery_date', 'arrival_date'];

  // 将空字符串日期转为 null
  _sanitizeDateFields(data) {
    const result = { ...data };
    for (const field of LogisticsModel.DATE_FIELDS) {
      if (result[field] === '') {
        result[field] = null;
      }
    }
    return result;
  }

  /**
   * 获取物流跟踪列表（支持分页、搜索、筛选）
   * @param {Object} options
   * @returns {Promise<Array>}
   */
  async getList(options = {}) {
    const {
      page = 1,
      pageSize = 20,
      search = '',
      status = '',
      country = '',
      shopId = null,
      shop_code = '',
      startDate = null,
      endDate = null
    } = options;

    let sql = 'SELECT lt.* FROM logistics_tracking lt';
    const params = [];
    const conditions = [];

    // 店铺过滤（使用子查询避免LEFT JOIN + WHERE失效问题）
    if (shopId) {
      conditions.push('lt.shop_id = ?');
      params.push(shopId);
    }

    if (shop_code) {
      conditions.push('lt.shop_id IN (SELECT id FROM shops WHERE shop_code = ?)');
      params.push(shop_code);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    } else {
      sql += ' WHERE 1=1';
    }

    // 搜索条件
    if (search) {
      sql += ' AND (fba_warehouse_number LIKE ? OR tracking_number LIKE ? OR forwarder_name LIKE ? OR sku_code LIKE ? OR sku_name LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // 状态过滤
    if (status) {
      sql += ' AND logistics_status = ?';
      params.push(status);
    }

    // 国家过滤
    if (country) {
      sql += ' AND destination_country = ?';
      params.push(country);
    }

    // 日期范围过滤
    if (startDate) {
      sql += ' AND ship_date >= ?';
      params.push(new Date(startDate));
    }

    if (endDate) {
      sql += ' AND ship_date <= ?';
      params.push(new Date(endDate));
    }

    // 排序
    sql += ' ORDER BY ship_date DESC, created_at DESC';

    // 分页
    const offset = (page - 1) * pageSize;
    sql += ` LIMIT ${pageSize} OFFSET ${offset}`;

    return this.query(sql, params);
  }

  /**
   * 统计物流跟踪数量
   * @param {Object} filters
   * @returns {Promise<number>}
   */
  async count(filters = {}) {
    const { search = '', status = '', country = '', shopId = null, shop_code = '', startDate = null, endDate = null } = filters;

    let sql = 'SELECT COUNT(*) as count FROM logistics_tracking WHERE 1=1';
    const params = [];

    if (shopId) {
      sql += ' AND shop_id = ?';
      params.push(shopId);
    }

    // 店铺过滤（使用子查询避免LEFT JOIN + WHERE失效问题）
    if (shop_code) {
      sql += ' AND shop_id IN (SELECT id FROM shops WHERE shop_code = ?)';
      params.push(shop_code);
    }

    if (search) {
      sql += ' AND (fba_warehouse_number LIKE ? OR tracking_number LIKE ? OR forwarder_name LIKE ? OR sku_code LIKE ? OR sku_name LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (status) {
      sql += ' AND logistics_status = ?';
      params.push(status);
    }

    if (country) {
      sql += ' AND destination_country = ?';
      params.push(country);
    }

    if (startDate) {
      sql += ' AND ship_date >= ?';
      params.push(new Date(startDate));
    }

    if (endDate) {
      sql += ' AND ship_date <= ?';
      params.push(new Date(endDate));
    }

    const rows = await this.query(sql, params);
    return parseInt(rows[0].count);
  }

  /**
   * 根据ID查找
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    const rows = await this.query(
      'SELECT * FROM logistics_tracking WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * 创建物流跟踪记录
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async create(data) {
    const sanitized = this._sanitizeDateFields(data);
    const keys = Object.keys(sanitized);
    const values = Object.values(sanitized);

    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO logistics_tracking (${keys.join(', ')}) VALUES (${placeholders})`;

    const [result] = await this.pool.execute(sql, values);
    return { id: result.insertId, ...sanitized };
  }

  /**
   * 批量创建物流跟踪记录
   * @param {Array} dataArray
   * @returns {Promise<Object>}
   */
  async bulkCreate(dataArray) {
    if (dataArray.length === 0) {
      return { affectedRows: 0 };
    }

    const sanitizedArray = dataArray.map(item => this._sanitizeDateFields(item));
    const keys = Object.keys(sanitizedArray[0]);
    const values = sanitizedArray.map(item => Object.values(item));

    const placeholders = dataArray.map(() =>
      `(${keys.map(() => '?').join(', ')})`
    ).join(', ');

    const flattenedValues = values.flat();
    const sql = `INSERT INTO logistics_tracking (${keys.join(', ')}) VALUES ${placeholders}`;

    const [result] = await this.pool.execute(sql, flattenedValues);
    return result;
  }

  /**
   * 更新物流跟踪记录
   * @param {number} id
   * @param {Object} data
   * @returns {Promise<boolean>}
   */
  async update(id, data) {
    const sanitized = this._sanitizeDateFields(data);
    const keys = Object.keys(sanitized);
    const values = Object.values(sanitized);

    const setClause = keys.map(key => `${key} = ?`).join(', ');
    const sql = `UPDATE logistics_tracking SET ${setClause} WHERE id = ?`;

    const [result] = await this.pool.execute(sql, [...values, id]);
    return result.affectedRows > 0;
  }

  /**
   * 更新物流状态
   * @param {number} id
   * @param {string} status
   * @returns {Promise<boolean>}
   */
  async updateStatus(id, status) {
    const sql = 'UPDATE logistics_tracking SET logistics_status = ? WHERE id = ?';
    const [result] = await this.pool.execute(sql, [status, id]);
    return result.affectedRows > 0;
  }

  /**
   * 删除物流跟踪记录
   * @param {number} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    const [result] = await this.pool.execute(
      'DELETE FROM logistics_tracking WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  /**
   * 获取物流统计信息
   * @param {Object} options - 查询选项，支持 shopId 或 shop_code
   * @returns {Promise<Object>}
   */
  async getStats(options = {}) {
    const { shopId = null, shop_code = '' } = options;
    let sql = `
      SELECT
        COUNT(*) as total,
        COALESCE(SUM(CASE WHEN logistics_status = 'pending' THEN 1 ELSE 0 END), 0) as pending_count,
        COALESCE(SUM(CASE WHEN logistics_status = 'shipped' THEN 1 ELSE 0 END), 0) as shipped_count,
        COALESCE(SUM(CASE WHEN logistics_status = 'in_transit' THEN 1 ELSE 0 END), 0) as in_transit_count,
        COALESCE(SUM(CASE WHEN logistics_status = 'arrived' THEN 1 ELSE 0 END), 0) as arrived_count,
        COALESCE(SUM(CASE WHEN logistics_status = 'customs_cleared' THEN 1 ELSE 0 END), 0) as customs_cleared_count,
        COALESCE(SUM(CASE WHEN logistics_status = 'delivered' THEN 1 ELSE 0 END), 0) as delivered_count
      FROM logistics_tracking lt
    `;
    const params = [];
    const conditions = [];

    if (shopId) {
      conditions.push('lt.shop_id = ?');
      params.push(shopId);
    }

    if (shop_code) {
      conditions.push('lt.shop_id IN (SELECT id FROM shops WHERE shop_code = ?)');
      params.push(shop_code);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    const rows = await this.query(sql, params);
    return rows[0];
  }

  /**
   * 获取物流状态列表（用于下拉选择）
   * @returns {Array}
   */
  static getStatusList() {
    return [
      { value: 'pending', label: '待发货' },
      { value: 'shipped', label: '已发货' },
      { value: 'in_transit', label: '运输中' },
      { value: 'arrived', label: '已到港' },
      { value: 'customs_cleared', label: '清关完成' },
      { value: 'delivered', label: '已派送' }
    ];
  }

  /**
   * 获取在途SKU数量（按SKU去重）
   * @param {number} shopId - 店铺ID（可选）
   * @returns {Promise<number>} 唯一SKU数量
   */
  async getInTransitSkuCount(shopId = null, shop_code = '') {
    // 物流在途 SKU 数：统计所有物流记录中的唯一 SKU（包含 pending/shipped/in_transit 等状态）
    let sql = `
      SELECT * FROM logistics_tracking
      WHERE logistics_status IN ('pending', 'shipped', 'in_transit')
    `;
    const params = [];

    if (shopId) {
      sql += ' AND shop_id = ?';
      params.push(shopId);
    }

    // 店铺过滤（使用子查询避免LEFT JOIN + WHERE失效问题）
    if (shop_code) {
      sql += ' AND shop_id IN (SELECT id FROM shops WHERE shop_code = ?)';
      params.push(shop_code);
    }

    const rows = await this.query(sql, params);
    const skuSet = new Set();

    for (const item of rows) {
      try {
        const skuList = typeof item.sku_list === 'string' ? JSON.parse(item.sku_list) : (item.sku_list || []);
        for (const skuItem of skuList) {
          const sku = skuItem.sku_code || skuItem.sku;
          if (sku) {
            skuSet.add(sku);
          }
        }
      } catch (e) {
        if (item.sku_code) {
          skuSet.add(item.sku_code);
        }
      }
    }

    return skuSet.size;
  }
}

module.exports = new LogisticsModel();