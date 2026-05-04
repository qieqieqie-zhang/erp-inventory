const BaseModel = require('./BaseModel');

/**
 * 亚马逊业务报告数据模型
 * 
 * 数据库表：amazon_business_report
 * 
 * 字段映射说明（中文表头 → 数据库字段名）：
 * - （父）ASIN → parent_asin
 * - （子）ASIN → child_asin
 * - 标题 → item_title
 * - SKU → seller_sku
 * - 会话数 - 总计 → sessions
 * - 会话 - 总计 - B2B → sessions_b2b
 * - 转化率 - 总计 → conversion_rate
 * - 会话百分比 - 总计 - B2B → session_percentage_b2b
 * - 页面浏览量 - 总计 → page_views
 * - 页面浏览量 - 总计 - B2B → page_views_b2b
 * - 页面浏览量百分比 - 总计 → page_views_percentage
 * - 页面浏览量百分比 - 总计 - B2B → page_views_percentage_b2b
 * - 推荐报价（推荐报价展示位）百分比 → recommended_offer_percentage
 * - 推荐报价（推荐报价展示位）百分比 - B2B → recommended_offer_percentage_b2b
 * - 已订购商品数量 → ordered_quantity
 * - 已订购商品数量 - B2B → ordered_quantity_b2b
 * - 商品会话百分比 → product_session_percentage
 * - 商品会话百分比 - B2B → product_session_percentage_b2b
 * - 已订购商品销售额 → sales_amount
 * - 已订购商品销售额 - B2B → sales_amount_b2b
 * - 订单商品总数 → total_order_items
 * - 订单商品总数 - B2B → total_order_items_b2b
 * 
 * 注意：上传文件时，文件解析器会自动处理中文表头映射到数据库字段
 * 数据转换规则包括去除千位分隔符、货币符号等
 */
class BusinessReportModel extends BaseModel {
  constructor() {
    super('amazon_business_report');
  }

  /**
   * 根据日期范围获取业务报告数据
   * @param {Object} options 
   * @returns {Promise<Array>}
   */
  async getReportsByDateRange(startDate, endDate, options = {}) {
    const {
      page = 1,
      pageSize = 20,
      orderBy = 'report_month',
      order = 'DESC',
      search = '',
      sku = '',
      shop_code = ''
    } = options;

    // 确保分页参数是整数
    const pageNum = parseInt(page, 10) || 1;
    const pageSizeNum = parseInt(pageSize, 10) || 20;

    let sql = `
      SELECT
        id,
        seller_sku as sku,
        item_title as title,
        parent_asin,
        child_asin,
        report_month as report_date,
        sessions,
        page_views,
        page_views_percentage,
        product_session_percentage,
        sales_amount / NULLIF(ordered_quantity, 0) as avg_unit_price,
        ordered_quantity,
        sales_amount,
        upload_batch,
        upload_time as created_at,
        -- B2B字段
        sessions_b2b,
        page_views_b2b,
        page_views_percentage_b2b,
        recommended_offer_percentage,
        recommended_offer_percentage_b2b,
        ordered_quantity_b2b,
        product_session_percentage_b2b,
        sales_amount_b2b,
        total_order_items,
        total_order_items_b2b
      FROM amazon_business_report
      WHERE report_month BETWEEN ? AND ?
    `;
    const params = [startDate, endDate];

    // 店铺过滤（使用子查询避免LEFT JOIN + WHERE失效问题）
    if (shop_code) {
      sql += ' AND seller_sku IN (SELECT pm.seller_sku FROM product_master pm WHERE pm.shop_id IN (SELECT id FROM shops WHERE shop_code = ?))';
      params.push(shop_code);
    }

    // 搜索条件
    if (search) {
      sql += ' AND (seller_sku LIKE ? OR item_title LIKE ? OR parent_asin LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (sku) {
      sql += ' AND seller_sku = ?';
      params.push(sku);
    }

    // 排序 - 只允许安全的列名
    const allowedOrderBy = ['report_month', 'report_date', 'sku', 'parent_asin', 'child_asin', 'sessions', 'page_views', 'page_views_percentage', 'product_session_percentage', 'avg_unit_price', 'ordered_quantity', 'sales_amount'];
    const safeOrderBy = allowedOrderBy.includes(orderBy) ? orderBy : 'report_month';
    const safeOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    sql += ` ORDER BY ${safeOrderBy} ${safeOrder}`;

    // 分页 - 直接拼接LIMIT值，因为MySQL2的占位符在LIMIT中有问题
    const offset = (pageNum - 1) * pageSizeNum;
    sql += ` LIMIT ${pageSizeNum} OFFSET ${offset}`;

    const rows = await this.query(sql, params);
    
    // 转换数据类型，确保数字字段是数字类型
    return rows.map(row => {
      const converted = { ...row };
      
      // 转换数字字段（只转换真正的数字字段）
      const numericFields = [
        'sessions', 'page_views', 'page_views_percentage',
        'product_session_percentage', 'avg_unit_price', 'ordered_quantity', 'sales_amount',
        'sessions_b2b', 'page_views_b2b', 'page_views_percentage_b2b',
        'recommended_offer_percentage', 'recommended_offer_percentage_b2b',
        'ordered_quantity_b2b', 'product_session_percentage_b2b', 'sales_amount_b2b',
        'total_order_items', 'total_order_items_b2b'
      ];
      
      numericFields.forEach(field => {
        if (converted[field] !== null && converted[field] !== undefined) {
          converted[field] = parseFloat(converted[field]) || 0;
        }
      });

      // 确保 sku 和 title 是字符串类型
      if (converted.sku !== undefined) {
        converted.sku = String(converted.sku || '');
      }
      if (converted.title !== undefined) {
        converted.title = String(converted.title || '');
      }

      // 计算页面浏览量占比（如果为空）
      if (converted.sessions > 0 && converted.page_views > 0) {
        converted.page_views_ratio = (converted.page_views / converted.sessions).toFixed(2);
      }

      // 平均单件售价
      if (converted.ordered_quantity > 0 && converted.sales_amount > 0) {
        converted.avg_unit_price = converted.sales_amount / converted.ordered_quantity;
      }
      
      return converted;
    });
  }

