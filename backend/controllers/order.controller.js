const FileParser = require('../utils/fileParser');
const OrderModel = require('../models/OrderModel');
const UploadLogModel = require('../models/UploadLogModel');

class OrderController {
  // 支持的维度
  static DIMENSIONS = ['yesterday', '3days', '7days', '14days', '30days'];
  static DIMENSION_NAMES = {
    'yesterday': '昨日',
    '3days': '近3天',
    '7days': '近7天',
    '14days': '近14天',
    '30days': '近30天'
  };

  /**
   * 验证维度参数
   * @param {string} dimension 
   * @returns {boolean}
   */
  static validateDimension(dimension) {
    return this.DIMENSIONS.includes(dimension);
  }

  /**
   * 计算日期范围
   * @param {string} dimension - 时间维度
   * @returns {Object} - { startDate, endDate }
   */
  static calculateDateRange(dimension) {
    const now = new Date();
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth();
    const todayDay = now.getDate();

    // 使用本地日期直接构造，避免时区偏移问题
    const todayMidnight = new Date(todayYear, todayMonth, todayDay);
    const todayEnd = new Date(todayYear, todayMonth, todayDay, 23, 59, 59, 999);

    let startDate = null;
    let endDate = todayEnd;

    switch (dimension) {
      case 'yesterday': // 昨日 00:00:00 - 23:59:59
        startDate = new Date(todayYear, todayMonth, todayDay - 1);
        endDate = new Date(todayYear, todayMonth, todayDay - 1, 23, 59, 59, 999);
        break;
      case '3days': // 近3天 (包括今天)
        startDate = new Date(todayYear, todayMonth, todayDay - 2);
        break;
      case '7days': // 近7天 (包括今天)
        startDate = new Date(todayYear, todayMonth, todayDay - 6);
        break;
      case '14days': // 近14天 (包括今天)
        startDate = new Date(todayYear, todayMonth, todayDay - 13);
        break;
      case '30days': // 近30天 (包括今天)
        startDate = new Date(todayYear, todayMonth, todayDay - 29);
        break;
      default:
        // 不做时间过滤
        break;
    }

    return { startDate, endDate };
  }

