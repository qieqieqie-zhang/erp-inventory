const BaseModel = require('./BaseModel');

class OrderModel extends BaseModel {
  constructor() {
    super('amazon_orders');
  }

  /**
   * 根据订单ID（亚马逊订单号）查找订单详情
   * @param {string} orderId 
   * @returns {Promise<Object|null>}
   */
  async findById(orderId) {
    const rows = await this.query(
      'SELECT * FROM amazon_orders WHERE order_id = ? LIMIT 1',
      [orderId]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * 批量插入订单数据（按维度）
   * @param {Array} orders 
   * @param {string} dimension 
   * @param {string} uploadBatch 
   * @returns {Promise<Object>}
   */
  async bulkUpsert(orders, dimension, uploadBatch) {
    if (orders.length === 0) {
      return { inserted: 0, updated: 0 };
    }

    // 开始事务
    const connection = await this.pool.getConnection();
    await connection.beginTransaction();

    try {
      // 删除该维度的现有数据
      await connection.execute(
        'DELETE FROM amazon_orders WHERE dimension = ?',
        [dimension]
      );

      // 批量插入新数据
      const keys = [
        'order_item_id', 'dimension', 'seller_sku', 'item_name', 'order_id',
        'merchant_order_id', 'order_status', 'purchase_date', 'last_updated_date',
        'fulfillment_channel', 'ship_service_level', 'asin', 'item_status',
        'quantity_purchased', 'item_price', 'item_tax', 'shipping_price',
        'shipping_tax', 'gift_wrap_price', 'gift_wrap_tax', 'item_promotion_discount',
        'ship_promotion_discount', 'total_amount', 'currency', 'ship_city',
        'ship_state', 'ship_postal_code', 'ship_country', 'marketplace',
        'promotion_ids', 'is_business_order', 'purchase_order_number',
        'price_designation', 'buyer_name', 'buyer_phone', 'image_url', 'upload_batch'
      ];

      const values = orders.map((order, index) => {
        try {
          const itemPrice = parseFloat(order['item-price'] || order.item_price || 0);
          const quantity = parseInt(order['quantity'] || order['quantity-purchased'] || order.quantity_purchased || 0);
          const totalAmount = itemPrice * quantity;
          const sku = order['sku'] || order['seller-sku'] || order.seller_sku || '';
          const orderId = order['amazon-order-id'] || order['order-id'] || order.order_id || '';
          const orderItemId = order['order-item-id'] || order.order_item_id || `${orderId}-${sku}`;
          const orderStatus = order['order-status'] || order.order_status || '';
          const marketplace = order['sales-channel'] || order.marketplace || '';
          
          // 日期处理函数
          const parseDate = (dateStr) => {
            if (!dateStr) return null;
            const date = new Date(dateStr);
            return isNaN(date.getTime()) ? null : date;
          };

          return [
            orderItemId,
            dimension,
            sku,
            order['product-name'] || order['item-name'] || order.item_name || '',
            orderId,
            order['merchant-order-id'] || order.merchant_order_id || '',
            orderStatus,
            parseDate(order['purchase-date'] || order.purchase_date),
            parseDate(order['last-updated-date'] || order.last_updated_date),
            order['fulfillment-channel'] || order.fulfillment_channel || '',
            order['ship-service-level'] || order.ship_service_level || '',
            order['asin'] || order.asin || '',
            order['item-status'] || order.item_status || '',
            quantity,
            itemPrice,
            parseFloat(order['item-tax'] || order.item_tax || 0),
            parseFloat(order['shipping-price'] || order.shipping_price || 0),
            parseFloat(order['shipping-tax'] || order.shipping_tax || 0),
            parseFloat(order['gift-wrap-price'] || order.gift_wrap_price || 0),
            parseFloat(order['gift-wrap-tax'] || order.gift_wrap_tax || 0),
            parseFloat(order['item-promotion-discount'] || order.item_promotion_discount || 0),
            parseFloat(order['ship-promotion-discount'] || order.ship_promotion_discount || 0),
            totalAmount,
            order.currency || '',
            order['ship-city'] || order.ship_city || '',
            order['ship-state'] || order.ship_state || '',
            order['ship-postal-code'] || order.ship_postal_code || '',
            order['ship-country'] || order.ship_country || '',
            marketplace,
            order['promotion-ids'] || order.promotion_ids || '',
            order['is-business-order'] || order.is_business_order || 'false',
            order['purchase-order-number'] || order.purchase_order_number || '',
            order['price-designation'] || order.price_designation || '',
            order['buyer-name'] || order.buyer_name || '',
            order['buyer-phone'] || order.buyer_phone || '',
            order['image-url'] || order.image_url || '',
            uploadBatch
          ];
        } catch (e) {
          console.error(`[OrderModel] 映射第 ${index + 1} 行数据失败:`, e);
          throw e;
        }
      });

      const placeholders = orders.map(() => 
        `(${keys.map(() => '?').join(', ')})`
      ).join(', ');

      const flattenedValues = values.flat();
      const sql = `INSERT INTO amazon_orders (${keys.join(', ')}) VALUES ${placeholders}`;
      
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
   * 获取订单列表（按维度）
   * @param {string} dimension 
   * @param {Object} options 
   * @returns {Promise<Array>}
   */
  async getOrderList(dimension, options = {}) {
    const {
      page = 1,
      pageSize = 20,
      search = '',
      country = '',
      startDate = null,
      endDate = null,
      minQuantity = null,
      maxQuantity = null,
      minAmount = null,
      maxAmount = null
    } = options;

    let sql = 'SELECT * FROM amazon_orders WHERE 1=1';
    const params = [];

    // 时间维度过滤
    if (dimension) {
      sql += ' AND dimension = ?';
      params.push(dimension);
    }

    // 搜索条件
    if (search) {
      sql += ' AND (order_id LIKE ? OR seller_sku LIKE ? OR item_name LIKE ? OR buyer_name LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // 国家过滤
    if (country) {
      sql += ' AND ship_country = ?';
      params.push(country);
    }

    // 日期范围过滤
    if (startDate) {
      sql += ' AND purchase_date >= ?';
      const start = new Date(startDate);
      params.push(start);
      console.log(`[OrderModel] startDate param: ${start.toISOString()}`);
    }

    if (endDate) {
      sql += ' AND purchase_date <= ?';
      const end = new Date(endDate);
      params.push(end);
      console.log(`[OrderModel] endDate param: ${end.toISOString()}`);
    }

    // 数量范围过滤
    if (minQuantity !== null) {
      sql += ' AND quantity_purchased >= ?';
      params.push(minQuantity);
    }

    if (maxQuantity !== null) {
      sql += ' AND quantity_purchased <= ?';
      params.push(maxQuantity);
    }

    // 金额范围过滤
    if (minAmount !== null) {
      sql += ' AND total_amount >= ?';
      params.push(minAmount);
    }

    if (maxAmount !== null) {
      sql += ' AND total_amount <= ?';
      params.push(maxAmount);
    }

    // 排序
    sql += ' ORDER BY purchase_date DESC';

    // 分页 - 直接拼接LIMIT值，因为MySQL2的占位符在LIMIT中有问题
    const offset = (page - 1) * pageSize;
    sql += ` LIMIT ${pageSize} OFFSET ${offset}`;

    return this.query(sql, params);
  }

  /**
   * 统计订单数量
   * @param {string} dimension 
   * @param {Object} filters 
   * @returns {Promise<number>}
   */
  async countOrders(dimension, filters = {}) {
    const { search = '', country = '', startDate = null, endDate = null } = filters;
    
    let sql = 'SELECT COUNT(*) as count FROM amazon_orders WHERE 1=1';
    const params = [];

    // 时间维度过滤
    if (dimension) {
      sql += ' AND dimension = ?';
      params.push(dimension);
    }

    if (search) {
      sql += ' AND (order_id LIKE ? OR seller_sku LIKE ? OR item_name LIKE ? OR buyer_name LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (country) {
      sql += ' AND ship_country = ?';
      params.push(country);
    }

    if (startDate) {
      sql += ' AND purchase_date >= ?';
      params.push(new Date(startDate));
    }

    if (endDate) {
      sql += ' AND purchase_date <= ?';
      params.push(new Date(endDate));
    }

    const rows = await this.query(sql, params);
    return parseInt(rows[0].count);
  }

  /**
   * 获取订单销量汇总（按SKU）
   * @param {string} dimension 
   * @returns {Promise<Array>}
   */
  async getSalesSummary(dimension) {
    return this.query(`
      SELECT 
        seller_sku,
        item_name,
        SUM(quantity_purchased) as total_quantity,
        SUM(total_amount) as total_amount,
        AVG(item_price) as avg_price,
        COUNT(DISTINCT order_id) as order_count,
        COUNT(*) as item_count
      FROM amazon_orders 
      WHERE dimension = ?
      GROUP BY seller_sku, item_name
      ORDER BY total_quantity DESC, total_amount DESC
    `, [dimension]);
  }

  /**
   * 获取订单统计信息
   * @param {string} dimension 
   * @returns {Promise<Object>}
   */
  async getOrderStats(dimension) {
    const [stats] = await this.query(`
      SELECT 
        COUNT(*) as total_orders,
        COUNT(DISTINCT order_id) as unique_orders,
        SUM(quantity_purchased) as total_quantity,
        SUM(total_amount) as total_amount,
        AVG(total_amount) as avg_order_value,
        MIN(purchase_date) as first_order_date,
        MAX(purchase_date) as last_order_date,
        COUNT(DISTINCT ship_country) as country_count,
        COUNT(DISTINCT buyer_name) as buyer_count
      FROM amazon_orders 
      WHERE dimension = ?
    `, [dimension]);

    return stats;
  }

  /**
   * 获取国家分布
   * @param {string} dimension 
   * @returns {Promise<Array>}
   */
  async getCountryDistribution(dimension) {
    return this.query(`
      SELECT 
        ship_country as country,
        COUNT(*) as order_count,
        SUM(quantity_purchased) as total_quantity,
        SUM(total_amount) as total_amount
      FROM amazon_orders 
      WHERE dimension = ?
      GROUP BY ship_country
      ORDER BY total_amount DESC
    `, [dimension]);
  }
}

module.exports = new OrderModel();