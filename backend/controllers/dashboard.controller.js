const pool = require('../config/db.config');

/**
 * 数据看板控制器
 */
const dashboardController = {
  /**
   * 获取看板统计数据
   */
  async getStats(req, res) {
    try {
      const { shop_id } = req.query;

      // 构建店铺筛选条件
      let shopCondition = '';
      let shopParams = [];
      if (shop_id) {
        shopCondition = 'AND store_id = ?';
        shopParams = [shop_id];
      }

      // 1. 商品统计
      const [products] = await pool.execute(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
          SUM(quantity) as total_quantity,
          SUM(CASE WHEN status = 'out_of_stock' THEN 1 ELSE 0 END) as out_of_stock
        FROM product_master
        WHERE 1=1 ${shopCondition}`,
        shopParams
      );

      // 2. FBA库存统计
      const [fba] = await pool.execute(
        `SELECT
          SUM(available_quantity) as available,
          SUM(unavailable_quantity) as reserved,
          SUM(inbound_quantity) as inbound
        FROM amazon_fba_inventory
        WHERE 1=1 ${shopCondition}`,
        shopParams
      );

      // 3. 订单统计（近7天和30天）- 使用 amazon_order_items
      const [orders7d] = await pool.execute(
        `SELECT
          COUNT(DISTINCT amazon_order_id) as order_count,
          SUM(item_price - item_promotion_discount) as total_amount
        FROM amazon_order_items
        WHERE purchase_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        AND order_status != 'Cancelled'
        ${shop_id ? 'AND store_id = ?' : ''}`,
        shopParams
      );

      const [orders30d] = await pool.execute(
        `SELECT
          COUNT(DISTINCT amazon_order_id) as order_count,
          SUM(item_price - item_promotion_discount) as total_amount
        FROM amazon_order_items
        WHERE purchase_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        AND order_status != 'Cancelled'
        ${shop_id ? 'AND store_id = ?' : ''}`,
        shopParams
      );

      // 4. 库存预警（低库存和零库存）
      const [alerts] = await pool.execute(
        `SELECT COUNT(*) as alert_count
        FROM product_master
        WHERE (quantity <= 10 AND quantity > 0) OR quantity = 0
        ${shopCondition}`,
        shopParams
      );

      // 5. 店铺统计
      const [shops] = await pool.execute(
        'SELECT COUNT(*) as total, SUM(CASE WHEN status = "active" THEN 1 ELSE 0 END) as active FROM shops'
      );

      const stats = {
        // 商品统计
        totalProducts: products[0].total || 0,
        activeProducts: products[0].active || 0,
        outOfStockProducts: products[0].out_of_stock || 0,

        // FBA库存
        fbaAvailable: fba[0].available || 0,
        fbaReserved: fba[0].reserved || 0,
        fbaInbound: fba[0].inbound || 0,

        // 销售统计
        sales7d: orders7d[0].order_count || 0,
        salesAmount7d: orders7d[0].total_amount || 0,
        sales30d: orders30d[0].order_count || 0,
        salesAmount30d: orders30d[0].total_amount || 0,

        // 预警
        alertsCount: alerts[0].alert_count || 0,

        // 店铺
        totalShops: shops[0].total || 0,
        activeShops: shops[0].active || 0
      };

      res.json({
        code: 200,
        message: '获取成功',
        data: stats
      });
    } catch (error) {
      console.error('获取看板统计数据失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取统计数据失败',
        data: null
      });
    }
  },

  /**
   * 获取销量TOP10商品
   */
  async getTopProducts(req, res) {
    try {
      const { shop_id, period = '7d' } = req.query;
      const days = period === '7d' ? 7 : 30;

      let shopCondition = '';
      let shopParams = [];
      if (shop_id) {
        shopCondition = 'AND store_id = ?';
        shopParams = [shop_id];
      }

      const [products] = await pool.execute(
        `SELECT
          p.seller_sku as sku,
          p.item_name as name,
          COALESCE(SUM(o.quantity), 0) as sales,
          COALESCE(SUM(o.item_price - o.item_promotion_discount), 0) as amount
        FROM product_master p
        LEFT JOIN amazon_order_items o ON o.sku = p.seller_sku
          AND o.purchase_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
          AND o.order_status != 'Cancelled'
        WHERE 1=1 ${shopCondition}
        GROUP BY p.seller_sku, p.item_name
        ORDER BY sales DESC
        LIMIT 10`,
        [days, ...shopParams]
      );

      res.json({
        code: 200,
        message: '获取成功',
        data: products
      });
    } catch (error) {
      console.error('获取销量TOP10失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取销量TOP10失败',
        data: null
      });
    }
  },

  /**
   * 获取库存预警
   */
  async getAlerts(req, res) {
    try {
      const { shop_id } = req.query;

      let shopCondition = '';
      let shopParams = [];
      if (shop_id) {
        shopCondition = 'AND shop_id = ?';
        shopParams = [shop_id];
      }

      const [alerts] = await pool.execute(
        `SELECT
          seller_sku as sku,
          item_name as name,
          quantity,
          CASE
            WHEN quantity = 0 THEN 'zero'
            WHEN quantity <= 10 THEN 'low'
            ELSE 'excess'
          END as type,
          CASE
            WHEN quantity = 0 THEN '库存已售罄'
            WHEN quantity <= 10 THEN CONCAT('库存可供天数仅剩', GREATEST(1, quantity), '天')
            ELSE '库存积压超过100件'
          END as description
        FROM product_master
        WHERE (quantity <= 10 AND quantity > 0) OR quantity = 0
        ${shopCondition}
        LIMIT 20`,
        shopParams
      );

      res.json({
        code: 200,
        message: '获取成功',
        data: alerts
      });
    } catch (error) {
      console.error('获取库存预警失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取库存预警失败',
        data: null
      });
    }
  },

  /**
   * 获取最近上传记录
   */
  async getRecentUploads(req, res) {
    try {
      const [logs] = await pool.execute(
        `SELECT
          id,
          filename,
          module,
          success_count as successCount,
          fail_count as failCount,
          upload_time as uploadTime
        FROM system_upload_logs
        ORDER BY upload_time DESC
        LIMIT 10`
      );

      res.json({
        code: 200,
        message: '获取成功',
        data: logs
      });
    } catch (error) {
      console.error('获取最近上传记录失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取最近上传记录失败',
        data: null
      });
    }
  }
};

module.exports = dashboardController;