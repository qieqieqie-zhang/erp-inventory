const BaseModel = require('./BaseModel');

class FBAInventoryModel extends BaseModel {
  constructor() {
    super('amazon_fba_inventory');
  }

  /**
   * 根据SKU查找FBA库存
   * @param {string} sku 
   * @returns {Promise<Object|null>}
   */
  async findBySku(sku) {
    const rows = await this.query(
      'SELECT * FROM amazon_fba_inventory WHERE seller_sku = ?',
      [sku]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * 批量插入或更新FBA库存数据（全量覆盖）
   * @param {Array} inventoryData 
   * @param {string} uploadBatch 
   * @returns {Promise<Object>}
   */
  async bulkUpsert(inventoryData, uploadBatch) {
    if (inventoryData.length === 0) {
      return { inserted: 0, updated: 0 };
    }

    // 开始事务
    const connection = await this.pool.getConnection();
    await connection.beginTransaction();

    try {
      // 删除现有数据（全量覆盖）
      await connection.execute('DELETE FROM amazon_fba_inventory');

      // 批量插入新数据
      const keys = [
        'snapshot_date', 'seller_sku', 'item_name', 'asin', 'fnsku',
        'condition_type', 'available_quantity', 'unavailable_quantity',
        'inbound_quantity', 'inbound_working', 'shipped_quantity',
        'received_quantity', 'total_reserved_quantity', 'unfulfillable_quantity',
        'sales_last_7_days', 'sales_last_30_days', 'days_of_supply',
        'marketplace', 'fba_minimum_inventory_level', 'fba_inventory_level_health_status',
        'recommended_ship_in_quantity', 'recommended_ship_in_date',
        'inventory_supply_at_fba', 'reserved_fc_transfer',
        'reserved_fc_processing', 'reserved_customer_order', 'your_price', 'upload_batch'
      ];

      const values = inventoryData.map(item => {
        // 辅助函数：处理日期
        const formatDate = (dateStr) => {
          if (!dateStr) return null;
          try {
            const date = new Date(dateStr);
            return isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
          } catch (e) {
            return null;
          }
        };

        return [
          formatDate(item['snapshot-date'] || item.snapshot_date),
          item['sku'] || item['seller-sku'] || item.seller_sku || '',
          item['product-name'] || item['item-name'] || item.item_name || '',
          item.asin || '',
          item.fnsku || '',
          item['condition'] || item.condition_type || '',
          parseInt(item['available'] || item['available-quantity'] || item.available_quantity || 0),
          parseInt(item['unavailable-quantity'] || item.unavailable_quantity || 0),
          parseInt(item['inbound-quantity'] || item.inbound_quantity || 0),
          parseInt(item['inbound-working'] || item.inbound_working || 0),
          parseInt(item['inbound-shipped'] || item['shipped-quantity'] || item.shipped_quantity || 0),
          parseInt(item['inbound-received'] || item['received-quantity'] || item.received_quantity || 0),
          parseInt(item['Total Reserved Quantity'] || item.total_reserved_quantity || 0),
          parseInt(item['unfulfillable-quantity'] || item.unfulfillable_quantity || 0),
          parseInt(item['sales-shipped-last-7-days'] || item['sales-last-7-days'] || item.sales_last_7_days || 0),
          parseInt(item['sales-shipped-last-30-days'] || item['sales-last-30-days'] || item.sales_last_30_days || 0),
          parseInt(item['days-of-supply'] || item.days_of_supply || 0),
          item.marketplace || '',
          parseFloat(item['fba-minimum-inventory-level'] || item.fba_minimum_inventory_level || null),
          item['fba-inventory-level-health-status'] || item.fba_inventory_level_health_status || '',
          parseInt(item['Recommended ship-in quantity'] || item.recommended_ship_in_quantity || null),
          formatDate(item['Recommended ship-in date'] || item.recommended_ship_in_date),
          parseInt(item['Inventory Supply at FBA'] || item.inventory_supply_at_fba || null),
          parseInt(item['Reserved FC Transfer'] || item.reserved_fc_transfer || 0),
          parseInt(item['Reserved FC Processing'] || item.reserved_fc_processing || 0),
          parseInt(item['Reserved Customer Order'] || item.reserved_customer_order || 0),
          parseFloat(item['your-price'] || item.your_price || null),
          uploadBatch
        ];
      });

      const placeholders = inventoryData.map(() => 
        `(${keys.map(() => '?').join(', ')})`
      ).join(', ');

      const flattenedValues = values.flat();
      const sql = `INSERT INTO amazon_fba_inventory (${keys.join(', ')}) VALUES ${placeholders}`;

      const [result] = await connection.execute(sql, flattenedValues);

      // 计算售出金额：your_price * sales_last_30_days
      await connection.execute(`
        UPDATE amazon_fba_inventory
        SET sales_amount = COALESCE(your_price, 0) * sales_last_30_days
        WHERE sales_amount IS NULL OR sales_amount = 0
      `);

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
   * 获取FBA库存列表
   * @param {Object} options 
   * @returns {Promise<Array>}
   */
  async getInventoryList(options = {}) {
    const {
      page = 1,
      pageSize = 20,
      search = '',
      marketplace = '',
      minAvailable = null,
      maxAvailable = null,
      minDaysSupply = null,
      maxDaysSupply = null
    } = options;

    let sql = 'SELECT * FROM amazon_fba_inventory WHERE 1=1';
    const params = [];

    // 搜索条件
    if (search) {
      sql += ' AND (seller_sku LIKE ? OR item_name LIKE ? OR asin LIKE ? OR fnsku LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // 站点过滤
    if (marketplace) {
      sql += ' AND marketplace = ?';
      params.push(marketplace);
    }

    // 可用库存过滤
    if (minAvailable !== null) {
      sql += ' AND available_quantity >= ?';
      params.push(minAvailable);
    }

    if (maxAvailable !== null) {
      sql += ' AND available_quantity <= ?';
      params.push(maxAvailable);
    }

    // 可供天数过滤
    if (minDaysSupply !== null) {
      sql += ' AND days_of_supply >= ?';
      params.push(minDaysSupply);
    }

    if (maxDaysSupply !== null) {
      sql += ' AND days_of_supply <= ?';
      params.push(maxDaysSupply);
    }

    // 低库存过滤（可供天数 < 7）
    if (options.lowStock === true) {
      sql += ' AND days_of_supply < 7 AND days_of_supply > 0';
    }

    // 零库存过滤
    if (options.zeroStock === true) {
      sql += ' AND available_quantity = 0';
    }

    // 排序
    sql += ' ORDER BY days_of_supply ASC, available_quantity ASC';

    // 分页 - 直接拼接LIMIT值，因为MySQL2的占位符在LIMIT中有问题
    const offset = (page - 1) * pageSize;
    sql += ` LIMIT ${pageSize} OFFSET ${offset}`;

    return this.query(sql, params);
  }

  /**
   * 统计FBA库存数量
   * @param {Object} filters 
   * @returns {Promise<number>}
   */
  async countInventory(filters = {}) {
    const { search = '', marketplace = '' } = filters;
    
    let sql = 'SELECT COUNT(*) as count FROM amazon_fba_inventory WHERE 1=1';
    const params = [];

    if (search) {
      sql += ' AND (seller_sku LIKE ? OR item_name LIKE ? OR asin LIKE ? OR fnsku LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (marketplace) {
      sql += ' AND marketplace = ?';
      params.push(marketplace);
    }

    const rows = await this.query(sql, params);
    return parseInt(rows[0].count);
  }

  /**
   * 获取FBA库存统计信息
   * @returns {Promise<Object>}
   */
  async getInventoryStats() {
    const [stats] = await this.query(`
      SELECT 
        COUNT(*) as total_sku,
        SUM(available_quantity) as total_available,
        SUM(unavailable_quantity) as total_unavailable,
        SUM(inbound_quantity) as total_inbound,
        SUM(sales_last_7_days) as total_7d_sales,
        SUM(sales_last_30_days) as total_30d_sales,
        AVG(days_of_supply) as avg_days_supply,
        SUM(CASE WHEN days_of_supply < 7 AND days_of_supply > 0 THEN 1 ELSE 0 END) as low_stock_sku,
        SUM(CASE WHEN available_quantity = 0 THEN 1 ELSE 0 END) as zero_stock_sku,
        SUM(CASE WHEN available_quantity > 100 THEN 1 ELSE 0 END) as high_stock_sku
      FROM amazon_fba_inventory
    `);

    return stats;
  }

  /**
   * 获取库存预警列表
   * @returns {Promise<Array>}
   */
  async getStockAlerts() {
    return this.query(`
      SELECT 
        seller_sku,
        item_name,
        available_quantity,
        days_of_supply,
        sales_last_7_days,
        sales_last_30_days,
        suggested_replenishment,
        amazon_suggestion,
        CASE 
          WHEN days_of_supply = 0 THEN '零库存'
          WHEN days_of_supply < 7 THEN '即将断货'
          WHEN available_quantity > 100 AND sales_last_30_days < 10 THEN '积压库存'
          ELSE '正常'
        END as alert_type
      FROM amazon_fba_inventory
      WHERE days_of_supply < 7 OR available_quantity = 0 OR 
            (available_quantity > 100 AND sales_last_30_days < 10)
      ORDER BY 
        CASE 
          WHEN days_of_supply = 0 THEN 1
          WHEN days_of_supply < 7 THEN 2
          ELSE 3
        END,
        days_of_supply ASC
    `);
  }
}

module.exports = new FBAInventoryModel();