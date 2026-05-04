const BusinessReportModel = require('../models/BusinessReportModel');
const ProductModel = require('../models/ProductModel');
const FileParser = require('../utils/fileParser');
const UploadLogModel = require('../models/UploadLogModel');

/**
 * 亚马逊业务报告控制器
 * 
 * 处理业务报告数据的CRUD操作和文件上传
 * 
 * 支持的中文表头字段映射（CSV/Excel文件 → 数据库字段）：
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
 * 数据转换规则：
 * 1. 数值处理：自动去除千位分隔符（逗号）、货币符号（US$、¥等）、空格
 * 2. 百分比处理：自动去除百分号，存储为小数（如"3.12%" → 3.12）
 * 3. 日期处理：report_month字段格式为YYYY-MM-01，由报告日期转换而来
 * 4. SKU映射：优先使用SKU字段，其次使用report_id、seller_sku等
 * 
 * 文件上传示例：
 * 文件应包含以上中文表头，系统会自动识别并映射到对应数据库字段
 */
class BusinessController {
  /**
   * 获取业务报告列表
   */
  async getReports(req, res) {
    try {
      const {
        startDate,
        endDate,
        page = 1,
        pageSize = 20,
        orderBy = 'report_month',
        order = 'DESC',
        shop_code = ''
      } = req.query;

      // 默认日期范围（最近30天）
      const defaultEndDate = new Date();
      const defaultStartDate = new Date();
      defaultStartDate.setDate(defaultStartDate.getDate() - 30);

      const start = startDate || defaultStartDate.toISOString().split('T')[0];
      const end = endDate || defaultEndDate.toISOString().split('T')[0];

      // 构建查询条件
      let conditions = { startDate: start, endDate: end, page, pageSize, orderBy, order, shop_code };

      // 获取数据
      const reports = await BusinessReportModel.getReportsByDateRange(start, end, conditions);
      const total = await BusinessReportModel.countReportsByDateRange(start, end, conditions);

      // 参考经营驾驶舱，批量查询中文名称并合并
      const skuList = reports.map(item => item.sku).filter(Boolean);
      if (skuList.length > 0) {
        const nameMap = await ProductModel.getProductNameMapBySkus(skuList);
        reports.forEach(item => {
          item.product_name_cn = nameMap[item.sku] || null;
        });
      } else {
        reports.forEach(item => {
          item.product_name_cn = null;
        });
      }

      res.json({
        code: 200,
        message: '获取成功',
        data: {
          reports,
          pagination: {
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            total,
            totalPages: Math.ceil(total / pageSize)
          },
          dateRange: { start, end }
        }
      });
    } catch (error) {
      console.error('获取业务报告列表错误:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 获取业务报告摘要
   */
  async getSummary(req, res) {
    try {
      const { startDate, endDate } = req.query;

      // 默认日期范围（最近30天）
      const defaultEndDate = new Date();
      const defaultStartDate = new Date();
      defaultStartDate.setDate(defaultStartDate.getDate() - 30);

      const start = startDate || defaultStartDate.toISOString().split('T')[0];
      const end = endDate || defaultEndDate.toISOString().split('T')[0];

      const summary = await BusinessReportModel.getReportSummary(start, end);
      const salesBySite = await BusinessReportModel.getSalesBySite(start, end);
      const salesTrend = await BusinessReportModel.getSalesTrend(start, end);

      res.json({
        code: 200,
        message: '获取成功',
        data: {
          summary,
          salesBySite,
          salesTrend,
          dateRange: { start, end }
        }
      });
    } catch (error) {
      console.error('获取业务报告摘要错误:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 上传业务报告数据
   */
  async uploadReports(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          code: 400,
          message: '请选择要上传的文件',
          data: null
        });
      }

      const { path: filePath, originalname: filename } = req.file;
      
      // 解析文件 - 传递空数组，避免验证英文表头
      console.log(`[BusinessController] 开始解析文件: ${filePath}`);
      console.log(`[BusinessController] 传递的expectedHeaders: [] (空数组)`);
      let parsedData;
      try {
        parsedData = FileParser.autoParseFile(filePath, []);
      } catch (parseError) {
        console.error(`[BusinessController] 文件解析失败:`, parseError);
        return res.status(400).json({
          code: 400,
          message: `文件解析失败: ${parseError.message}`,
          data: null
        });
      }

      const reports = parsedData.data;
      
      console.log(`文件解析成功: 表头=${JSON.stringify(parsedData.headers)}, 数据条数=${reports.length}`);
      if (reports.length > 0) {
        console.log('第一条数据示例:', JSON.stringify(reports[0]));
        // 收集所有字段名以便调试
        const allFields = new Set();
        reports.forEach(row => {
          Object.keys(row).forEach(field => allFields.add(field));
        });
        console.log('所有字段名:', Array.from(allFields));
        
        // 详细日志：显示每个字段的名称和类型
        console.log('=== 详细字段分析 ===');
        parsedData.headers.forEach((header, index) => {
          console.log(`表头[${index}]: "${header}" (类型: ${typeof reports[0][header]}, 值: ${JSON.stringify(reports[0][header])})`);
        });
      }
      
      if (!Array.isArray(reports) || reports.length === 0) {
        return res.status(400).json({
          code: 400,
          message: '报告中未找到有效数据',
          data: null
        });
      }

      // 验证数据格式 - 支持中文表头文件
      // 检查文件是中文表头还是英文表头
      const isChineseHeader = parsedData.headers.some(header => 
        header.includes('ASIN') || header.includes('标题') || header.includes('会话') || header.includes('页面')
      );
      
      console.log(`=== 表头检测结果 ===`);
      console.log(`isChineseHeader: ${isChineseHeader}`);
      console.log(`检测到的中文关键词: ${parsedData.headers.filter(header => 
        header.includes('ASIN') || header.includes('标题') || header.includes('会话') || header.includes('页面')
      ).join(', ')}`);
      
      const requiredFields = isChineseHeader 
        ? ['SKU']  // 中文表头文件只需要SKU字段
        : ['report_id', 'site', 'report_date', 'total_sales', 'total_orders']; // 英文表头文件需要原字段
      
      console.log(`requiredFields: ${JSON.stringify(requiredFields)}`);
      
      const invalidReports = [];
      
      console.log(`=== 开始验证 ${reports.length} 条数据 ===`);
      reports.forEach((report, index) => {
        const missingFields = requiredFields.filter(field => {
          // 对于中文表头文件，检查中文字段名
          if (isChineseHeader && field === 'SKU') {
            // 检查SKU字段的各种可能名称
            const skuValue = report['SKU'] || report['sku'] || report['seller_sku'] || report['report_id'] || '';
            const isEmpty = !skuValue || skuValue.trim() === '';
            if (isEmpty && index < 3) { // 只记录前3行的调试信息
              console.log(`第${index + 1}行 SKU检查: report['SKU']="${report['SKU']}", report['sku']="${report['sku']}", report['seller_sku']="${report['seller_sku']}", report['report_id']="${report['report_id']}", 结果: ${isEmpty ? '空' : '有值'}`);
            }
            return isEmpty;
          }
          // 对于英文表头文件，检查原字段
          const hasField = report[field];
          if (!hasField && index < 3) {
            console.log(`第${index + 1}行 缺少字段: ${field}`);
          }
          return !hasField;
        });
        
        if (missingFields.length > 0) {
          invalidReports.push({
            index: index + 1, // 显示行号（从1开始）
            sku: report['SKU'] || report['sku'] || report['seller_sku'] || report['report_id'] || '',
            missing_fields: missingFields,
            is_chinese_header: isChineseHeader
          });
          if (index < 3) {
            console.log(`第${index + 1}行 验证失败: missing_fields=${JSON.stringify(missingFields)}`);
          }
        } else if (index < 3) {
          console.log(`第${index + 1}行 验证通过`);
        }
      });
      console.log(`=== 验证完成，无效报告: ${invalidReports.length} 条 ===`);

      if (invalidReports.length > 0) {
        return res.status(400).json({
          code: 400,
          message: '部分报告数据格式不正确',
          data: { invalidReports }
        });
      }

      // 记录上传日志
      const userInfo = req.user || {};
      const uploadLogData = {
        module: 'business_report',
        filename: filename,
        userId: userInfo.id || 1, // 默认管理员ID
        username: userInfo.username || 'admin',
        totalRecords: reports.length,
        successCount: 0, // 初始值，插入数据后更新
        failCount: 0,
        errorFile: null
      };

      const logResult = await UploadLogModel.createLog(uploadLogData);
      
      // 转换数据字段映射
      console.log(`原始报告数据: ${reports.length} 条`);
      const transformedReports = reports.map(report => {
        const transformed = {};
        
        // 字段映射 - 基础字段
        transformed.seller_sku = report.report_id || report.seller_sku || report.sku || report.SKU || '';
        transformed.item_title = report.item_title || report.title || report.product_name || report.标题 || '';
        transformed.parent_asin = report.parent_asin || report.parent_sku || report['（父）ASIN'] || '';
        transformed.child_asin = report.child_asin || report.child_sku || report['（子）ASIN'] || '';
        
        // 数值字段处理函数
        const parseNumber = (value) => {
          if (!value && value !== 0) return 0;
          if (typeof value === 'number') return value;
          // 去除千位分隔符逗号、货币符号、空格等
          const cleaned = value.toString()
            .replace(/[$,¥€£US\s]/g, '') // 去除常见货币符号
            .replace(/,/g, '') // 去除千位分隔符
            .trim();
          // 如果是百分比字符串，提取数字部分
          if (cleaned.includes('%')) {
            return parseFloat(cleaned.replace('%', '')) || 0;
          }
          return parseFloat(cleaned) || 0;
        };
        
        const parseIntNumber = (value) => {
          return Math.round(parseNumber(value));
        };
        
        // 会话相关字段
        transformed.sessions = parseIntNumber(report.sessions || report['会话数 - 总计'] || 0);
        transformed.sessions_b2b = parseIntNumber(report['会话 - 总计 - B2B'] || 0);
        transformed.session_percentage_b2b = parseNumber(report['会话百分比 - 总计 - B2B'] || 0);
        
        // 页面浏览相关字段
        transformed.page_views = parseIntNumber(report.page_views || report['页面浏览量 - 总计'] || 0);
        transformed.page_views_b2b = parseIntNumber(report['页面浏览量 - 总计 - B2B'] || 0);
        transformed.page_views_percentage = parseNumber(report['页面浏览量百分比 - 总计'] || 0);
        transformed.page_views_percentage_b2b = parseNumber(report['页面浏览量百分比 - 总计 - B2B'] || 0);
        
        // 转化率字段
        let conversionRate = report.conversion_rate || report.conversion || report['转化率 - 总计'] || 0;
        transformed.conversion_rate = parseNumber(conversionRate);
        
        // 推荐报价相关字段
        transformed.recommended_offer_percentage = parseNumber(report['推荐报价（推荐报价展示位）百分比'] || 0);
        transformed.recommended_offer_percentage_b2b = parseNumber(report['推荐报价（推荐报价展示位）百分比 - B2B'] || 0);
        
        // 已订购商品数量相关字段
        transformed.ordered_quantity = parseIntNumber(report.total_orders || report.ordered_quantity || report.orders || report.quantity || report['已订购商品数量'] || 0);
        transformed.ordered_quantity_b2b = parseIntNumber(report['已订购商品数量 - B2B'] || 0);
        transformed.product_session_percentage = parseNumber(report['商品会话百分比'] || 0);
        transformed.product_session_percentage_b2b = parseNumber(report['商品会话百分比 - B2B'] || 0);
        
        // 销售额相关字段
        transformed.sales_amount = parseNumber(report.total_sales || report.sales_amount || report.sales || report['已订购商品销售额'] || 0);
        transformed.sales_amount_b2b = parseNumber(report['已订购商品销售额 - B2B'] || 0);
        
        // 订单商品总数相关字段
        transformed.total_order_items = parseIntNumber(report['订单商品总数'] || 0);
        transformed.total_order_items_b2b = parseIntNumber(report['订单商品总数 - B2B'] || 0);
        
        // 上传批次标识
        transformed.upload_batch = filename.replace(/[^a-zA-Z0-9]/g, '_') + '_' + Date.now();
        
        // 处理报告月份：将report_date转换为YYYY-MM-01格式
        // 支持多种日期字段名，包括中文
        let reportMonth = null;
        
        // 检查各种可能的日期字段名
        const dateFieldNames = [
          'report_date', 'report_month', 'date', 'month', '报告日期', '日期', '报告月份', '月份',
          'report date', 'report month', 'Report Date', 'Report Month'
        ];
        
        for (const fieldName of dateFieldNames) {
          const dateValue = report[fieldName];
          if (dateValue && dateValue.toString().trim() !== '') {
            const date = new Date(dateValue);
            if (!isNaN(date.getTime())) {
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              reportMonth = `${year}-${month}-01`;
              break; // 找到第一个有效日期就停止
            }
          }
        }
        
        if (!reportMonth) {
          // 如果没有有效日期，使用当前月份
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          reportMonth = `${year}-${month}-01`;
        }
        
        transformed.report_month = reportMonth;
        
        return transformed;
      }).map((report, index) => {
        // 记录第一条转换后的数据以便调试
        if (index === 0) {
          console.log('转换后第一条数据示例:', JSON.stringify(report));
        }
        return report;
      }).filter(report => {
        const isValid = report.seller_sku && report.report_month;
        if (!isValid) {
          console.log(`记录被过滤 - seller_sku: "${report.seller_sku}", report_month: "${report.report_month}"`);
        }
        return isValid;
      });
      
      console.log(`转换后有效数据: ${transformedReports.length} 条`);
      
      if (transformedReports.length === 0) {
        return res.status(400).json({
          code: 400,
          message: '报告数据不能为空或所有数据都缺少必要字段（seller_sku和report_month）',
          data: null
        });
      }
      
      // 插入业务报告数据
      const result = await BusinessReportModel.batchInsert(transformedReports);
      
      console.log(`批量插入结果: 成功 ${result.success.length} 条, 错误 ${result.errors.length} 条`);

      // 更新日志状态
      const updateLogData = {
        success_count: result.success.length || 0,
        fail_count: result.errors.length || 0,
        error_file: result.errors.length > 0 ? '部分数据上传失败，详情见errors字段' : null
      };
      
      // 确保没有undefined值
      Object.keys(updateLogData).forEach(key => {
        if (updateLogData[key] === undefined) {
          updateLogData[key] = null;
        }
      });
      
      // 确保日志ID存在
      if (!logResult || !logResult.insertId) {
        console.warn('上传日志创建失败，跳过更新日志');
      } else {
        await UploadLogModel.update(logResult.insertId, updateLogData);
      }

      if (result.errors.length > 0) {
        return res.status(207).json({
          code: 207,
          message: '部分报告上传失败',
          data: {
            success: result.success,
            errors: result.errors,
            upload_log_id: logResult.insertId
          }
        });
      }

      res.json({
        code: 200,
        message: '报告上传成功',
        data: {
          success: result.success,
          upload_log_id: logResult.insertId
        }
      });
    } catch (error) {
      console.error('上传业务报告错误:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 删除业务报告
   */
  async deleteReport(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          code: 400,
          message: '报告ID不能为空',
          data: null
        });
      }

      const deleted = await BusinessReportModel.delete(id);
      
      if (!deleted) {
        return res.status(404).json({
          code: 404,
          message: '报告不存在',
          data: null
        });
      }

      res.json({
        code: 200,
        message: '删除成功',
        data: null
      });
    } catch (error) {
      console.error('删除业务报告错误:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 清空所有业务报告
   */
  async deleteAll(req, res) {
    try {
      await BusinessReportModel.deleteAll();
      res.json({
        code: 200,
        message: '清空成功',
        data: null
      });
    } catch (error) {
      console.error('清空业务报告错误:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 导出业务报告数据
   */
  async exportReports(req, res) {
    try {
      const { startDate, endDate, format = 'json' } = req.query;

      // 默认日期范围（最近30天）
      const defaultEndDate = new Date();
      const defaultStartDate = new Date();
      defaultStartDate.setDate(defaultStartDate.getDate() - 30);

      const start = startDate || defaultStartDate.toISOString().split('T')[0];
      const end = endDate || defaultEndDate.toISOString().split('T')[0];

      const reports = await BusinessReportModel.getReportsByDateRange(start, end, { page: 1, pageSize: 1000 });
      const summary = await BusinessReportModel.getReportSummary(start, end);

      // 参考经营驾驶舱，批量查询中文名称并合并
      const skuList = reports.map(item => item.sku).filter(Boolean);
      if (skuList.length > 0) {
        const nameMap = await ProductModel.getProductNameMapBySkus(skuList);
        reports.forEach(item => {
          item.product_name_cn = nameMap[item.sku] || null;
        });
      } else {
        reports.forEach(item => {
          item.product_name_cn = null;
        });
      }

      if (format === 'csv') {
        // CSV格式导出
        const csvData = this.convertToCSV(reports);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="business_reports_${start}_${end}.csv"`);
        return res.send(csvData);
      } else {
        // JSON格式导出
        res.json({
          code: 200,
          message: '导出成功',
          data: {
            reports,
            summary,
            dateRange: { start, end },
            exported_at: new Date().toISOString()
          }
        });
      }
    } catch (error) {
      console.error('导出业务报告错误:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 将数据转换为CSV格式
   */
  convertToCSV(data) {
    if (!data.length) return '';
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(item => 
      Object.values(item).map(value => 
        typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      ).join(',')
    );
    
    return [headers, ...rows].join('\n');
  }
}

module.exports = new BusinessController();