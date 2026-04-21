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
      'SELECT * FROM amazon_fba_reserved WHERE seller_sku = ?',
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
        'seller_sku', 'item_name', 'asin', 'fnsku', 'total_reserved',
        'customer_order_reserved', 'transfer_reserved', 'warehouse_processing_reserved',
        'project_type', 'upload_batch'
      ];

      const values = reservedData.map(item => [
        item['seller-sku'] || item.seller_sku || '',
        item['item-name'] || item.item_name || '',
        item.asin || '',
        item.fnsku || '',
        parseInt(item['total-reserved'] || item.total_reserved || 0),
        parseInt(item['customer-order-reserved'] || item.customer_order_reserved || 0),
        parseInt(item['transfer-reserved'] || item.transfer_reserved || 0),
        parseInt(item['warehouse-processing-reserved'] || item.warehouse_processing_reserved || 0),
        item['project-type'] || item.project_type || '',
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
      minReserved = null,
      maxReserved = null
    } = options;

    let sql = 'SELECT * FROM amazon_fba_reserved WHERE 1=1';
    const params = [];

    // 搜索条件
    if (search) {
      sql += ' AND (seller_sku LIKE ? OR item_name LIKE ? OR asin LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // 预留数量过滤
    if (minReserved !== null) {
      sql += ' AND total_reserved >= ?';
      params.push(minReserved);
    }

    if (maxReserved !== null) {
      sql += ' AND total_reserved <= ?';
      params.push(maxReserved);
    }

    // 排序
    sql += ' ORDER BY total_reserved DESC';

    // 分页 - 直接拼接LIMIT值，因为MySQL2的占位符在LIMIT中有问题
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
    const { search = '' } = filters;
    
    let sql = 'SELECT COUNT(*) as count FROM amazon_fba_reserved WHERE 1=1';
    const params = [];

    if (search) {
      sql += ' AND (seller_sku LIKE ? OR item_name LIKE ? OR asin LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    const rows = await this.query(sql, params);
    return parseInt(rows[0].count);
  }

  /**
   * 获取预留库存统计信息
   * @returns {Promise<Object>}
   */
  async getReservedStats() {
    const [stats] = await this.query(`
      SELECT 
        COUNT(*) as total_sku,
        SUM(total_reserved) as total_reserved,
        SUM(customer_order_reserved) as total_customer_reserved,
        SUM(transfer_reserved) as total_transfer_reserved,
        SUM(warehouse_processing_reserved) as total_warehouse_reserved,
        AVG(total_reserved) as avg_reserved
      FROM amazon_fba_reserved
    `);

    return stats;
  }
}

module.exports = new FBAReservedModel();