  /**
   * 统计日期范围内的报告数量
   * @param {string} startDate 
   * @param {string} endDate 
   * @returns {Promise<number>}
   */
  async countReportsByDateRange(startDate, endDate, filters = {}) {
    const { search = '', sku = '', shop_code = '' } = filters;

    let sql = `
      SELECT COUNT(*) as count FROM amazon_business_report
      WHERE report_month BETWEEN ? AND ?
    `;
    const params = [startDate, endDate];

    // 店铺过滤（使用子查询避免LEFT JOIN + WHERE失效问题）
    if (shop_code) {
      sql += ' AND seller_sku IN (SELECT pm.seller_sku FROM product_master pm WHERE pm.shop_id IN (SELECT id FROM shops WHERE shop_code = ?))';
      params.push(shop_code);
    }

    if (search) {
      sql += ' AND (seller_sku LIKE ? OR item_title LIKE ? OR parent_asin LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (sku) {
      sql += ' AND seller_sku = ?';
      params.push(sku);
    }

    const rows = await this.query(sql, params);
    return parseInt(rows[0].count);
  }

  /**
   * 获取报告统计摘要
   * @param {string} startDate
   * @param {string} endDate
   * @param {string} shopCode - 店铺代码过滤
   * @returns {Promise<Object>}
   */
  async getReportSummary(startDate, endDate, shopCode = '') {
    let sql = `
      SELECT
        COUNT(DISTINCT br.seller_sku) as total_skus,
        COUNT(*) as total_reports,
        SUM(br.sales_amount) as total_sales,
        SUM(br.ordered_quantity) as total_units,
        SUM(br.sessions) as total_sessions,
        SUM(br.page_views) as total_page_views,
        AVG(br.product_session_percentage) as avg_conversion_rate,
        SUM(br.sales_amount) / NULLIF(SUM(br.ordered_quantity), 0) as avg_unit_price,
        MIN(br.report_month) as first_report_date,
        MAX(br.report_month) as last_report_date
      FROM amazon_business_report br
    `;
    const params = [];

    // 店铺过滤（使用子查询避免LEFT JOIN + WHERE失效问题）
    if (shopCode) {
      sql += ` WHERE br.seller_sku IN (SELECT pm.seller_sku FROM product_master pm WHERE pm.shop_id IN (SELECT id FROM shops WHERE shop_code = ?)) AND br.report_month BETWEEN ? AND ?`;
      params.push(shopCode, startDate, endDate);
    } else {
      sql += ' WHERE br.report_month BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    const rows = await this.query(sql, params);
    const result = rows[0] || {};
    
    // 转换数据类型，确保数字字段是数字类型
    if (result.avg_conversion_rate) {
      result.avg_conversion_rate = parseFloat(result.avg_conversion_rate) || 0;
    }
    if (result.total_sales) {
      result.total_sales = parseFloat(result.total_sales) || 0;
    }
    if (result.avg_sales_per_order) {
      result.avg_sales_per_order = parseFloat(result.avg_sales_per_order) || 0;
    }
    
    return result;
  }

  /**
   * 按SKU分组统计
   * @param {string} startDate 
   * @param {string} endDate 
   * @returns {Promise<Array>}
   */
  async getSalesBySKU(startDate, endDate) {
    const sql = `
      SELECT 
        seller_sku,
        item_title,
        SUM(sales_amount) as total_sales,
        SUM(ordered_quantity) as total_units,
        AVG(conversion_rate) as avg_conversion_rate
      FROM amazon_business_report 
      WHERE report_month BETWEEN ? AND ?
      GROUP BY seller_sku, item_title
      ORDER BY total_sales DESC
      LIMIT 20
    `;
    return this.query(sql, [startDate, endDate]);
  }

  /**
   * 按月份获取销售趋势
   * @param {string} startDate 
   * @param {string} endDate 
   * @returns {Promise<Array>}
   */
  async getSalesTrend(startDate, endDate) {
    const sql = `
      SELECT 
        DATE_FORMAT(report_month, '%Y-%m') as date,
        SUM(sales_amount) as daily_sales,
        SUM(ordered_quantity) as daily_orders,
        COUNT(DISTINCT seller_sku) as sku_count
      FROM amazon_business_report 
      WHERE report_month BETWEEN ? AND ?
      GROUP BY DATE_FORMAT(report_month, '%Y-%m')
      ORDER BY date ASC
    `;
    const rows = await this.query(sql, [startDate, endDate]);
    
    // 转换数据类型
    return rows.map(row => ({
      ...row,
      daily_sales: parseFloat(row.daily_sales) || 0,
      daily_orders: parseInt(row.daily_orders) || 0,
      sku_count: parseInt(row.sku_count) || 0
    }));
  }

  /**
   * 上传业务报告数据
   * @param {Array} reports 
   * @returns {Promise<Object>}
   */
  async batchInsert(reports) {
    if (!reports.length) {
      return { success: [], inserted: 0, updated: 0, errors: [] };
    }

    const errors = [];
    const insertedReports = [];
    
    for (const report of reports) {
      try {
        // 检查报告是否已存在（基于SKU和月份）
        const existing = await this.query(
          'SELECT id FROM amazon_business_report WHERE seller_sku = ? AND report_month = ?',
          [report.seller_sku, report.report_month]
        );
        
        if (existing.length > 0) {
          // 更新现有报告
          await this.update(existing[0].id, report);
          insertedReports.push({ ...report, action: 'updated' });
        } else {
          // 插入新报告
          await this.create(report);
          insertedReports.push({ ...report, action: 'inserted' });
        }
      } catch (error) {
        errors.push({
          seller_sku: report.seller_sku,
          report_month: report.report_month,
          error: error.message
        });
      }
    }
    
    const updatedCount = insertedReports.filter(r => r.action === 'updated').length;
    
    return {
      success: insertedReports,
      inserted: insertedReports.length,
      updated: updatedCount,
      errors
    };
  }

  /**
   * 获取热门商品
   * @param {string} startDate
   * @param {string} endDate
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  async getTopProducts(startDate, endDate, limit = 10) {
    const sql = `
      SELECT
        seller_sku,
        item_title,
        SUM(sales_amount) as total_sales,
        SUM(ordered_quantity) as total_units,
        AVG(conversion_rate) as avg_conversion_rate,
        SUM(sessions) as total_sessions,
        SUM(page_views) as total_page_views
      FROM amazon_business_report
      WHERE report_month BETWEEN ? AND ?
      GROUP BY seller_sku, item_title
      ORDER BY total_sales DESC
      LIMIT ?
    `;
    return this.query(sql, [startDate, endDate, limit]);
  }

  /**
   * 按站点获取销售统计
   * @param {string} startDate
   * @param {string} endDate
   * @returns {Promise<Array>}
   */
  async getSalesBySite(startDate, endDate) {
    const sql = `
      SELECT
        seller_sku as site,
        SUM(sales_amount) as total_sales,
        SUM(ordered_quantity) as total_orders,
        SUM(page_views) as total_page_views,
        SUM(sessions) as total_sessions,
        COUNT(*) as report_count
      FROM amazon_business_report
      WHERE report_month BETWEEN ? AND ?
      GROUP BY seller_sku
      ORDER BY total_sales DESC
      LIMIT 10
    `;
    const rows = await this.query(sql, [startDate, endDate]);
    
    // 转换数据类型
    return rows.map(row => ({
      ...row,
      total_sales: parseFloat(row.total_sales) || 0,
      total_orders: parseInt(row.total_orders) || 0,
      total_page_views: parseInt(row.total_page_views) || 0,
      total_sessions: parseInt(row.total_sessions) || 0,
      report_count: parseInt(row.report_count) || 0
    }));
  }

  /**
   * 删除业务报告（按ID）
   * @param {number} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    const result = await this.query(
      'DELETE FROM amazon_business_report WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  /**
   * 清空所有业务报告数据
   * @returns {Promise<Object>}
   */
  async deleteAll() {
    const result = await this.query('DELETE FROM amazon_business_report');
    return { affectedRows: result.affectedRows || 0 };
  }
}

module.exports = new BusinessReportModel();