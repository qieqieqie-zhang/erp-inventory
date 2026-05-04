const BaseModel = require('./BaseModel');

class FBAReservedModel extends BaseModel {
  constructor() {
    super('amazon_fba_reserved');
  }

  /**
   * 根据SKU查找FBA预留库存
   * @param {string} sku
   * @returns {Promise<Object|null>}
   */
  async findBySku(sku) {
    const rows = await this.query(
      'SELECT * FROM amazon_fba_reserved WHERE sku = ?',
      [sku]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * 批量插入或更新FBA预留库存数据（全量覆盖）
   * @param {Array} reservedData
   * @param {string} uploadBatch
   * @returns {Promise<Object>}
   */
  async bulkUpsert(reservedData, uploadBatch) {
    if (reservedData.length === 0) {
      return { inserted: 0, updated: 0 };
    }

    // 开始事务
    const connection = await this.pool.getConnection();
    await connection.beginTransaction();

    try {
      // 删除现有数据（全量覆盖）
      await connection.execute('DELETE FROM amazon_fba_reserved');

      // 批量插入新数据
      const keys = [
        'sku', 'product_name', 'asin', 'fnsku', 'reserved_qty',
        'reserved_customerorders', 'reserved_fc_transfers', 'reserved_fc_processing',
        'program', 'upload_batch'
      ];

      const values = reservedData.map(item => [
        item['sku'] || item.sku || '',
        item['product-name'] || item.product_name || '',
        item.asin || '',
        item.fnsku || '',
        parseInt(item['reserved_qty'] || item.reserved_qty || 0),
        parseInt(item['reserved_customerorders'] || item.reserved_customerorders || 0),
        parseInt(item['reserved_fc-transfers'] || item.reserved_fc_transfers || 0),
        parseInt(item['reserved_fc-processing'] || item.reserved_fc_processing || 0),
        item['program'] || item.program || '',
        uploadBatch
      ]);

      const placeholders = reservedData.map(() =>
        `(${keys.map(() => '?').join(', ')})`
      ).join(', ');

      const flattenedValues = values.flat();
      const sql = `INSERT INTO amazon_fba_reserved (${keys.join(', ')}) VALUES ${placeholders}`;

      const [result] = await connection.execute(sql, flattenedValues);

      await connection.commit();

      return {
        inserted: result.affectedRows,
        updated: 0
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 获取FBA预留库存列表
   * @param {Object} options
   * @returns {Promise<Array>}
   */
  async getReservedList(options = {}) {
    const {
      page = 1,
      pageSize = 20,
      search = '',
      asinSearch = '',
      reasonFilter = '',
      dataStatusFilter = '',
      shop_code = ''
    } = options;

    let sql = `SELECT fr.*, p.product_name_cn FROM amazon_fba_reserved fr
               LEFT JOIN product_master p ON fr.sku = p.seller_sku COLLATE utf8mb4_general_ci`;
    const params = [];
    const conditions = [];

    // 店铺过滤（使用子查询避免LEFT JOIN + WHERE失效问题）
    if (shop_code) {
      sql += ` WHERE fr.sku IN (SELECT pm.seller_sku FROM product_master pm WHERE pm.shop_id IN (SELECT id FROM shops WHERE shop_code = ?))`;
      params.push(shop_code);
    }

    if (conditions.length > 0) {
      sql += ' AND ' + conditions.join(' AND ');
    }

    // SKU/中文名称搜索
    if (search) {
      sql += ' AND (fr.sku LIKE ? OR p.product_name_cn LIKE ? OR fr.product_name LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // ASIN搜索
    if (asinSearch) {
      sql += ' AND fr.asin LIKE ?';
      params.push(`%${asinSearch}%`);
    }

    // 预留原因筛选
    if (reasonFilter) {
      switch (reasonFilter) {
        case 'customer_orders':
          sql += ' AND reserved_customerorders > 0';
          break;
        case 'fc_transfers':
          sql += ' AND reserved_fc_transfers > 0';
          break;
        case 'fc_processing':
          sql += ' AND reserved_fc_processing > 0';
          break;
        case 'high_transfer_ratio':
          sql += ' AND (reserved_customerorders + reserved_fc_transfers + reserved_fc_processing) > 0 AND reserved_fc_transfers * 1.0 / (reserved_customerorders + reserved_fc_transfers + reserved_fc_processing) >= 0.7';
          break;
        case 'high_processing_ratio':
          sql += ' AND (reserved_customerorders + reserved_fc_transfers + reserved_fc_processing) > 0 AND reserved_fc_processing * 1.0 / (reserved_customerorders + reserved_fc_transfers + reserved_fc_processing) >= 0.7';
          break;
      }
    }

    // 数据状态筛选
    if (dataStatusFilter) {
      switch (dataStatusFilter) {
        case 'consistent':
          sql += ' AND reserved_qty = (reserved_customerorders + reserved_fc_transfers + reserved_fc_processing)';
          break;
        case 'inconsistent':
          sql += ' AND reserved_qty != (reserved_customerorders + reserved_fc_transfers + reserved_fc_processing)';
          break;
        case 'no_detail':
          sql += ' AND reserved_qty > 0 AND (reserved_customerorders + reserved_fc_transfers + reserved_fc_processing) = 0';
          break;
        case 'no_reserved':
          sql += ' AND reserved_qty = 0 AND (reserved_customerorders + reserved_fc_transfers + reserved_fc_processing) = 0';
          break;
      }
    }

    // 排序
    sql += ' ORDER BY reserved_qty DESC';

    // 分页 - 直接拼接LIMIT值
    const offset = (page - 1) * pageSize;
    sql += ` LIMIT ${pageSize} OFFSET ${offset}`;

    return this.query(sql, params);
  }

  /**
   * 统计FBA预留库存数量
   * @param {Object} filters
   * @returns {Promise<number>}
   */
  async countReserved(filters = {}) {
    const { search = '', asinSearch = '', reasonFilter = '', dataStatusFilter = '', shop_code = '' } = filters;

    let sql = 'SELECT COUNT(*) as count FROM amazon_fba_reserved WHERE 1=1';
    const params = [];

    // 店铺过滤（使用子查询避免LEFT JOIN + WHERE失效问题）
    if (shop_code) {
      sql += ' AND sku IN (SELECT pm.seller_sku FROM product_master pm WHERE pm.shop_id IN (SELECT id FROM shops WHERE shop_code = ?))';
      params.push(shop_code);
    }

    if (search) {
      sql += ' AND (sku LIKE ? OR product_name LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    if (asinSearch) {
      sql += ' AND asin LIKE ?';
      params.push(`%${asinSearch}%`);
    }

    if (reasonFilter) {
      switch (reasonFilter) {
        case 'customer_orders':
          sql += ' AND reserved_customerorders > 0';
          break;
        case 'fc_transfers':
          sql += ' AND reserved_fc_transfers > 0';
          break;
        case 'fc_processing':
          sql += ' AND reserved_fc_processing > 0';
          break;
        case 'high_transfer_ratio':
          sql += ' AND (reserved_customerorders + reserved_fc_transfers + reserved_fc_processing) > 0 AND reserved_fc_transfers * 1.0 / (reserved_customerorders + reserved_fc_transfers + reserved_fc_processing) >= 0.7';
          break;
        case 'high_processing_ratio':
          sql += ' AND (reserved_customerorders + reserved_fc_transfers + reserved_fc_processing) > 0 AND reserved_fc_processing * 1.0 / (reserved_customerorders + reserved_fc_transfers + reserved_fc_processing) >= 0.7';
          break;
      }
    }

    if (dataStatusFilter) {
      switch (dataStatusFilter) {
        case 'consistent':
          sql += ' AND reserved_qty = (reserved_customerorders + reserved_fc_transfers + reserved_fc_processing)';
          break;
        case 'inconsistent':
          sql += ' AND reserved_qty != (reserved_customerorders + reserved_fc_transfers + reserved_fc_processing)';
          break;
        case 'no_detail':
          sql += ' AND reserved_qty > 0 AND (reserved_customerorders + reserved_fc_transfers + reserved_fc_processing) = 0';
          break;
        case 'no_reserved':
          sql += ' AND reserved_qty = 0 AND (reserved_customerorders + reserved_fc_transfers + reserved_fc_processing) = 0';
          break;
      }
    }

    const rows = await this.query(sql, params);
    return parseInt(rows[0].count);
  }

  /**
   * 获取预留库存统计信息
   * @param {Object} options - 查询选项，支持 shop_code
   * @returns {Promise<Object>}
   */
  async getReservedStats(options = {}) {
    const { shop_code = '' } = options;
    let sql = `
      SELECT
        COUNT(*) as total_sku,
        SUM(reserved_qty) as total_reserved_qty,
        SUM(reserved_customerorders) as total_customerorders,
        SUM(reserved_fc_transfers) as total_fc_transfers,
        SUM(reserved_fc_processing) as total_fc_processing,
        SUM(reserved_customerorders + reserved_fc_transfers + reserved_fc_processing) as detail_total,
        AVG(reserved_qty) as avg_reserved_qty
      FROM amazon_fba_reserved fr
    `;
    const params = [];

    // 店铺过滤（使用子查询避免LEFT JOIN + WHERE失效问题）
    if (shop_code) {
      sql += ` WHERE fr.sku IN (SELECT pm.seller_sku FROM product_master pm WHERE pm.shop_id IN (SELECT id FROM shops WHERE shop_code = ?))`;
      params.push(shop_code);
    }

    const [stats] = await this.query(sql, params);
    return stats;
  }

  /**
   * 清空所有预留库存数据
   * @returns {Promise<Object>}
   */
  async deleteAll() {
    const result = await this.query('DELETE FROM amazon_fba_reserved');
    return { affectedRows: result.affectedRows || 0 };
  }

  /**
   * 按SKU删除单条预留库存记录
   * @param {string} sku
   * @returns {Promise<boolean>}
   */
  async deleteBySku(sku) {
    const result = await this.query(
      'DELETE FROM amazon_fba_reserved WHERE sku = ?',
      [sku]
    );
    return result.affectedRows > 0;
  }
}

module.exports = new FBAReservedModel();
