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

      // 批量插入新数据 - 映射所有CSV字段
      const keys = [
        'snapshot_date', 'seller_sku', 'fnsku', 'asin', 'item_name', 'condition_type',
        'available_quantity', 'pending_removal_quantity',
        'inv_age_0_to_90_days', 'inv_age_91_to_180_days', 'inv_age_181_to_270_days',
        'inv_age_271_to_365_days', 'inv_age_366_to_455_days', 'inv_age_456_plus_days',
        'currency', 'units_shipped_t7', 'units_shipped_t30', 'units_shipped_t60', 'units_shipped_t90',
        'alert', 'your_price', 'sales_price', 'lowest_price_new_plus_shipping', 'lowest_price_used',
        'recommended_action', 'deprecated_healthy_inventory_level', 'recommended_sales_price',
        'recommended_sale_duration_days', 'recommended_removal_quantity', 'estimated_cost_savings',
        'sell_through', 'item_volume', 'volume_unit_measurement', 'storage_type', 'storage_volume',
        'marketplace', 'product_group', 'sales_rank', 'days_of_supply', 'estimated_excess_quantity',
        'weeks_of_cover_t30', 'weeks_of_cover_t90', 'featuredoffer_price',
        'sales_last_7_days', 'sales_last_30_days', 'sales_shipped_last_60_days', 'sales_shipped_last_90_days',
        'inv_age_0_to_30_days', 'inv_age_31_to_60_days', 'inv_age_61_to_90_days',
        'inv_age_181_to_330_days', 'inv_age_331_to_365_days',
        'estimated_storage_cost_next_month',
        'inbound_quantity', 'inbound_working', 'shipped_quantity', 'inbound_received',
        'no_sale_last_6_months', 'total_reserved_quantity', 'unfulfillable_quantity',
        'quantity_ais_181_210_days', 'estimated_ais_181_210_days',
        'quantity_ais_211_240_days', 'estimated_ais_211_240_days',
        'quantity_ais_241_270_days', 'estimated_ais_241_270_days',
        'quantity_ais_271_300_days', 'estimated_ais_271_300_days',
        'quantity_ais_301_330_days', 'estimated_ais_301_330_days',
        'quantity_ais_331_365_days', 'estimated_ais_331_365_days',
        'quantity_ais_366_455_days', 'estimated_ais_366_455_days',
        'quantity_ais_456_plus_days', 'estimated_ais_456_plus_days',
        'historical_days_of_supply', 'fba_minimum_inventory_level', 'fba_inventory_level_health_status',
        'recommended_ship_in_quantity', 'recommended_ship_in_date',
        'last_updated_historical_days', 'exempted_low_inventory_fee', 'low_inventory_fee_applied',
        'short_term_historical_days', 'long_term_historical_days', 'inventory_age_snapshot_date',
        'inventory_supply_at_fba', 'reserved_fc_transfer', 'reserved_fc_processing', 'reserved_customer_order',
        'total_days_supply_open_shipments', 'supplier', 'is_seasonal_next_3_months',
        'season_name', 'season_start_date', 'season_end_date',
        'upload_batch'
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

        // 辅助函数：解析数字
        const parseNum = (val) => {
          if (val === '' || val === null || val === undefined) return 0;
          const num = parseFloat(val);
          return isNaN(num) ? 0 : num;
        };

        return [
          formatDate(item['snapshot-date'] || item.snapshot_date),
          item['sku'] || item['seller-sku'] || item.seller_sku || '',
          item.fnsku || '',
          item.asin || '',
          item['product-name'] || item['item-name'] || item.item_name || '',
          item['condition'] || item.condition_type || '',
          parseNum(item['available']),
          parseNum(item['pending-removal-quantity']),
          parseNum(item['inv-age-0-to-90-days']),
          parseNum(item['inv-age-91-to-180-days']),
          parseNum(item['inv-age-181-to-270-days']),
          parseNum(item['inv-age-271-to-365-days']),
          parseNum(item['inv-age-366-to-455-days']),
          parseNum(item['inv-age-456-plus-days']),
          item.currency || 'USD',
          parseNum(item['units-shipped-t7']),
          parseNum(item['units-shipped-t30']),
          parseNum(item['units-shipped-t60']),
          parseNum(item['units-shipped-t90']),
          item.alert || '',
          parseNum(item['your-price']),
          parseNum(item['sales-price']),
          parseNum(item['lowest-price-new-plus-shipping']),
          parseNum(item['lowest-price-used']),
          item['recommended-action'] || '',
          item['DEPRECATED healthy-inventory-level'] || '',
          parseNum(item['recommended-sales-price']),
          parseNum(item['recommended-sale-duration-days']),
          parseNum(item['recommended-removal-quantity']),
          parseNum(item['estimated-cost-savings-of-recommended-actions']),
          parseNum(item['sell-through']),
          parseNum(item['item-volume']),
          item['volume-unit-measurement'] || '',
          item['storage-type'] || '',
          parseNum(item['storage-volume']),
          item.marketplace || '',
          item['product-group'] || '',
          parseNum(item['sales-rank']),
          parseNum(item['days-of-supply']),
          parseNum(item['estimated-excess-quantity']),
          parseNum(item['weeks-of-cover-t30']),
          parseNum(item['weeks-of-cover-t90']),
          parseNum(item['featuredoffer-price']),
          parseNum(item['sales-shipped-last-7-days']),
          parseNum(item['sales-shipped-last-30-days']),
          parseNum(item['sales-shipped-last-60-days']),
          parseNum(item['sales-shipped-last-90-days']),
          parseNum(item['inv-age-0-to-30-days']),
          parseNum(item['inv-age-31-to-60-days']),
          parseNum(item['inv-age-61-to-90-days']),
          parseNum(item['inv-age-181-to-330-days']),
          parseNum(item['inv-age-331-to-365-days']),
          parseNum(item['estimated-storage-cost-next-month']),
          parseNum(item['inbound-quantity']),
          parseNum(item['inbound-working']),
          parseNum(item['inbound-shipped']),
          parseNum(item['inbound-received']),
          item['no-sale-last-6-months'] ? 1 : 0,
          parseNum(item['Total Reserved Quantity']),
          parseNum(item['unfulfillable-quantity']),
          parseNum(item['quantity-to-be-charged-ais-181-210-days']),
          parseNum(item['estimated-ais-181-210-days']),
          parseNum(item['quantity-to-be-charged-ais-211-240-days']),
          parseNum(item['estimated-ais-211-240-days']),
          parseNum(item['quantity-to-be-charged-ais-241-270-days']),
          parseNum(item['estimated-ais-241-270-days']),
          parseNum(item['quantity-to-be-charged-ais-271-300-days']),
          parseNum(item['estimated-ais-271-300-days']),
          parseNum(item['quantity-to-be-charged-ais-301-330-days']),
          parseNum(item['estimated-ais-301-330-days']),
          parseNum(item['quantity-to-be-charged-ais-331-365-days']),
          parseNum(item['estimated-ais-331-365-days']),
          parseNum(item['quantity-to-be-charged-ais-366-455-days']),
          parseNum(item['estimated-ais-366-455-days']),
          parseNum(item['quantity-to-be-charged-ais-456-plus-days']),
          parseNum(item['estimated-ais-456-plus-days']),
          parseNum(item['historical-days-of-supply']),
          parseNum(item['fba-minimum-inventory-level']),
          item['fba-inventory-level-health-status'] || '',
          parseNum(item['Recommended ship-in quantity']),
          formatDate(item['Recommended ship-in date']),
          formatDate(item['Last updated date for Historical Days of Supply']),
          item['Exempted from Low-Inventory-Level fee?'] === 'Yes' ? 1 : 0,
          item['Low-Inventory-Level fee applied in current week?'] === 'Yes' ? 1 : 0,
          parseNum(item['Short term historical days of supply']),
          parseNum(item['Long term historical days of supply']),
          formatDate(item['Inventory age snapshot date']),
          parseNum(item['Inventory Supply at FBA']),
          parseNum(item['Reserved FC Transfer']),
          parseNum(item['Reserved FC Processing']),
          parseNum(item['Reserved Customer Order']),
          parseNum(item['Total Days of Supply (including units from open shipments)']),
          item.supplier || '',
          item['is-seasonal-in-next-3-months'] === 'Y' ? 1 : 0,
          item['season-name'] || '',
          formatDate(item['season-start-date']),
          formatDate(item['season-end-date']),
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
        SUM(sales_last_30_days) as total_sales_30_days,
        SUM(sales_last_60_days) as total_sales_60_days,
        SUM(sales_last_90_days) as total_sales_90_days,
        AVG(days_of_supply) as avg_days_supply,
        SUM(CASE WHEN days_of_supply < 20 AND days_of_supply > 0 AND sales_last_30_days > 0 THEN 1 ELSE 0 END) as out_of_stock_risk,
        SUM(CASE WHEN estimated_excess_quantity > 0 OR weeks_of_cover_t30 > 12 THEN 1 ELSE 0 END) as excess_risk,
        SUM(CASE WHEN (inv_age_181_to_270_days + inv_age_271_to_365_days + inv_age_456_plus_days) > 0 THEN 1 ELSE 0 END) as age_risk_count,
        SUM(estimated_excess_quantity) as total_excess_quantity,
        SUM(estimated_storage_cost_next_month) as total_storage_cost,
        SUM(CASE WHEN unfulfillable_quantity > 0 THEN 1 ELSE 0 END) as unfulfillable_count,
        SUM(CASE WHEN days_of_supply < 45 AND days_of_supply > 0 AND sales_last_30_days > 0 THEN 1 ELSE 0 END) as low_stock_count
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

  /**
   * 删除所有FBA库存数据
   * @returns {Promise<void>}
   */
  async deleteAll() {
    await this.execute('DELETE FROM amazon_fba_inventory');
  }
}

module.exports = new FBAInventoryModel();