const pool = require('../config/db.config');

/**
 * 数字安全转换
 */
const parseNum = (v) => {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return v;
  // 支持逗号分隔的数字字符串
  const str = String(v).replace(/,/g, '');
  const n = parseFloat(str);
  return isNaN(n) ? 0 : n;
};

/**
 * 日期安全解析
 */
const parseDate = (dateStr) => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
};

/**
 * 订单原始数据模型
 * 基于 amazon_order_items 表，存储所有上传的订单报告原始数据
 */
class OrderItemModel {
  constructor() {
    this.tableName = 'amazon_order_items';
  }

  /**
   * 获取连接
   */
  async getConnection() {
    return pool.getConnection();
  }

  /**
   * 执行查询
   */
  async query(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return rows;
  }

  /**
   * 批量插入订单明细
   * @param {Array} items 订单明细数据
   * @param {number} storeId 店铺ID
   * @param {string} uploadBatch 上传批次
   * @returns {Promise<Object>}
   */
  async bulkInsert(items, storeId, uploadBatch) {
    if (!items || items.length === 0) {
      return { inserted: 0 };
    }

    const connection = await this.getConnection();
    await connection.beginTransaction();

    try {
      const keys = [
        'store_id', 'upload_batch', 'amazon_order_id', 'merchant_order_id',
        'purchase_date', 'last_updated_date', 'order_status', 'fulfillment_channel',
        'sales_channel', 'order_channel', 'ship_service_level', 'product_name',
        'sku', 'asin', 'item_status', 'quantity', 'currency', 'item_price',
        'item_tax', 'shipping_price', 'shipping_tax', 'gift_wrap_price',
        'gift_wrap_tax', 'item_promotion_discount', 'ship_promotion_discount',
        'ship_city', 'ship_state', 'ship_postal_code', 'ship_country',
        'promotion_ids', 'is_business_order', 'purchase_order_number',
        'price_designation', 'order_item_id'
      ];

      const values = items.map((item) => {
        // 解析字段映射
        return [
          storeId,
          uploadBatch,
          item['amazon-order-id'] || item.amazon_order_id || '',
          item['merchant-order-id'] || item.merchant_order_id || '',
          parseDate(item['purchase-date'] || item.purchase_date),
          parseDate(item['last-updated-date'] || item.last_updated_date),
          item['order-status'] || item.order_status || '',
          item['fulfillment-channel'] || item.fulfillment_channel || '',
          item['sales-channel'] || item.sales_channel || '',
          item['order-channel'] || item.order_channel || '',
          item['ship-service-level'] || item.ship_service_level || '',
          item['product-name'] || item.product_name || '',
          item['sku'] || item.seller_sku || '',
          item['asin'] || item.asin || '',
          item['item-status'] || item.item_status || '',
          parseNum(item['quantity'] || item.quantity),
          item['currency'] || item.currency || '',
          parseNum(item['item-price'] || item.item_price),
          parseNum(item['item-tax'] || item.item_tax),
          parseNum(item['shipping-price'] || item.shipping_price),
          parseNum(item['shipping-tax'] || item.shipping_tax),
          parseNum(item['gift-wrap-price'] || item.gift_wrap_price),
          parseNum(item['gift-wrap-tax'] || item.gift_wrap_tax),
          parseNum(item['item-promotion-discount'] || item.item_promotion_discount),
          parseNum(item['ship-promotion-discount'] || item.ship_promotion_discount),
          item['ship-city'] || item.ship_city || '',
          item['ship-state'] || item.ship_state || '',
          item['ship-postal-code'] || item.ship_postal_code || '',
          item['ship-country'] || item.ship_country || '',
          item['promotion-ids'] || item.promotion_ids || '',
          item['is-business-order'] || item.is_business_order || 'false',
          item['purchase-order-number'] || item.purchase_order_number || '',
          item['price-designation'] || item.price_designation || '',
          item['order-item-id'] || item.order_item_id || `${item['amazon-order-id'] || ''}-${item['sku'] || ''}`
        ];
      });

      const placeholders = items.map(() => `(${keys.map(() => '?').join(', ')})`).join(', ');
      const flattenedValues = values.flat();
      const sql = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES ${placeholders}`;

      const [result] = await connection.execute(sql, flattenedValues);
      await connection.commit();

      return { inserted: result.affectedRows };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 按时间范围获取订单统计
   * @param {Object} options 查询选项
   * @returns {Promise<Object>}
   */
  async getStatsByDateRange(options = {}) {
    const {
      storeId = null,
      startDate = null,
      endDate = null,
      orderStatusExclude = ['Cancelled']
    } = options;

    let sql = `
      SELECT
        COUNT(DISTINCT amazon_order_id) as order_count,
        SUM(quantity) as units_sold,
        SUM(item_price - item_promotion_discount) as net_sales_amount,
        SUM(item_price) as gross_sales_amount,
        SUM(item_promotion_discount) as total_discount,
        MIN(purchase_date) as data_start_date,
        MAX(purchase_date) as data_end_date,
        COUNT(DISTINCT currency) as currency_count,
        COUNT(DISTINCT sales_channel) as channel_count
      FROM ${this.tableName}
      WHERE 1=1
    `;
    const params = [];

    if (storeId) {
      sql += ' AND store_id = ?';
      params.push(storeId);
    }

    if (startDate) {
      sql += ' AND purchase_date >= ?';
      params.push(new Date(startDate));
    }

    if (endDate) {
      sql += ' AND purchase_date <= ?';
      params.push(new Date(endDate));
    }

    if (orderStatusExclude && orderStatusExclude.length > 0) {
      sql += ` AND order_status NOT IN (${orderStatusExclude.map(() => '?').join(', ')})`;
      params.push(...orderStatusExclude);
    }

    const [stats] = await this.query(sql, params);
    return stats;
  }

  /**
   * 获取各状态订单统计
   * @param {Object} options 查询选项
   * @returns {Promise<Object>}
   */
  async getOrderStatusBreakdown(options = {}) {
    const {
      storeId = null,
      startDate = null,
      endDate = null
    } = options;

    let sql = `
      SELECT
        order_status,
        COUNT(DISTINCT amazon_order_id) as order_count,
        SUM(quantity) as units
      FROM ${this.tableName}
      WHERE 1=1
    `;
    const params = [];

    if (storeId) {
      sql += ' AND store_id = ?';
      params.push(storeId);
    }

    if (startDate) {
      sql += ' AND purchase_date >= ?';
      params.push(new Date(startDate));
    }

    if (endDate) {
      sql += ' AND purchase_date <= ?';
      params.push(new Date(endDate));
    }

    sql += ' GROUP BY order_status';

    return this.query(sql, params);
  }

  /**
   * 按 SKU 汇总销售数据
   * @param {Object} options 查询选项
   * @returns {Promise<Array>}
   */
  async getSkuSummary(options = {}) {
    const {
      storeId = null,
      startDate = null,
      endDate = null,
      orderStatusExclude = ['Cancelled'],
      page = 1,
      pageSize = 100
    } = options;

    let sql = `
      SELECT
        sku,
        product_name,
        asin,
        sales_channel,
        currency,
        COUNT(DISTINCT amazon_order_id) as order_count,
        SUM(quantity) as units_sold,
        SUM(item_price - item_promotion_discount) as net_sales_amount,
        SUM(item_price) as gross_sales_amount,
        SUM(item_promotion_discount) as total_discount,
        AVG(item_price) as avg_unit_price,
        MAX(purchase_date) as latest_purchase_date
      FROM ${this.tableName}
      WHERE sku IS NOT NULL AND sku != ''
    `;
    const params = [];

    if (storeId) {
      sql += ' AND store_id = ?';
      params.push(storeId);
    }

    if (startDate) {
      sql += ' AND purchase_date >= ?';
      params.push(new Date(startDate));
    }

    if (endDate) {
      sql += ' AND purchase_date <= ?';
      params.push(new Date(endDate));
    }

    if (orderStatusExclude && orderStatusExclude.length > 0) {
      sql += ` AND order_status NOT IN (${orderStatusExclude.map(() => '?').join(', ')})`;
      params.push(...orderStatusExclude);
    }

    sql += ' GROUP BY sku, product_name, asin, sales_channel, currency';
    sql += ' ORDER BY net_sales_amount DESC';

    // 分页
    const offset = (page - 1) * pageSize;
    sql += ` LIMIT ${pageSize} OFFSET ${offset}`;

    return this.query(sql, params);
  }

  /**
   * 按 SKU 统计订单数（不分页）
   * @param {Object} options 查询选项
   * @returns {Promise<number>}
   */
  async countSkuSummary(options = {}) {
    const {
      storeId = null,
      startDate = null,
      endDate = null,
      orderStatusExclude = ['Cancelled']
    } = options;

    let sql = `
      SELECT COUNT(DISTINCT sku) as total
      FROM ${this.tableName}
      WHERE sku IS NOT NULL AND sku != ''
    `;
    const params = [];

    if (storeId) {
      sql += ' AND store_id = ?';
      params.push(storeId);
    }

    if (startDate) {
      sql += ' AND purchase_date >= ?';
      params.push(new Date(startDate));
    }

    if (endDate) {
      sql += ' AND purchase_date <= ?';
      params.push(new Date(endDate));
    }

    if (orderStatusExclude && orderStatusExclude.length > 0) {
      sql += ` AND order_status NOT IN (${orderStatusExclude.map(() => '?').join(', ')})`;
      params.push(...orderStatusExclude);
    }

    const [result] = await this.query(sql, params);
    return result.total;
  }

  /**
   * 按 SKU 获取 Pending 和 Cancelled 数量
   * @param {string} sku
   * @param {Object} options 查询选项
   * @returns {Promise<Object>}
   */
  async getSkuStatusCounts(sku, options = {}) {
    const {
      storeId = null,
      startDate = null,
      endDate = null
    } = options;

    let sql = `
      SELECT
        SUM(CASE WHEN order_status = 'Pending' THEN quantity ELSE 0 END) as pending_units,
        SUM(CASE WHEN order_status = 'Cancelled' THEN quantity ELSE 0 END) as cancelled_units,
        COUNT(DISTINCT CASE WHEN order_status = 'Pending' THEN amazon_order_id END) as pending_orders,
        COUNT(DISTINCT CASE WHEN order_status = 'Cancelled' THEN amazon_order_id END) as cancelled_orders
      FROM ${this.tableName}
      WHERE sku = ?
    `;
    const params = [sku];

    if (storeId) {
      sql += ' AND store_id = ?';
      params.push(storeId);
    }

    if (startDate) {
      sql += ' AND purchase_date >= ?';
      params.push(new Date(startDate));
    }

    if (endDate) {
      sql += ' AND purchase_date <= ?';
      params.push(new Date(endDate));
    }

    const [result] = await this.query(sql, params);
    return result;
  }

  /**
   * 获取 SKU 的订单明细
   * @param {string} sku
   * @param {Object} options 查询选项
   * @returns {Promise<Array>}
   */
  async getSkuOrderDetails(sku, options = {}) {
    const {
      storeId = null,
      startDate = null,
      endDate = null,
      page = 1,
      pageSize = 50
    } = options;

    let sql = `
      SELECT
        amazon_order_id,
        purchase_date,
        order_status,
        sales_channel,
        sku,
        asin,
        product_name,
        quantity,
        currency,
        item_price,
        item_tax,
        shipping_price,
        item_promotion_discount,
        ship_city,
        ship_state,
        ship_country
      FROM ${this.tableName}
      WHERE sku = ?
    `;
    const params = [sku];

    if (storeId) {
      sql += ' AND store_id = ?';
      params.push(storeId);
    }

    if (startDate) {
      sql += ' AND purchase_date >= ?';
      params.push(new Date(startDate));
    }

    if (endDate) {
      sql += ' AND purchase_date <= ?';
      params.push(new Date(endDate));
    }

    sql += ' ORDER BY purchase_date DESC';

    const offset = (page - 1) * pageSize;
    sql += ` LIMIT ${pageSize} OFFSET ${offset}`;

    return this.query(sql, params);
  }

  /**
   * 按日期分组统计销售额
   * @param {Object} options 查询选项
   * @returns {Promise<Array>}
   */
  async getDailySalesTrend(options = {}) {
    const {
      storeId = null,
      startDate = null,
      endDate = null,
      groupBy = 'date' // date, currency, sales_channel
    } = options;

    let sql = `
      SELECT
        DATE(purchase_date) as date,
        currency,
        sales_channel,
        COUNT(DISTINCT amazon_order_id) as order_count,
        SUM(quantity) as units_sold,
        SUM(item_price - item_promotion_discount) as net_sales_amount
      FROM ${this.tableName}
      WHERE 1=1
    `;
    const params = [];

    if (storeId) {
      sql += ' AND store_id = ?';
      params.push(storeId);
    }

    if (startDate) {
      sql += ' AND purchase_date >= ?';
      params.push(new Date(startDate));
    }

    if (endDate) {
      sql += ' AND purchase_date <= ?';
      params.push(new Date(endDate));
    }

    sql += ` GROUP BY DATE(purchase_date), currency, sales_channel`;
    sql += ' ORDER BY date ASC';

    return this.query(sql, params);
  }

  /**
   * 按渠道/国家分组统计
   * @param {Object} options 查询选项
   * @returns {Promise<Array>}
   */
  async getChannelDistribution(options = {}) {
    const {
      storeId = null,
      startDate = null,
      endDate = null,
      groupBy = 'sales_channel' // sales_channel, ship_country
    } = options;

    let sql = `
      SELECT
        ${groupBy} as category,
        COUNT(DISTINCT amazon_order_id) as order_count,
        SUM(quantity) as units_sold,
        SUM(item_price - item_promotion_discount) as net_sales_amount
      FROM ${this.tableName}
      WHERE 1=1
    `;
    const params = [];

    if (storeId) {
      sql += ' AND store_id = ?';
      params.push(storeId);
    }

    if (startDate) {
      sql += ' AND purchase_date >= ?';
      params.push(new Date(startDate));
    }

    if (endDate) {
      sql += ' AND purchase_date <= ?';
      params.push(new Date(endDate));
    }

    sql += ` GROUP BY ${groupBy}`;
    sql += ' ORDER BY net_sales_amount DESC';

    return this.query(sql, params);
  }

  /**
   * 获取热门商品 Top N
   * @param {Object} options 查询选项
   * @param {number} limit 默认 10
   * @returns {Promise<Array>}
   */
  async getTopProducts(options = {}, limit = 10) {
    const {
      storeId = null,
      startDate = null,
      endDate = null,
      orderStatusExclude = ['Cancelled']
    } = options;

    let sql = `
      SELECT
        sku,
        product_name,
        asin,
        COUNT(DISTINCT amazon_order_id) as order_count,
        SUM(quantity) as units_sold,
        SUM(item_price - item_promotion_discount) as net_sales_amount
      FROM ${this.tableName}
      WHERE sku IS NOT NULL AND sku != ''
    `;
    const params = [];

    if (storeId) {
      sql += ' AND store_id = ?';
      params.push(storeId);
    }

    if (startDate) {
      sql += ' AND purchase_date >= ?';
      params.push(new Date(startDate));
    }

    if (endDate) {
      sql += ' AND purchase_date <= ?';
      params.push(new Date(endDate));
    }

    if (orderStatusExclude && orderStatusExclude.length > 0) {
      sql += ` AND order_status NOT IN (${orderStatusExclude.map(() => '?').join(', ')})`;
      params.push(...orderStatusExclude);
    }

    sql += ' GROUP BY sku, product_name, asin';
    sql += ` ORDER BY units_sold DESC LIMIT ${limit}`;

    return this.query(sql, params);
  }

  /**
   * 按币种分组统计销售额
   * @param {Object} options 查询选项
   * @returns {Promise<Array>}
   */
  async getCurrencyBreakdown(options = {}) {
    const {
      storeId = null,
      startDate = null,
      endDate = null
    } = options;

    let sql = `
      SELECT
        currency,
        COUNT(DISTINCT amazon_order_id) as order_count,
        SUM(quantity) as units_sold,
        SUM(item_price - item_promotion_discount) as net_sales_amount,
        SUM(item_price) as gross_sales_amount
      FROM ${this.tableName}
      WHERE currency IS NOT NULL AND currency != ''
    `;
    const params = [];

    if (storeId) {
      sql += ' AND store_id = ?';
      params.push(storeId);
    }

    if (startDate) {
      sql += ' AND purchase_date >= ?';
      params.push(new Date(startDate));
    }

    if (endDate) {
      sql += ' AND purchase_date <= ?';
      params.push(new Date(endDate));
    }

    sql += ' GROUP BY currency';
    sql += ' ORDER BY net_sales_amount DESC';

    return this.query(sql, params);
  }

  /**
   * 获取数据覆盖范围
   * @param {number} storeId
   * @returns {Promise<Object>}
   */
  async getDataCoverage(storeId = null) {
    let sql = `SELECT MIN(purchase_date) as start_date, MAX(purchase_date) as end_date FROM ${this.tableName}`;
    const params = [];

    if (storeId) {
      sql += ' WHERE store_id = ?';
      params.push(storeId);
    }

    const [result] = await this.query(sql, params);
    return result;
  }

  /**
   * 检查 SKU 是否存在
   * @param {string} sku
   * @param {number} storeId
   * @returns {Promise<boolean>}
   */
  async skuExists(sku, storeId = null) {
    let sql = `SELECT 1 FROM ${this.tableName} WHERE sku = ? LIMIT 1`;
    const params = [sku];

    if (storeId) {
      sql += ' AND store_id = ?';
      params.push(storeId);
    }

    const result = await this.query(sql, params);
    return result.length > 0;
  }

  /**
   * 按 SKU 获取多时间窗口销量统计
   * @param {Object} options 查询选项
   * @returns {Promise<Array>}
   */
  async getSkuMultiWindowSales(options = {}) {
    const {
      storeId = null,
      shopCode = null,
      endDate = null,
      orderStatusExclude = ['Cancelled']
    } = options;

    // 计算各时间窗口的起始日期
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const date1Day = new Date();
    date1Day.setHours(0, 0, 0, 0);

    const date3Days = new Date(end);
    date3Days.setDate(date3Days.getDate() - 2);

    const date7Days = new Date(end);
    date7Days.setDate(date7Days.getDate() - 6);

    const date14Days = new Date(end);
    date14Days.setDate(date14Days.getDate() - 13);

    const date30Days = new Date(end);
    date30Days.setDate(date30Days.getDate() - 29);

    let sql = `
      SELECT
        o.sku,
        o.product_name,
        o.asin,
        o.sales_channel,
        o.currency,
        MAX(o.purchase_date) as latest_purchase_date,
        MAX(o.purchase_date) as last_order_time
      FROM ${this.tableName} o
      LEFT JOIN shops s ON o.store_id = s.id
      WHERE o.sku IS NOT NULL AND o.sku != ''
    `;
    const params = [];

    if (storeId) {
      sql += ' AND o.store_id = ?';
      params.push(storeId);
    }

    // 店铺过滤（使用子查询避免LEFT JOIN + WHERE失效问题）
    if (shopCode) {
      console.log('[OrderItemModel getSkuMultiWindowSales] shopCode:', shopCode);
      sql += ' AND o.store_id IN (SELECT id FROM shops WHERE shop_code = ?)';
      params.push(shopCode);
    }

    if (orderStatusExclude && orderStatusExclude.length > 0) {
      sql += ` AND o.order_status NOT IN (${orderStatusExclude.map(() => '?').join(', ')})`;
      params.push(...orderStatusExclude);
    }

    sql += ' GROUP BY o.sku, o.product_name, o.asin, o.sales_channel, o.currency';
    sql += ' ORDER BY o.sku';

    const baseSkus = await this.query(sql, params);

    // 如果没有数据，返回空
    if (!baseSkus || baseSkus.length === 0) {
      return [];
    }

    // 为每个 SKU 计算各时间窗口的销量
    const skuList = [];
    for (const skuItem of baseSkus) {
      const skuParams = [skuItem.sku];
      let salesSql = `
        SELECT
          SUM(CASE WHEN purchase_date >= ? THEN quantity ELSE 0 END) as sales_1day,
          SUM(CASE WHEN purchase_date >= ? THEN quantity ELSE 0 END) as sales_3days,
          SUM(CASE WHEN purchase_date >= ? THEN quantity ELSE 0 END) as sales_7days,
          SUM(CASE WHEN purchase_date >= ? THEN quantity ELSE 0 END) as sales_14days,
          SUM(CASE WHEN purchase_date >= ? THEN quantity ELSE 0 END) as sales_30days,
          COUNT(DISTINCT CASE WHEN purchase_date >= ? THEN amazon_order_id END) as orders_1day,
          COUNT(DISTINCT CASE WHEN purchase_date >= ? THEN amazon_order_id END) as orders_3days,
          COUNT(DISTINCT CASE WHEN purchase_date >= ? THEN amazon_order_id END) as orders_7days,
          COUNT(DISTINCT CASE WHEN purchase_date >= ? THEN amazon_order_id END) as orders_14days,
          COUNT(DISTINCT CASE WHEN purchase_date >= ? THEN amazon_order_id END) as orders_30days
        FROM ${this.tableName}
        WHERE sku = ?
      `;

      if (storeId) {
        salesSql += ' AND store_id = ?';
        skuParams.push(storeId);
      }

      if (orderStatusExclude && orderStatusExclude.length > 0) {
        salesSql += ` AND order_status NOT IN (${orderStatusExclude.map(() => '?').join(', ')})`;
        skuParams.push(...orderStatusExclude);
      }

      // 1day, 3days, 7days, 14days, 30days 起始日期参数
      skuParams.unshift(
        date1Day.toISOString(), date3Days.toISOString(), date7Days.toISOString(), date14Days.toISOString(), date30Days.toISOString(),
        date1Day.toISOString(), date3Days.toISOString(), date7Days.toISOString(), date14Days.toISOString(), date30Days.toISOString()
      );

      const [salesResult] = await this.query(salesSql, skuParams);

      // 获取各状态数量
      let statusSql = `
        SELECT
          SUM(CASE WHEN order_status IN ('Pending', 'Unshipped', 'Shipping') THEN quantity ELSE 0 END) as pending_units,
          SUM(CASE WHEN order_status = 'Shipped' THEN quantity ELSE 0 END) as shipped_units,
          SUM(CASE WHEN order_status = 'Cancelled' THEN quantity ELSE 0 END) as cancelled_units,
          COUNT(DISTINCT CASE WHEN order_status IN ('Pending', 'Unshipped', 'Shipping') THEN amazon_order_id END) as pending_orders,
          COUNT(DISTINCT CASE WHEN order_status = 'Shipped' THEN amazon_order_id END) as shipped_orders,
          COUNT(DISTINCT CASE WHEN order_status = 'Cancelled' THEN amazon_order_id END) as cancelled_orders
        FROM ${this.tableName}
        WHERE sku = ?
      `;
      const statusParams = [skuItem.sku];

      if (storeId) {
        statusSql += ' AND store_id = ?';
        statusParams.push(storeId);
      }

      const [statusResult] = await this.query(statusSql, statusParams);

      // 组装结果
      skuList.push({
        ...skuItem,
        sales_1day: parseNum(salesResult.sales_1day),
        sales_3days: parseNum(salesResult.sales_3days),
        sales_7days: parseNum(salesResult.sales_7days),
        sales_14days: parseNum(salesResult.sales_14days),
        sales_30days: parseNum(salesResult.sales_30days),
        orders_1day: parseNum(salesResult.orders_1day),
        orders_3days: parseNum(salesResult.orders_3days),
        orders_7days: parseNum(salesResult.orders_7days),
        orders_14days: parseNum(salesResult.orders_14days),
        orders_30days: parseNum(salesResult.orders_30days),
        daily_avg_7days: parseNum(salesResult.sales_7days) / 7,
        pending_units: parseNum(statusResult.pending_units),
        shipped_units: parseNum(statusResult.shipped_units),
        cancelled_units: parseNum(statusResult.cancelled_units),
        pending_orders: parseNum(statusResult.pending_orders),
        shipped_orders: parseNum(statusResult.shipped_orders),
        cancelled_orders: parseNum(statusResult.cancelled_orders)
      });
    }

    return skuList;
  }

  /**
   * 获取补货辅助数据
   * @param {Object} options 查询选项
   * @returns {Promise<Object>}
   */
  async getReplenishmentAuxiliary(options = {}) {
    const {
      storeId = null,
      endDate = null,
      orderStatusExclude = ['Cancelled'],
      limit = 10
    } = options;

    // 计算各时间窗口的起始日期
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const date2Days = new Date(end);
    date2Days.setDate(date2Days.getDate() - 1);

    const date3Days = new Date(end);
    date3Days.setDate(date3Days.getDate() - 2);

    const date7Days = new Date(end);
    date7Days.setDate(date7Days.getDate() - 6);

    const date14Days = new Date(end);
    date14Days.setDate(date14Days.getDate() - 13);

    const date30Days = new Date(end);
    date30Days.setDate(date30Days.getDate() - 29);

    // 基础 SKU 列表
    let baseSql = `
      SELECT DISTINCT sku, product_name
      FROM ${this.tableName}
      WHERE sku IS NOT NULL AND sku != ''
    `;
    const baseParams = [];

    if (storeId) {
      baseSql += ' AND store_id = ?';
      baseParams.push(storeId);
    }

    if (orderStatusExclude && orderStatusExclude.length > 0) {
      baseSql += ` AND order_status NOT IN (${orderStatusExclude.map(() => '?').join(', ')})`;
      baseParams.push(...orderStatusExclude);
    }

    const baseSkus = await this.query(baseSql, baseParams);

    if (!baseSkus || baseSkus.length === 0) {
      return { highDemandSkus: [], risingSkus: [], stockOutRiskSkus: [] };
    }

    const highDemandSkus = [];
    const risingSkus = [];
    const stockOutRiskSkus = [];

    for (const skuItem of baseSkus) {
      const skuParams = [skuItem.sku];
      let sql = `
        SELECT
          SUM(CASE WHEN purchase_date >= ? THEN quantity ELSE 0 END) as sales_3days,
          SUM(CASE WHEN purchase_date >= ? THEN quantity ELSE 0 END) as sales_7days,
          SUM(CASE WHEN purchase_date >= ? THEN quantity ELSE 0 END) as sales_14days,
          SUM(CASE WHEN purchase_date >= ? THEN quantity ELSE 0 END) as sales_30days,
          MAX(purchase_date) as last_order_time
        FROM ${this.tableName}
        WHERE sku = ?
      `;

      if (storeId) {
        sql += ' AND store_id = ?';
        skuParams.push(storeId);
      }

      if (orderStatusExclude && orderStatusExclude.length > 0) {
        sql += ` AND order_status NOT IN (${orderStatusExclude.map(() => '?').join(', ')})`;
        skuParams.push(...orderStatusExclude);
      }

      skuParams.unshift(
        date3Days.toISOString(), date7Days.toISOString(), date14Days.toISOString(), date30Days.toISOString()
      );

      const [result] = await this.query(sql, skuParams);

      const sales3days = parseNum(result.sales_3days);
      const sales7days = parseNum(result.sales_7days);
      const sales14days = parseNum(result.sales_14days);
      const sales30days = parseNum(result.sales_30days);
      const lastOrderTime = result.last_order_time;

      const dailyAvg7days = sales7days / 7;
      const dailyAvg14days = sales14days / 14;

      // 计算增长率
      let growthRate = 0;
      if (dailyAvg14days > 0) {
        growthRate = (dailyAvg7days - dailyAvg14days) / dailyAvg14days;
      }

      // 判断是否近2天无订单
      const twoDaysAgo = new Date(date2Days);
      const isRecentNoOrder = lastOrderTime && new Date(lastOrderTime) < twoDaysAgo;

      // 高需求 SKU：按近7天销量排序 Top N
      if (sales7days > 0) {
        highDemandSkus.push({
          sku: skuItem.sku,
          product_name: skuItem.product_name,
          sales_3days: sales3days,
          sales_7days: sales7days,
          sales_30days: sales30days,
          daily_avg_7days: dailyAvg7days,
          last_order_time: lastOrderTime
        });
      }

      // 最近起量 SKU：按增长率排序
      if (sales3days > 0 && dailyAvg7days > 0) {
        const dailAvg3days = sales3days / 3;
        if (dailAvg3days > dailyAvg7days * 1.5) {
          risingSkus.push({
            sku: skuItem.sku,
            product_name: skuItem.product_name,
            sales_3days: sales3days,
            sales_7days: sales7days,
            sales_30days: sales30days,
            daily_avg_3days: dailAvg3days,
            daily_avg_7days: dailyAvg7days,
            growth_rate: growthRate,
            last_order_time: lastOrderTime
          });
        }
      }

      // 断单风险 SKU：近7天有销量，但近2天无订单
      if (sales7days > 0 && isRecentNoOrder) {
        stockOutRiskSkus.push({
          sku: skuItem.sku,
          product_name: skuItem.product_name,
          sales_3days: sales3days,
          sales_7days: sales7days,
          sales_30days: sales30days,
          last_order_time: lastOrderTime
        });
      }
    }

    // 排序
    highDemandSkus.sort((a, b) => b.sales_7days - a.sales_7days);
    risingSkus.sort((a, b) => b.growth_rate - a.growth_rate);
    stockOutRiskSkus.sort((a, b) => new Date(b.last_order_time) - new Date(a.last_order_time));

    return {
      highDemandSkus: highDemandSkus.slice(0, limit),
      risingSkus: risingSkus.slice(0, limit),
      stockOutRiskSkus: stockOutRiskSkus.slice(0, limit)
    };
  }

  /**
   * 计算 SKU 趋势标签
   * @param {Object} skuData SKU 销售数据
   * @returns {Object} { trend, label, type }
   */
  calculateSkuTrend(skuData) {
    const {
      sales_3days = 0,
      sales_7days = 0,
      sales_14days = 0,
      sales_30days = 0,
      last_order_time
    } = skuData;

    const dailyAvg3days = sales_3days / 3;
    const dailyAvg7days = sales_7days / 7;
    const dailyAvg14days = sales_14days / 14;

    // 断单风险：近7天有销量，但最近2天无订单
    if (sales_7days > 0 && last_order_time) {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 1);
      twoDaysAgo.setHours(0, 0, 0, 0);

      if (new Date(last_order_time) < twoDaysAgo) {
        return { trend: '断单风险', label: '断单风险', type: 'danger' };
      }
    }

    // 爆发增长：近3天日均 > 近7天日均 * 1.5
    if (sales_3days > 0 && dailyAvg3days > dailyAvg7days * 1.5) {
      return { trend: '爆发增长', label: '爆发增长', type: 'success' };
    }

    // 开始下滑：近7天日均 < 近14天日均 * 0.7
    if (dailyAvg7days < dailyAvg14days * 0.7 && sales_14days > 0) {
      return { trend: '开始下滑', label: '开始下滑', type: 'warning' };
    }

    // 长尾低频：近30天有销量，但近7天很低
    if (sales_30days > 0 && sales_7days <= 2) {
      return { trend: '长尾低频', label: '长尾低频', type: 'info' };
    }

    // 稳定热销：近7天和近14天都有销量，且波动不大
    if (sales_7days > 0 && sales_14days > 0) {
      const volatility = Math.abs(dailyAvg7days - dailyAvg14days) / dailyAvg14days;
      if (volatility < 0.3) {
        return { trend: '稳定热销', label: '稳定热销', type: 'primary' };
      }
    }

    // 无数据
    if (sales_30days === 0) {
      return { trend: '无销量', label: '无销量', type: 'info' };
    }

    // 默认
    return { trend: '常规', label: '常规', type: 'default' };
  }

  /**
   * 获取 SKU 详情扩展数据
   * @param {string} sku
   * @param {Object} options
   * @returns {Promise<Object>}
   */
  async getSkuDetailExtended(sku, options = {}) {
    const {
      storeId = null,
      endDate = null,
      orderStatusExclude = ['Cancelled']
    } = options;

    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const date7Days = new Date(end);
    date7Days.setDate(date7Days.getDate() - 6);

    const date30Days = new Date(end);
    date30Days.setDate(date30Days.getDate() - 29);

    // 近7天订单明细
    let orders7daysSql = `
      SELECT
        amazon_order_id,
        purchase_date,
        order_status,
        sales_channel,
        quantity,
        currency,
        item_price,
        item_promotion_discount,
        ship_country
      FROM ${this.tableName}
      WHERE sku = ? AND purchase_date >= ?
    `;
    const orders7daysParams = [sku, date7Days.toISOString()];

    if (storeId) {
      orders7daysSql += ' AND store_id = ?';
      orders7daysParams.push(storeId);
    }

    orders7daysSql += ' ORDER BY purchase_date DESC LIMIT 50';

    const orders7days = await this.query(orders7daysSql, orders7daysParams);

    // 近30天订单状态分布
    let statusDistSql = `
      SELECT
        order_status,
        COUNT(DISTINCT amazon_order_id) as order_count,
        SUM(quantity) as total_quantity
      FROM ${this.tableName}
      WHERE sku = ? AND purchase_date >= ?
    `;
    const statusDistParams = [sku, date30Days.toISOString()];

    if (storeId) {
      statusDistSql += ' AND store_id = ?';
      statusDistParams.push(storeId);
    }

    statusDistSql += ' GROUP BY order_status';

    const statusDistribution = await this.query(statusDistSql, statusDistParams);

    // 近30天站点分布
    let channelDistSql = `
      SELECT
        sales_channel,
        ship_country,
        COUNT(DISTINCT amazon_order_id) as order_count,
        SUM(quantity) as total_quantity,
        SUM(item_price - item_promotion_discount) as net_sales
      FROM ${this.tableName}
      WHERE sku = ? AND purchase_date >= ?
    `;
    const channelDistParams = [sku, date30Days.toISOString()];

    if (storeId) {
      channelDistSql += ' AND store_id = ?';
      channelDistParams.push(storeId);
    }

    channelDistSql += ' GROUP BY sales_channel, ship_country ORDER BY net_sales DESC';

    const channelDistribution = await this.query(channelDistSql, channelDistParams);

    // 汇总
    const summarySql = `
      SELECT
        SUM(CASE WHEN purchase_date >= ? THEN quantity ELSE 0 END) as sales_3days,
        SUM(CASE WHEN purchase_date >= ? THEN quantity ELSE 0 END) as sales_7days,
        SUM(CASE WHEN purchase_date >= ? THEN quantity ELSE 0 END) as sales_14days,
        SUM(CASE WHEN purchase_date >= ? THEN quantity ELSE 0 END) as sales_30days,
        MAX(purchase_date) as last_order_time
      FROM ${this.tableName}
      WHERE sku = ?
    `;
    const summaryParams = [sku];

    if (storeId) {
      summaryParams.push(storeId);
    }

    // Add date params in correct order
    const d3 = new Date(end);
    d3.setDate(d3.getDate() - 2);
    const d7 = new Date(end);
    d7.setDate(d7.getDate() - 6);
    const d14 = new Date(end);
    d14.setDate(d14.getDate() - 13);
    const d30 = new Date(end);
    d30.setDate(d30.getDate() - 29);

    summaryParams.unshift(d3.toISOString(), d7.toISOString(), d14.toISOString(), d30.toISOString());

    const [summary] = await this.query(summarySql, summaryParams);

    return {
      recent7daysOrders: orders7days,
      statusDistribution,
      channelDistribution,
      salesSummary: {
        sales_3days: parseNum(summary.sales_3days),
        sales_7days: parseNum(summary.sales_7days),
        sales_14days: parseNum(summary.sales_14days),
        sales_30days: parseNum(summary.sales_30days),
        last_order_time: summary.last_order_time
      }
    };
  }

  /**
   * 清空所有订单数据
   * @returns {Promise<Object>}
   */
  async deleteAll() {
    const result = await this.query('DELETE FROM amazon_order_items');
    return { affectedRows: result.affectedRows || 0 };
  }

  /**
   * 按SKU删除订单数据
   * @param {string} sku
   * @returns {Promise<boolean>}
   */
  async deleteBySku(sku) {
    const result = await this.query(
      'DELETE FROM amazon_order_items WHERE sku = ?',
      [sku]
    );
    return result.affectedRows > 0;
  }
}

module.exports = new OrderItemModel();