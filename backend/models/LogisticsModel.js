const BaseModel = require('./BaseModel');

class LogisticsModel extends BaseModel {
  constructor() {
    super('logistics_tracking');
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
      startDate = null,
      endDate = null
    } = options;

    let sql = 'SELECT * FROM logistics_tracking WHERE 1=1';
    const params = [];

    // 店铺过滤
    if (shopId) {
      sql += ' AND shop_id = ?';
      params.push(shopId);
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
    const { search = '', status = '', country = '', shopId = null, startDate = null, endDate = null } = filters;

    let sql = 'SELECT COUNT(*) as count FROM logistics_tracking WHERE 1=1';
    const params = [];

    if (shopId) {
      sql += ' AND shop_id = ?';
      params.push(shopId);
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
    const keys = Object.keys(data);
    const values = Object.values(data);

    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO logistics_tracking (${keys.join(', ')}) VALUES (${placeholders})`;

    const [result] = await this.pool.execute(sql, values);
    return { id: result.insertId, ...data };
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

    const keys = Object.keys(dataArray[0]);
    const values = dataArray.map(item => Object.values(item));

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
    const keys = Object.keys(data);
    const values = Object.values(data);

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
   * @param {number} shopId
   * @returns {Promise<Object>}
   */
  async getStats(shopId = null) {
    let sql = `
      SELECT
        COUNT(*) as total,
        COALESCE(SUM(CASE WHEN logistics_status = 'pending' THEN 1 ELSE 0 END), 0) as pending_count,
        COALESCE(SUM(CASE WHEN logistics_status = 'shipped' THEN 1 ELSE 0 END), 0) as shipped_count,
        COALESCE(SUM(CASE WHEN logistics_status = 'in_transit' THEN 1 ELSE 0 END), 0) as in_transit_count,
        COALESCE(SUM(CASE WHEN logistics_status = 'arrived' THEN 1 ELSE 0 END), 0) as arrived_count,
        COALESCE(SUM(CASE WHEN logistics_status = 'customs_cleared' THEN 1 ELSE 0 END), 0) as customs_cleared_count,
        COALESCE(SUM(CASE WHEN logistics_status = 'delivered' THEN 1 ELSE 0 END), 0) as delivered_count
      FROM logistics_tracking
    `;
    const params = [];

    if (shopId) {
      sql += ' WHERE shop_id = ?';
      params.push(shopId);
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
}

module.exports = new LogisticsModel();