/**
 * 经营驾驶舱控制器
 * 聚合多个模块数据，为领导提供经营总览
 */
const OrderItemModel = require('../models/OrderItemModel');
const BusinessReportModel = require('../models/BusinessReportModel');
const FBAInventoryModel = require('../models/FBAInventoryModel');
const FBAReservedModel = require('../models/FBAReservedModel');
const LogisticsModel = require('../models/LogisticsModel');
const ProductModel = require('../models/ProductModel');

/**
 * 计算日期范围
 */
const getDateRange = (days) => {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  return { start, end };
};

/**
 * 数字安全转换
 */
const parseNum = (v) => {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return v;
  return parseFloat(String(v).replace(/,/g, '')) || 0;
};

/**
 * 补货建议计算
 * @param {Object} item - SKU数据对象
 * @param {Object} options - { onlyLogistics: boolean } 表示是否只有物流数据
 */
const calculateReplenishment = (item, options = {}) => {
  const { onlyLogistics = false } = options;
  const available = item.available_quantity ?? 0;
  const daysOfSupply = item.days_of_supply;
  const inTransitQty = item.in_transit_quantity || 0;
  const sales7days = item.sales_7days || 0;

  // 只有物流数据，无库存和订单时
  if (onlyLogistics) {
    return { suggestion: '无法判断', suggestionType: 'info' };
  }

  // 没有库存数据时
  if (daysOfSupply === null || daysOfSupply === undefined) {
    return { suggestion: '无法判断', suggestionType: 'info' };
  }

  if (available === 0 && inTransitQty === 0) {
    return { suggestion: '立即补货', suggestionType: 'danger' };
  }

  if (daysOfSupply < 7) {
    if (inTransitQty > 0) {
      return { suggestion: '观察在途', suggestionType: 'warning' };
    }
    return { suggestion: '立即补货', suggestionType: 'danger' };
  }

  if (daysOfSupply > 45 && sales7days < 5) {
    return { suggestion: '控制补货', suggestionType: 'info' };
  }

  return { suggestion: '暂不补货', suggestionType: 'success' };
};

/**
 * 风险标签计算
 * @param {Object} item - SKU数据对象
 * @param {Object} options - { onlyLogistics: boolean } 表示是否只有物流数据
 */
const calculateRiskTag = (item, options = {}) => {
  const { onlyLogistics = false } = options;
  const available = item.available_quantity ?? 0;
  const daysOfSupply = item.days_of_supply;
  const inTransitQty = item.in_transit_quantity || 0;
  const sessions = item.sessions || 0;
  const conversion = item.product_session_percentage || 0;
  const globalAvgSessions = item.avgSessions || 0;
  const globalAvgConversion = item.avgConversion || 0;

  // 只有物流数据
  if (onlyLogistics) {
    return { tag: '仅物流数据', tagType: 'info' };
  }

  // 没有库存数据时
  if (daysOfSupply === null || daysOfSupply === undefined) {
    return { tag: '数据缺失', tagType: 'info' };
  }

  // 断货风险
  if (daysOfSupply < 7 && available > 0 && inTransitQty === 0) {
    return { tag: '高断货风险', tagType: 'danger' };
  }

  // 在途可缓解
  if (daysOfSupply < 7 && inTransitQty > 0) {
    return { tag: '在途可缓解', tagType: 'warning' };
  }

  // 高流量低转化
  if (sessions > globalAvgSessions && conversion < globalAvgConversion && sessions > 0) {
    return { tag: '高流量低转化', tagType: 'warning' };
  }

  // 过剩风险
  if (daysOfSupply > 60 && item.sales_7days < 3) {
    return { tag: '过剩风险', tagType: 'info' };
  }

  // 库存健康
  if (daysOfSupply >= 7 && daysOfSupply <= 45) {
    return { tag: '库存健康', tagType: 'success' };
  }

  return { tag: '常规', tagType: 'info' };
};

/**
 * 计算附加风险标签
 */