  /**
   * 上传订单文件
   */
  async upload(req, res) {
    try {
      const { dimension } = req.params;
      console.log(`[OrderController] 开始上传, 维度: ${dimension}, 文件: ${req.file?.originalname}`);
      
      if (!dimension) {
        return res.status(400).json({
          code: 400,
          message: '请指定时间维度 (dimension): yesterday, 3days, 7days, 14days, 30days',
          data: null
        });
      }

      if (!OrderController.validateDimension(dimension)) {
        return res.status(400).json({
          code: 400,
          message: '无效的时间维度。可用维度: yesterday, 3days, 7days, 14days, 30days',
          data: null
        });
      }

      if (!req.file) {
        return res.status(400).json({
          code: 400,
          message: '请选择要上传的文件',
          data: null
        });
      }

      const { path: filePath, originalname: filename } = req.file;
      
      // 解析文件
      let parsedData;
      try {
        console.log(`[OrderController] 正在解析文件: ${filePath}`);
        parsedData = FileParser.autoParseFile(filePath);
        console.log(`[OrderController] 文件解析成功, 记录数: ${parsedData.data.length}`);
      } catch (parseError) {
        console.error('[OrderController] 文件解析失败:', parseError);
        return res.status(400).json({
          code: 400,
          message: `文件解析失败: ${parseError.message}`,
          data: null
        });
      }

      // 验证SKU数据：尝试不同的SKU列名
      const skuColumn = ['sku', 'seller-sku', 'seller_sku'].find(col => 
        parsedData.data.length > 0 && parsedData.data[0].hasOwnProperty(col)
      ) || 'sku';
      console.log(`[OrderController] 使用的SKU列名: ${skuColumn}`);

      const { validData, invalidData } = FileParser.validateSkuData(parsedData.data, skuColumn);
      console.log(`[OrderController] 验证完成, 有效: ${validData.length}, 无效: ${invalidData.length}`);

      if (validData.length === 0) {
        return res.status(400).json({
          code: 400,
          message: '文件中没有有效的SKU数据',
          data: null
        });
      }

      // 生成上传批次
      const uploadBatch = `ORD_${dimension.toUpperCase()}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      // 映射维度值以适配数据库 ENUM ('1day', '3days', '7days', '14days', '30days')
      const dbDimension = dimension === 'yesterday' ? '1day' : dimension;

      // 保存到数据库
      console.log(`[OrderController] 正在保存到数据库, 批次: ${uploadBatch}, 映射后的维度: ${dbDimension}`);
      try {
        const result = await OrderModel.bulkUpsert(validData, dbDimension, uploadBatch);
        console.log(`[OrderController] 数据库保存成功:`, result);
      } catch (dbError) {
        console.error('[OrderController] 数据库保存失败:', dbError);
        throw dbError; // 重新抛出以由外层catch处理
      }

      // 记录上传日志
      let errorFile = null;
      if (invalidData.length > 0) {
        errorFile = FileParser.generateErrorFile(
          invalidData,
          process.env.UPLOAD_DIR || './uploads/errors'
        );
      }

      console.log(`[OrderController] 正在记录上传日志...`);
      await UploadLogModel.createLog({
        userId: req.user.id,
        username: req.user.username,
        module: `order_${dimension}`,
        filename: filename,
        totalRecords: parsedData.data.length,
        successCount: validData.length,
        failCount: invalidData.length,
        errorFile: errorFile
      });
      console.log(`[OrderController] 上传日志记录成功`);

      // 返回响应
      const response = {
        code: 200,
        message: '上传成功',
        data: {
          dimension: OrderController.DIMENSION_NAMES[dimension] || dimension,
          total: parsedData.data.length,
          success: validData.length,
          fail: invalidData.length,
          batch: uploadBatch,
          errorFile: errorFile ? `/uploads/errors/${errorFile.split('/').pop()}` : null
        }
      };

      // 如果有错误数据，添加警告信息
      if (invalidData.length > 0) {
        response.message = '上传完成，但有部分数据无效';
        response.data.warning = `${invalidData.length} 条记录因SKU为空被忽略`;
      }

      res.json(response);
    } catch (error) {
      console.error('订单上传错误:', error);
      res.status(500).json({
        code: 500,
        message: `服务器内部错误: ${error.message}`,
        data: null
      });
    }
  }

  /**
   * 获取订单列表
   */
  async getList(req, res) {
    try {
      const { dimension } = req.params;
      
      if (!dimension || !OrderController.validateDimension(dimension)) {
        return res.status(400).json({
          code: 400,
          message: '请指定有效的时间维度: yesterday, 3days, 7days, 14days, 30days',
          data: null
        });
      }

      const {
        page = 1,
        pageSize = 20,
        search = '',
        country = '',
        startDate = '',
        endDate = '',
        minQuantity = '',
        maxQuantity = '',
        minAmount = '',
        maxAmount = ''
      } = req.query;

      // 构建查询选项
      const dbDimension = dimension === 'yesterday' ? '1day' : dimension;
      const options = {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        search: search,
        country: country
      };

      // 日期过滤
      if (startDate) {
        options.startDate = startDate;
      }
      if (endDate) {
        options.endDate = endDate;
      }

      // 数量过滤
      if (minQuantity !== '') {
        options.minQuantity = parseInt(minQuantity);
      }
      if (maxQuantity !== '') {
        options.maxQuantity = parseInt(maxQuantity);
      }

      // 金额过滤
      if (minAmount !== '') {
        options.minAmount = parseFloat(minAmount);
      }
      if (maxAmount !== '') {
        options.maxAmount = parseFloat(maxAmount);
      }

      // 映射维度值以适配数据库 ENUM ('1day', '3days', '7days', '14days', '30days')

      // 根据维度自动计算日期范围
      const dimensionRange = OrderController.calculateDateRange(dimension);
      console.log(`[OrderController] Dimension: ${dimension}, startDate: ${dimensionRange.startDate}, endDate: ${dimensionRange.endDate}`);
      if (dimensionRange.startDate && !options.startDate) {
        options.startDate = dimensionRange.startDate;
      }
      if (dimensionRange.endDate && !options.endDate) {
        options.endDate = dimensionRange.endDate;
      }
      console.log(`[OrderController] After apply, options.startDate: ${options.startDate}, options.endDate: ${options.endDate}`);

      // 获取数据
      const [orders, total] = await Promise.all([
        OrderModel.getOrderList(dbDimension, options),
        OrderModel.countOrders(dbDimension, options)
      ]);

      // 映射字段以适配前端展示
      const mappedOrders = orders.map(order => ({
        id: order.id,
        order_id: order.order_id,
        sku: order.seller_sku,
        product_name: order.item_name,
        quantity: order.quantity_purchased,
        unit_price: order.item_price,
        total_price: order.total_amount,
        order_date: order.purchase_date,
        order_status: order.order_status,
        shipping_country: order.ship_country,
        marketplace: order.marketplace,
        currency: order.currency
      }));

      res.json({
        code: 200,
        message: '获取成功',
        data: {
          list: mappedOrders,
          dimension: OrderController.DIMENSION_NAMES[dimension] || dimension,
          pagination: {
            page: options.page,
            pageSize: options.pageSize,
            total: total,
            totalPages: Math.ceil(total / options.pageSize)
          }
        }
      });
    } catch (error) {
      console.error('获取订单列表错误:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 获取订单详情
   */
  async getDetail(req, res) {
    try {
      const { id } = req.params;
      
      const order = await OrderModel.findById(id);
      
      if (!order) {
        return res.status(404).json({
          code: 404,
          message: '订单未找到',
          data: null
        });
      }

      res.json({
        code: 200,
        message: '获取成功',
        data: order
      });
    } catch (error) {
      console.error('获取订单详情错误:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 获取订单销量汇总
   */
  async getSummary(req, res) {
    try {
      const { dimension } = req.params;
      
      if (!dimension || !OrderController.validateDimension(dimension)) {
        return res.status(400).json({
          code: 400,
          message: '请指定有效的时间维度: yesterday, 3days, 7days, 14days, 30days',
          data: null
        });
      }

      const dbDimension = dimension === 'yesterday' ? '1day' : dimension;
      const summary = await OrderModel.getSalesSummary(dbDimension);

      res.json({
        code: 200,
        message: '获取成功',
        data: {
          dimension: OrderController.DIMENSION_NAMES[dimension] || dimension,
          summary,
          totalItems: summary.length
        }
      });
    } catch (error) {
      console.error('获取订单销量汇总错误:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 获取订单统计信息
   */
  async getStats(req, res) {
    try {
      const { dimension } = req.params;
      
      if (!dimension || !OrderController.validateDimension(dimension)) {
        return res.status(400).json({
          code: 400,
          message: '请指定有效的时间维度: yesterday, 3days, 7days, 14days, 30days',
          data: null
        });
      }

      const dbDimension = dimension === 'yesterday' ? '1day' : dimension;
      const [stats, countryDistribution] = await Promise.all([
        OrderModel.getOrderStats(dbDimension),
        OrderModel.getCountryDistribution(dbDimension)
      ]);

      res.json({
        code: 200,
        message: '获取成功',
        data: {
          totalOrders: stats.total_orders || 0,
          totalRevenue: stats.total_amount || 0,
          totalUnits: stats.total_quantity || 0,
          averageOrderValue: stats.avg_order_value || 0,
          uniqueOrders: stats.unique_orders || 0,
          countryDistribution
        }
      });
    } catch (error) {
      console.error('获取订单统计错误:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 导出订单数据
   */
  async exportData(req, res) {
    try {
      const { dimension } = req.params;
      const format = req.query.format || 'json';
      
      if (!dimension || !OrderController.validateDimension(dimension)) {
        return res.status(400).json({
          code: 400,
          message: '请指定有效的时间维度: yesterday, 3days, 7days, 14days, 30days',
          data: null
        });
      }

      const dbDimension = dimension === 'yesterday' ? '1day' : dimension;
      // 获取所有订单数据
      const orders = await OrderModel.getOrderList(dbDimension, {
        page: 1,
        pageSize: 10000 // 导出大量数据
      });

      if (format === 'csv') {
        // 生成CSV
        const headers = [
          '订单号', '订单明细ID', 'SKU', '商品名称', '购买时间', '购买数量',
          '单价', '小计金额', '货币', '收货国家', '买家姓名', '买家电话'
        ];
        
        const csvRows = [headers.join(',')];
        
        orders.forEach(order => {
          const row = [
            order.order_id,
            order.order_item_id,
            order.seller_sku,
            `"${order.item_name || ''}"`,
            order.purchase_date ? new Date(order.purchase_date).toISOString() : '',
            order.quantity_purchased,
            order.item_price,
            order.total_amount,
            order.currency,
            order.ship_country,
            order.buyer_name,
            order.buyer_phone || ''
          ];
          csvRows.push(row.join(','));
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=orders_${dimension}_${Date.now()}.csv`);
        return res.send(csvRows.join('\n'));
      } else {
        // 默认返回JSON
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=orders_${dimension}_${Date.now()}.json`);
        return res.json(orders);
      }
    } catch (error) {
      console.error('导出订单数据错误:', error);
      res.status(500).json({
        code: 500,
        message: '导出失败',
        data: null
      });
    }
  }

  /**
   * 获取维度列表（用于前端选择）
   */
  async getDimensionList(req, res) {
    try {
      const dimensions = OrderController.DIMENSIONS.map(dim => ({
        value: dim,
        label: OrderController.DIMENSION_NAMES[dim] || dim
      }));

      res.json({
        code: 200,
        message: '获取成功',
        data: dimensions
      });
    } catch (error) {
      console.error('获取维度列表错误:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }
}

module.exports = new OrderController();