const calculateExtraRiskTags = (item) => {
  const extraTags = [];
  const sales1day = item.sales_1day || 0;
  const sales3days = item.sales_3days || 0;
  const sales7days = item.sales_7days || 0;
  const avgDaily7days = sales7days / 7;

  // 近期起量: 近1天销量 > 0 且 近3天销量明显高于近7天平均节奏
  if (sales1day > 0 && avgDaily7days > 0 && sales3days > avgDaily7days * 2.5) {
    extraTags.push({ tag: '近期起量', tagType: 'success' });
  }

  // 近期断单风险: 近7天销量 > 0 但近1天销量 = 0 且近3天销量偏低
  if (sales7days > 0 && sales1day === 0 && sales3days < avgDaily7days * 0.5) {
    extraTags.push({ tag: '近期断单风险', tagType: 'warning' });
  }

  return extraTags;
};

const cockpitController = {
  /**
   * 获取经营驾驶舱总览数据
   * 这是一个聚合接口，整合订单、业务报告、FBA库存、物流数据
   */
  async getOverview(req, res) {
    try {
      const { shop_id = '', time_range = '7' } = req.query;
      const days = parseInt(time_range) || 7;

      // 1. 获取近N天订单汇总
      const { start: periodStart, end: periodEnd } = getDateRange(days);
      const { start: monthStart, end: monthEnd } = getDateRange(30);

      const orderOptions = {
        storeId: shop_id ? parseInt(shop_id) : null,
        endDate: periodEnd
      };

      // 使用 getSkuMultiWindowSales 获取多窗口数据
      const skuSalesData = await OrderItemModel.getSkuMultiWindowSales(orderOptions);

      // 汇总近1天、近3天、近7天销量
      let units1d = 0, units3d = 0, units7d = 0;
      let sales1d = 0, sales3d = 0, sales7d = 0;
      let orders1d = 0, orders3d = 0, orders7d = 0;

      skuSalesData.forEach(item => {
        units1d += item.sales_1day || 0;
        units3d += item.sales_3days || 0;
        units7d += item.sales_7days || 0;
        orders1d += item.orders_1day || 0;
        orders3d += item.orders_3days || 0;
        orders7d += item.orders_7days || 0;
      });

      // 近30天订单统计
      const monthOptions = { ...orderOptions, startDate: monthStart, endDate: monthEnd };
      const monthStats = await OrderItemModel.getStatsByDateRange(monthOptions);

      // 2. 获取业务报告汇总（会话数、转化率）
      const businessSummary = await BusinessReportModel.getReportSummary(
        monthStart.toISOString().split('T')[0],
        monthEnd.toISOString().split('T')[0]
      );

      // 3. 获取FBA库存统计
      const fbaStats = await FBAInventoryModel.getInventoryStats();

      // 4. 获取FBA预留统计
      const reservedStats = await FBAReservedModel.getReservedStats();

      // 5. 获取物流统计
      const logisticsStats = await LogisticsModel.getStats();

      // 6. 计算断货风险SKU数和补货建议SKU数
      // 从FBA库存列表中分析
      const fbaList = await FBAInventoryModel.getInventoryList({ page: 1, pageSize: 500 });
      const fbaItems = Array.isArray(fbaList) ? fbaList : (fbaList.data || []);

      let stockOutRiskCount = 0;
      let replenishSuggestedCount = 0;

      fbaItems.forEach(item => {
        const days = item.days_of_supply;
        const avail = item.available_quantity || 0;

        if (days !== null && days < 7 && avail > 0) {
          stockOutRiskCount++;
        }
        if (days !== null && days < 14) {
          replenishSuggestedCount++;
        }
      });

      // 6.1 从物流模块获取在途SKU数量（不依赖FBA库存）
      const inTransitCount = await LogisticsModel.getInTransitSkuCount();

      res.json({
        code: 200,
        message: '获取成功',
        data: {
          // 顶部经营总览卡片 - 支持时间范围
          overviewCards: {
            sales1d,
            sales3d,
            sales7d,
            units1d,
            units3d,
            units7d,
            orders1d,
            orders3d,
            orders7d,
            stockOutRiskSkuCount: stockOutRiskCount,
            replenishSuggestedSkuCount: replenishSuggestedCount,
            inTransitSkuCount: inTransitCount
          },
          // 业务报告汇总（用于流量分析）
          businessSummary: {
            totalSessions: parseNum(businessSummary.total_sessions) || 0,
            avgConversionRate: parseNum(businessSummary.avg_conversion_rate) || 0
          },
          // FBA库存统计
          fbaStats: {
            totalAvailable: parseNum(fbaStats.total_available) || 0,
            totalInbound: parseNum(fbaStats.total_inbound) || 0,
            outOfStockRisk: parseNum(fbaStats.out_of_stock_risk) || 0,
            lowStockCount: parseNum(fbaStats.low_stock_count) || 0,
            excessRisk: parseNum(fbaStats.excess_risk) || 0
          },
          // FBA预留统计
          fbaReserved: {
            totalReserved: parseNum(reservedStats.total_reserved_qty) || 0,
            recoverableReserved: parseNum(reservedStats.total_fc_transfers) + parseNum(reservedStats.total_fc_processing) || 0
          },
          // 物流统计
          logisticsStats: {
            inTransit: parseNum(logisticsStats.in_transit_count) || 0,
            delivered: parseNum(logisticsStats.delivered_count) || 0,
            pending: parseNum(logisticsStats.pending_count) || 0
          }
        }
      });
    } catch (error) {
      console.error('获取驾驶舱总览数据失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取驾驶舱数据失败: ' + error.message,
        data: null
      });
    }
  },

  /**
   * 获取经营核心总表
   * 基于全量SKU候选池聚合所有模块数据
   */
  async getCoreTable(req, res) {
    try {
      console.log('===== getCoreTable 被调用 =====');
      console.log('query:', req.query);
      const {
        page = 1,
        pageSize = 50,
        shop_id = '',
        time_range = '7',
        search = '',
        replenishment = '',
        risk_tag = '',
        has_in_transit = '',
        category_id = ''
      } = req.query;

      const { start: weekStart, end: weekEnd } = getDateRange(7);
      const { start: monthStart, end: monthEnd } = getDateRange(30);

      // ========== 1. 构建全量SKU候选池 ==========
      const allSkus = new Set();

      // 1.1 从订单模块获取SKU
      const orderOptions = {
        storeId: shop_id ? parseInt(shop_id) : null,
        endDate: weekEnd
      };
      const skuSalesData = await OrderItemModel.getSkuMultiWindowSales(orderOptions);
      skuSalesData.forEach(item => { if (item.sku) allSkus.add(item.sku); });

      // 1.2 从FBA库存模块获取SKU
      const fbaList = await FBAInventoryModel.getInventoryList({ page: 1, pageSize: 500 });
      const fbaItems = Array.isArray(fbaList) ? fbaList : (fbaList.data || []);
      fbaItems.forEach(item => { if (item.seller_sku) allSkus.add(item.seller_sku); });

      // 1.3 从FBA预留模块获取SKU
      const reservedList = await FBAReservedModel.getReservedList({ page: 1, pageSize: 500 });
      const reservedItems = Array.isArray(reservedList) ? reservedList : (reservedList.data || []);
      reservedItems.forEach(item => { if (item.sku) allSkus.add(item.sku); });

      // 1.4 从物流模块获取SKU（所有状态，不只是in_transit）
      const logisticsListAll = await LogisticsModel.getList({ page: 1, pageSize: 500 });
      const logisticsItemsAll = Array.isArray(logisticsListAll) ? logisticsListAll : (logisticsListAll.data || []);
      logisticsItemsAll.forEach(item => {
        try {
          const skuList = typeof item.sku_list === 'string' ? JSON.parse(item.sku_list) : (item.sku_list || []);
          skuList.forEach(skuItem => {
            const sku = skuItem.sku_code || skuItem.sku;
            if (sku) allSkus.add(sku);
          });
        } catch (e) {
          if (item.sku_code) allSkus.add(item.sku_code);
        }
      });

      // 1.5 从业务报告模块获取SKU
      const businessReports = await BusinessReportModel.getReportsByDateRange(
        monthStart.toISOString().split('T')[0],
        monthEnd.toISOString().split('T')[0],
        { page: 1, pageSize: 500 }
      );
      businessReports.forEach(item => { if (item.sku) allSkus.add(item.sku); });

      // 1.6 从商品资料模块获取SKU
      const productList = await ProductModel.getProductList({ page: 1, pageSize: 500 });
      const productItems = Array.isArray(productList) ? productList : (productList.data || []);
      productItems.forEach(item => { if (item.seller_sku) allSkus.add(item.seller_sku); });

      // ========== 2. 构建各模块SKU映射 ==========

      // 订单SKU映射
      const orderSkuMap = {};
      skuSalesData.forEach(item => { if (item.sku) orderSkuMap[item.sku] = item; });

      // FBA库存SKU映射
      const fbaSkuMap = {};
      fbaItems.forEach(item => { if (item.seller_sku) fbaSkuMap[item.seller_sku] = item; });

      // FBA预留SKU映射
      const reservedSkuMap = {};
      reservedItems.forEach(item => { if (item.sku) reservedSkuMap[item.sku] = item; });

      // 物流SKU映射（聚合所有物流记录的SKU）
      const logisticsSkuMap = {};
      logisticsItemsAll.forEach(item => {
        try {
          const skuList = typeof item.sku_list === 'string' ? JSON.parse(item.sku_list) : (item.sku_list || []);
          skuList.forEach(skuItem => {
            const sku = skuItem.sku_code || skuItem.sku;
            if (sku) {
              logisticsSkuMap[sku] = (logisticsSkuMap[sku] || 0) + parseInt(skuItem.ship_quantity || skuItem.quantity || 0);
            }
          });
        } catch (e) {
          if (item.sku_code) {
            logisticsSkuMap[item.sku_code] = (logisticsSkuMap[item.sku_code] || 0) + parseInt(item.ship_quantity || 0);
          }
        }
      });

      // 业务报告SKU映射
      const businessSkuMap = {};
      businessReports.forEach(item => { if (item.sku) businessSkuMap[item.sku] = item; });

      // 商品资料SKU映射
      const productSkuMap = {};
      productItems.forEach(item => { if (item.seller_sku) productSkuMap[item.seller_sku] = item; });

      // ========== 3. 对每个SKU聚合数据 ==========
      const combinedData = [];

      for (const sku of allSkus) {
        const orderData = orderSkuMap[sku] || null;
        const fbaData = fbaSkuMap[sku] || null;
        const reservedData = reservedSkuMap[sku] || null;
        const bizData = businessSkuMap[sku] || null;
        const productData = productSkuMap[sku] || null;
        const logisticsQty = logisticsSkuMap[sku] || 0;

        // 判断该SKU有哪些模块的数据
        const hasOrderData = !!orderData && (orderData.sales_1day > 0 || orderData.sales_3days > 0 || orderData.sales_7days > 0);
        const hasInventoryData = !!fbaData;
        const hasLogisticsData = logisticsQty > 0 || (!!reservedData);
        const hasBusinessData = !!bizData;
        const hasProductData = !!productData;

        // 只有物流数据的标识
        const onlyLogistics = hasLogisticsData && !hasOrderData && !hasInventoryData && !hasBusinessData;

        // 从订单模块获取的原生销量数据（无订单数据时为null）
        const sales1day = orderData ? (orderData.sales_1day || 0) : null;
        const sales3days = orderData ? (orderData.sales_3days || 0) : null;
        const sales7days = orderData ? (orderData.sales_7days || 0) : null;
        const sales14days = orderData ? (orderData.sales_14days || 0) : null;
        const sales30days = orderData ? (orderData.sales_30days || 0) : null;

        // 计算衍生指标（无销量数据时为null）
        const avgDailySales3d = sales3days !== null ? sales3days / 3 : null;
        const avgDailySales7d = sales7days !== null ? sales7days / 7 : null;
        const trend3dVs7d = avgDailySales3d !== null && avgDailySales7d !== null ? avgDailySales3d - avgDailySales7d : null;
        const trend7dVs30d = avgDailySales7d !== null && sales30days !== null ? avgDailySales7d - (sales30days / 30) : null;

        // 商品名称：优先使用订单 > FBA库存 > 业务报告 > 商品资料 > SKU
        const product_name = (orderData && orderData.product_name) ||
          (fbaData && fbaData.item_name) ||
          (bizData && bizData.title) ||
          (productData && productData.item_name) ||
          (reservedData && reservedData.product_name) ||
          sku;

        // ASIN
        const asin = (orderData && orderData.asin) ||
          (fbaData && fbaData.asin) ||
          (bizData && bizData.child_asin) ||
          (productData && productData.asin1) || '';

        const item = {
          sku: sku,
          product_name: product_name,
          asin: asin,
          // 订单模块原生销量字段
          sales_1day: sales1day,
          sales_3days: sales3days,
          sales_7days: sales7days,
          sales_14days: sales14days,
          sales_30days: sales30days,
          // 衍生指标
          avg_daily_sales_3d: avgDailySales3d,
          avg_daily_sales_7d: avgDailySales7d,
          trend_3d_vs_7d: trend3dVs7d,
          trend_7d_vs_30d: trend7dVs30d,
          // 流量数据来自业务报告模块
          sessions: bizData ? (bizData.sessions || 0) : null,
          page_views_percentage: bizData ? (bizData.page_views_percentage || 0) : null,
          product_session_percentage: bizData ? (bizData.product_session_percentage || 0) : null,
          // 库存数据来自FBA库存模块
          available_quantity: fbaData ? fbaData.available_quantity : null,
          days_of_supply: fbaData ? fbaData.days_of_supply : null,
          // FBA预留数据
          reserved_qty: reservedData ? reservedData.reserved_qty : null,
          // 物流在途来自物流模块（所有物流状态的汇总）
          in_transit_quantity: logisticsQty
        };

        // 计算补货建议和风险标签
        const replenishmentCalc = calculateReplenishment(item, { onlyLogistics });
        item.replenishment_suggestion = replenishmentCalc.suggestion;
        item.replenishment_type = replenishmentCalc.suggestionType;

        const riskTag = calculateRiskTag({
          ...item,
          avgSessions: bizData ? (bizData.sessions || 0) : 0,
          avgConversion: bizData ? (bizData.product_session_percentage || 0) : 0
        }, { onlyLogistics });
        item.risk_tag = riskTag.tag;
        item.risk_type = riskTag.tagType;

        // 计算附加风险标签（基于近期销量趋势）
        const extraTags = calculateExtraRiskTags(item);
        item.extra_tags = extraTags;

        combinedData.push(item);
      }

      // ========== 6. 补充中文名称 ==========
      // 收集全部SKU
      const allSkuList = combinedData.map(item => item.sku);
      // 批量查询中文名称
      const productNameMap = await ProductModel.getProductNameMapBySkus(allSkuList);
      // 补充到每行数据
      combinedData.forEach(item => {
        item.product_name_cn = productNameMap[item.sku] || null;
      });

      // ========== 7. 应用过滤条件 ==========
      let filteredData = combinedData;
      console.log('combinedData总数:', combinedData.length);
      console.log('productSkuMap大小:', productSkuMap.size);
      console.log('category_id参数:', category_id);

      // 搜索过滤
      if (search) {
        const keyword = search.toLowerCase();
        filteredData = filteredData.filter(item =>
          (item.sku && item.sku.toLowerCase().includes(keyword)) ||
          (item.product_name && item.product_name.toLowerCase().includes(keyword)) ||
          (item.asin && item.asin.toLowerCase().includes(keyword))
        );
      }

      // 补货建议过滤
      if (replenishment && replenishment !== 'all') {
        filteredData = filteredData.filter(item => item.replenishment_suggestion === replenishment);
      }

      // 风险标签过滤
      if (risk_tag && risk_tag !== 'all') {
        filteredData = filteredData.filter(item => item.risk_tag === risk_tag);
      }

      // 是否有在途过滤
      if (has_in_transit === 'yes') {
        filteredData = filteredData.filter(item => item.in_transit_quantity > 0);
      } else if (has_in_transit === 'no') {
        filteredData = filteredData.filter(item => item.in_transit_quantity === 0);
      }

      // 分类过滤
      const categoryIdStr = String(category_id || '');
      console.log('分类过滤 - category_id:', category_id, 'categoryIdStr:', categoryIdStr);
      console.log('分类过滤前filteredData数量:', filteredData.length);
      if (filteredData.length > 0) {
        console.log('filteredData[0]:', JSON.stringify(filteredData[0]));
      }
      if (categoryIdStr.trim() !== '' && categoryIdStr !== 'null' && categoryIdStr !== 'undefined') {
        console.log('进入分类过滤逻辑');
        const filterCategoryId = parseInt(category_id);
        // 调试：检查 productSkuMap 中有多少条数据，以及它们的 category_id
        const debugProductData = Object.keys(productSkuMap).slice(0, 3).map(sku => ({
          sku,
          category_id: productSkuMap[sku].category_id,
          category_id_type: typeof productSkuMap[sku].category_id
        }));
        console.log('分类过滤调试 - productSkuMap样本:', JSON.stringify(debugProductData));
        console.log('分类过滤调试 - filterCategoryId:', filterCategoryId, 'type:', typeof filterCategoryId);
        filteredData = filteredData.filter(item => {
          const productData = productSkuMap[item.sku];
          if (!productData) return false;
          return parseInt(productData.category_id) === filterCategoryId;
        });
        console.log('分类过滤后filteredData数量:', filteredData.length);
      }

      // ========== 5. 排序 ==========
      // 根据时间范围确定默认排序字段
      const days = parseInt(time_range) || 7;
      let sortField = 'sales_7days';
      if (days === 1) sortField = 'sales_1day';
      else if (days === 3) sortField = 'sales_3days';

      // 排序：优先按销量降序，再按SKU升序
      filteredData.sort((a, b) => {
        const aVal = a[sortField] || 0;
        const bVal = b[sortField] || 0;
        if (bVal !== aVal) return bVal - aVal;
        return String(a.sku).localeCompare(String(b.sku));
      });

      // ========== 6. 分页 ==========
      const total = filteredData.length;
      const offset = (parseInt(page) - 1) * parseInt(pageSize);
      const paginatedData = filteredData.slice(offset, offset + parseInt(pageSize));

      res.json({
        code: 200,
        message: '获取成功',
        data: {
          list: paginatedData,
          pagination: {
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            total,
            totalPages: Math.ceil(total / parseInt(pageSize))
          }
        }
      });
    } catch (error) {
      console.error('获取核心总表失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取核心总表失败: ' + error.message,
        data: null
      });
    }
  },

  /**
   * 获取重点预警榜单
   * 基于全量SKU候选池生成预警榜单
   */
  async getAlerts(req, res) {
    try {
      const { shop_id = '', time_range = '7' } = req.query;
      const days = parseInt(time_range) || 7;

      const { start: monthStart, end: monthEnd } = getDateRange(30);

      // ========== 1. 构建全量SKU候选池 ==========
      const allSkus = new Set();

      // 1.1 从订单模块获取SKU
      const orderOptions = {
        storeId: shop_id ? parseInt(shop_id) : null,
        endDate: new Date()
      };
      const skuSalesData = await OrderItemModel.getSkuMultiWindowSales(orderOptions);
      skuSalesData.forEach(item => { if (item.sku) allSkus.add(item.sku); });

      // 1.2 从FBA库存模块获取SKU
      const fbaList = await FBAInventoryModel.getInventoryList({ page: 1, pageSize: 500 });
      const fbaItems = Array.isArray(fbaList) ? fbaList : (fbaList.data || []);
      fbaItems.forEach(item => { if (item.seller_sku) allSkus.add(item.seller_sku); });

      // 1.3 从FBA预留模块获取SKU
      const reservedList = await FBAReservedModel.getReservedList({ page: 1, pageSize: 500 });
      const reservedItems = Array.isArray(reservedList) ? reservedList : (reservedList.data || []);
      reservedItems.forEach(item => { if (item.sku) allSkus.add(item.sku); });

      // 1.4 从物流模块获取SKU
      const logisticsList = await LogisticsModel.getList({ page: 1, pageSize: 500 });
      const logisticsItems = Array.isArray(logisticsList) ? logisticsList : (logisticsList.data || []);
      logisticsItems.forEach(item => {
        try {
          const skuList = typeof item.sku_list === 'string' ? JSON.parse(item.sku_list) : (item.sku_list || []);
          skuList.forEach(skuItem => {
            const sku = skuItem.sku_code || skuItem.sku;
            if (sku) allSkus.add(sku);
          });
        } catch (e) {
          if (item.sku_code) allSkus.add(item.sku_code);
        }
      });

      // 1.5 从业务报告模块获取SKU
      const businessReports = await BusinessReportModel.getReportsByDateRange(
        monthStart.toISOString().split('T')[0],
        monthEnd.toISOString().split('T')[0],
        { page: 1, pageSize: 500 }
      );
      businessReports.forEach(item => { if (item.sku) allSkus.add(item.sku); });

      // 1.6 从商品资料模块获取SKU
      const productList = await ProductModel.getProductList({ page: 1, pageSize: 500 });
      const productItems = Array.isArray(productList) ? productList : (productList.data || []);
      productItems.forEach(item => { if (item.seller_sku) allSkus.add(item.seller_sku); });

      // ========== 2. 构建各模块SKU映射 ==========

      // 订单SKU映射
      const orderSkuMap = {};
      skuSalesData.forEach(item => { if (item.sku) orderSkuMap[item.sku] = item; });

      // FBA库存SKU映射
      const fbaSkuMap = {};
      fbaItems.forEach(item => { if (item.seller_sku) fbaSkuMap[item.seller_sku] = item; });

      // 物流SKU映射
      const logisticsSkuMap = {};
      logisticsItems.forEach(item => {
        try {
          const skuList = typeof item.sku_list === 'string' ? JSON.parse(item.sku_list) : (item.sku_list || []);
          skuList.forEach(skuItem => {
            const sku = skuItem.sku_code || skuItem.sku;
            if (sku) {
              logisticsSkuMap[sku] = (logisticsSkuMap[sku] || 0) + parseInt(skuItem.ship_quantity || 0);
            }
          });
        } catch (e) {
          if (item.sku_code) {
            logisticsSkuMap[item.sku_code] = (logisticsSkuMap[item.sku_code] || 0) + parseInt(item.ship_quantity || 0);
          }
        }
      });

      // 业务报告SKU映射
      const businessSkuMap = {};
      businessReports.forEach(item => { if (item.sku) businessSkuMap[item.sku] = item; });

      // ========== 3. 计算全局均值 ==========
      const validSales = skuSalesData.filter(s => s.sales_7days > 0);
      const avgSessions = validSales.length > 0 && businessReports.length > 0
        ? businessReports.reduce((sum, b) => sum + (b.sessions || 0), 0) / businessReports.length
        : 0;
      const avgConversion = validSales.length > 0 && businessReports.length > 0
        ? businessReports.reduce((sum, b) => sum + (b.product_session_percentage || 0), 0) / businessReports.length
        : 0;

      // ========== 4. 对每个SKU聚合数据 ==========
      const combinedData = [];

      for (const sku of allSkus) {
        const orderData = orderSkuMap[sku] || null;
        const fbaData = fbaSkuMap[sku] || null;
        const bizData = businessSkuMap[sku] || null;
        const inTransitQty = logisticsSkuMap[sku] || 0;

        combinedData.push({
          sku,
          product_name: (orderData && orderData.product_name) ||
            (fbaData && fbaData.item_name) ||
            (bizData && bizData.title) ||
            sku,
          sales_7days: orderData ? (orderData.sales_7days || 0) : 0,
          sessions: bizData ? (bizData.sessions || 0) : 0,
          conversion: bizData ? (bizData.product_session_percentage || 0) : 0,
          available: fbaData ? (fbaData.available_quantity || 0) : 0,
          days_supply: fbaData ? fbaData.days_of_supply : null,
          in_transit: inTransitQty
        });
      }

      // ========== 5. 生成预警榜单 ==========

      // 判断数据充足性
      const hasInventoryData = fbaItems.length > 0;
      const hasOrderData = skuSalesData.length > 0;
      const hasBusinessData = businessReports.length > 0;

      // 断货风险 Top 10（需要有FBA库存数据）
      let stockOutRisk = [];
      let stockOutRiskStatus = 'lack_inventory_data';

      if (hasInventoryData) {
        const candidates = combinedData
          .filter(item => item.days_supply !== null && item.days_supply < 7 && item.available > 0);
        if (candidates.length > 0) {
          stockOutRisk = candidates
            .sort((a, b) => (a.days_supply || 999) - (b.days_supply || 999))
            .slice(0, 10)
            .map(item => ({
              sku: item.sku,
              product_name: item.product_name,
              days_supply: item.days_supply,
              available: item.available,
              in_transit: item.in_transit,
              sales_7days: item.sales_7days
            }));
          stockOutRiskStatus = 'ok';
        } else {
          stockOutRiskStatus = 'no_data';
        }
      }

      // 建议补货 Top 10（需要有FBA库存数据）
      let replenishSuggested = [];
      let replenishSuggestedStatus = 'lack_inventory_data';

      if (hasInventoryData) {
        const candidates = combinedData
          .filter(item => item.days_supply !== null && item.days_supply < 14);
        if (candidates.length > 0) {
          replenishSuggested = candidates
            .sort((a, b) => (a.days_supply || 999) - (b.days_supply || 999))
            .slice(0, 10)
            .map(item => ({
              sku: item.sku,
              product_name: item.product_name,
              days_supply: item.days_supply,
              available: item.available,
              in_transit: item.in_transit,
              sales_7days: item.sales_7days
            }));
          replenishSuggestedStatus = 'ok';
        } else {
          replenishSuggestedStatus = 'no_data';
        }
      }

      // 高流量低转化 Top 10（需要业务报告数据）
      let highTrafficLowConversion = [];
      let highTrafficLowConversionStatus = 'lack_business_data';

      if (hasBusinessData && avgSessions > 0) {
        const candidates = combinedData
          .filter(item => item.sessions > avgSessions && item.conversion < avgConversion && item.sessions > 0);
        if (candidates.length > 0) {
          highTrafficLowConversion = candidates
            .sort((a, b) => (b.sessions - a.sessions))
            .slice(0, 10)
            .map(item => ({
              sku: item.sku,
              product_name: item.product_name,
              sessions: item.sessions,
              conversion: item.conversion,
              sales_7days: item.sales_7days
            }));
          highTrafficLowConversionStatus = 'ok';
        } else {
          highTrafficLowConversionStatus = 'no_data';
        }
      }

      res.json({
        code: 200,
        message: '获取成功',
        data: {
          stockOutRisk,
          stockOutRiskStatus,
          replenishSuggested,
          replenishSuggestedStatus,
          highTrafficLowConversion,
          highTrafficLowConversionStatus,
          avgSessions,
          avgConversion,
          // 额外信息：帮助前端理解榜单状态
          alertsInfo: {
            totalSkus: allSkus.size,
            hasInventoryData,
            hasOrderData,
            hasBusinessData,
            message: !hasInventoryData && !hasOrderData && !hasBusinessData
              ? '当前缺少核心业务数据，榜单仅供参考'
              : !hasInventoryData
                ? '缺少FBA库存数据，断货风险和补货建议无法生成'
                : !hasBusinessData
                  ? '缺少业务报告数据，高流量低转化榜单无法生成'
                  : '数据充足'
          }
        }
      });
    } catch (error) {
      console.error('获取预警榜单失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取预警榜单失败: ' + error.message,
        data: null
      });
    }
  },

  /**
   * 获取趋势数据
   */
  async getTrends(req, res) {
    try {
      const { time_range = '30' } = req.query;
      const days = parseInt(time_range) || 30;
      const { start: periodStart, end: periodEnd } = getDateRange(days);

      // 从订单模块获取日销售趋势
      const dailyTrend = await OrderItemModel.getDailySalesTrend({
        startDate: periodStart,
        endDate: periodEnd
      });

      res.json({
        code: 200,
        message: '获取成功',
        data: {
          timeRange: days,
          dailyTrend: dailyTrend.map(item => ({
            date: item.date,
            sales: parseNum(item.net_sales_amount) || 0,
            units: parseNum(item.units_sold) || 0,
            orders: parseNum(item.order_count) || 0
          }))
        }
      });
    } catch (error) {
      console.error('获取趋势数据失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取趋势数据失败: ' + error.message,
        data: null
      });
    }
  }
};

module.exports = cockpitController;