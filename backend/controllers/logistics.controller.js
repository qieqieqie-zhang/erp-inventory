const LogisticsModel = require('../models/LogisticsModel');

class LogisticsController {
  /**
   * 获取物流跟踪列表
   */
  async getList(req, res) {
    try {
      const {
        page = 1,
        pageSize = 20,
        search = '',
        status = '',
        country = '',
        shopId = '',
        startDate = '',
        endDate = ''
      } = req.query;

      const options = {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        search,
        status,
        country,
        startDate: startDate || null,
        endDate: endDate || null
      };

      if (shopId) {
        options.shopId = parseInt(shopId);
      }

      const [list, total] = await Promise.all([
        LogisticsModel.getList(options),
        LogisticsModel.count(options)
      ]);

      res.json({
        code: 200,
        message: '获取成功',
        data: {
          list,
          pagination: {
            page: options.page,
            pageSize: options.pageSize,
            total,
            totalPages: Math.ceil(total / options.pageSize)
          }
        }
      });
    } catch (error) {
      console.error('获取物流跟踪列表错误:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 获取物流详情
   */
  async getDetail(req, res) {
    try {
      const { id } = req.params;

      const item = await LogisticsModel.findById(id);

      if (!item) {
        return res.status(404).json({
          code: 404,
          message: '物流记录未找到',
          data: null
        });
      }

      res.json({
        code: 200,
        message: '获取成功',
        data: item
      });
    } catch (error) {
      console.error('获取物流详情错误:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 创建物流跟踪记录
   */
  async create(req, res) {
    try {
      const data = req.body;

      // 验证必填字段
      if (!data.fba_warehouse_number && !data.tracking_number) {
        return res.status(400).json({
          code: 400,
          message: 'FBA入仓号和物流单号不能同时为空',
          data: null
        });
      }

      const result = await LogisticsModel.create(data);

      res.json({
        code: 200,
        message: '创建成功',
        data: result
      });
    } catch (error) {
      console.error('创建物流跟踪记录错误:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 更新物流跟踪记录
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;

      // 检查记录是否存在
      const existing = await LogisticsModel.findById(id);
      if (!existing) {
        return res.status(404).json({
          code: 404,
          message: '物流记录未找到',
          data: null
        });
      }

      await LogisticsModel.update(id, data);

      res.json({
        code: 200,
        message: '更新成功',
        data: null
      });
    } catch (error) {
      console.error('更新物流跟踪记录错误:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 更新物流状态
   */
  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({
          code: 400,
          message: '状态不能为空',
          data: null
        });
      }

      const validStatuses = ['pending', 'shipped', 'in_transit', 'arrived', 'customs_cleared', 'delivered'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          code: 400,
          message: '无效的物流状态',
          data: null
        });
      }

      const success = await LogisticsModel.updateStatus(id, status);
      if (!success) {
        return res.status(404).json({
          code: 404,
          message: '物流记录未找到',
          data: null
        });
      }

      res.json({
        code: 200,
        message: '状态更新成功',
        data: null
      });
    } catch (error) {
      console.error('更新物流状态错误:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 删除物流跟踪记录
   */
  async delete(req, res) {
    try {
      const { id } = req.params;

      const success = await LogisticsModel.delete(id);
      if (!success) {
        return res.status(404).json({
          code: 404,
          message: '物流记录未找到',
          data: null
        });
      }

      res.json({
        code: 200,
        message: '删除成功',
        data: null
      });
    } catch (error) {
      console.error('删除物流跟踪记录错误:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 获取物流统计
   */
  async getStats(req, res) {
    try {
      const { shopId } = req.query;
      const stats = await LogisticsModel.getStats(shopId ? parseInt(shopId) : null);

      res.json({
        code: 200,
        message: '获取成功',
        data: stats
      });
    } catch (error) {
      console.error('获取物流统计错误:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 获取物流状态下拉列表
   */
  async getStatusList(req, res) {
    try {
      const statusList = LogisticsModel.getStatusList();

      res.json({
        code: 200,
        message: '获取成功',
        data: statusList
      });
    } catch (error) {
      console.error('获取物流状态列表错误:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 获取物流公司列表
   */
  async getCompanies(req, res) {
    try {
      const parserRegistry = require('../utils/parsers');
      const companies = parserRegistry.getAllParsers();

      res.json({
        code: 200,
        message: '获取成功',
        data: companies
      });
    } catch (error) {
      console.error('获取物流公司列表错误:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 上传物流跟踪文件
   */
  async upload(req, res) {
    try {
      // 记录上传请求详情
      const userId = req.user ? req.user.userId : 'unknown';
      console.log('[Logistics] ===== 上传请求开始 =====');
      console.log('[Logistics] 时间:', new Date().toISOString());
      console.log('[Logistics] 用户ID:', userId);
      console.log('[Logistics] IP:', req.ip || req.connection.remoteAddress);

      if (!req.file) {
        console.log('[Logistics] 错误: 没有文件');
        return res.status(400).json({
          code: 400,
          message: '请选择要上传的文件',
          data: null
        });
      }

      const { path: filePath, originalname: filename } = req.file;
      console.log('[Logistics] 文件名:', filename);
      console.log('[Logistics] shopId:', req.body.shopId);

      // 解析文件
      let parsedData;
      try {
        const FileParser = require('../utils/fileParser');
        parsedData = FileParser.autoParseFile(filePath);
        console.log('[Logistics] 解析成功, 数据条数:', parsedData.data.length);
      } catch (parseError) {
        console.error('[Logistics] 解析错误:', parseError);
        return res.status(400).json({
          code: 400,
          message: `文件解析失败: ${parseError.message}`,
          data: null
        });
      }

      // 验证并转换数据
      console.log('[Logistics] 解析到的数据条数:', parsedData.data.length);
      if (parsedData.data.length > 0) {
        console.log('[Logistics] 表头:', JSON.stringify(parsedData.headers));
        console.log('[Logistics] 第一行数据:', JSON.stringify(parsedData.data[0]));
      }

      // 使用解析器注册表解析数据
      const logisticsCompany = req.body.logisticsCompany || 'auto';
      console.log('[Logistics] 物流公司/解析器:', logisticsCompany);

      let validData;
      try {
        const parserRegistry = require('../utils/parsers');
        validData = parserRegistry.parse(logisticsCompany, parsedData, {
          shopId: req.body.shopId,
          filePath: filePath
        });
      } catch (parseError) {
        console.error('[Logistics] 解析器错误:', parseError);
        return res.status(400).json({
          code: 400,
          message: `文件解析失败: ${parseError.message}`,
          data: null
        });
      }

      if (validData.length === 0) {
        console.log('[Logistics] 警告: validData为空!');
        return res.status(400).json({
          code: 400,
          message: '文件中没有有效的物流数据',
          data: null
        });
      }

      console.log('[Logistics] 有效数据条数:', validData.length);
      console.log('[Logistics] 第一条数据:', JSON.stringify(validData[0]));
      console.log('[Logistics] 最后一条数据:', JSON.stringify(validData[validData.length - 1]));

      // 批量插入数据库
      try {
        await LogisticsModel.bulkCreate(validData);
      } catch (dbError) {
        console.error('[Logistics] 数据库错误:', dbError);
        return res.status(500).json({
          code: 500,
          message: `数据库错误: ${dbError.message}`,
          data: null
        });
      }

      console.log('[Logistics] 数据库插入成功');
      console.log('[Logistics] ===== 上传请求结束 =====');

      res.json({
        code: 200,
        message: '上传成功',
        data: {
          total: parsedData.data.length,
          success: validData.length,
          fail: parsedData.data.length - validData.length
        }
      });
    } catch (error) {
      console.error('[Logistics] 上传物流跟踪文件错误:', error);
      console.log('[Logistics] ===== 上传请求异常结束 =====');
      res.status(500).json({
        code: 500,
        message: `服务器内部错误: ${error.message}`,
        data: null
      });
    }
  }

  /**
   * 预览上传文件内容
   */
  async preview(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          code: 400,
          message: '请选择要上传的文件',
          data: null
        });
      }

      const { path: filePath, originalname: filename } = req.file;
      console.log('[Logistics] 预览文件:', filename);

      // 解析文件
      let parsedData;
      try {
        const FileParser = require('../utils/fileParser');
        parsedData = FileParser.autoParseFile(filePath);
        console.log('[Logistics] 预览解析成功, 数据条数:', parsedData.data.length);
      } catch (parseError) {
        console.error('[Logistics] 预览解析错误:', parseError);
        return res.status(400).json({
          code: 400,
          message: `文件解析失败: ${parseError.message}`,
          data: null
        });
      }

      // 返回前10条数据和列信息
      const previewData = parsedData.data.slice(0, 10);
      const columns = parsedData.headers || Object.keys(previewData[0] || {});

      console.log('[Logistics] 预览列:', JSON.stringify(columns));
      console.log('[Logistics] 预览数据条数:', previewData.length);

      res.json({
        code: 200,
        message: '预览成功',
        data: {
          list: previewData,
          columns: columns,
          total: parsedData.data.length
        }
      });
    } catch (error) {
      console.error('预览文件错误:', error);
      res.status(500).json({
        code: 500,
        message: `服务器内部错误: ${error.message}`,
        data: null
      });
    }
  }

  /**
   * 解析Commercial Invoice格式的Excel
   * 这种格式特点是：行1-18是表头信息，行19是列标题，行20+是数据
   */
  parseCommercialInvoice(rows) {
    // 行19是标题行
    const headerRow = rows[19] || {};
    const headers = Object.values(headerRow);

    // 行20+是数据
    const dataRows = rows.slice(20);

    return {
      headers: headers.filter(h => h && h.trim()),
      data: dataRows.map(row => {
        const obj = {};
        Object.values(headerRow).forEach((h, i) => {
          if (h) {
            obj[h] = row[Object.keys(headerRow).indexOf(Object.keys(headerRow)[i])];
          }
        });
        return obj;
      }).filter(obj => Object.values(obj).some(v => v))
    };
  }

  /**
   * 导出物流跟踪数据
   */
  async exportData(req, res) {
    try {
      const { format = 'json', shopId, status, startDate, endDate } = req.query;

      const options = {
        page: 1,
        pageSize: 10000,
        status: status || '',
        startDate: startDate || null,
        endDate: endDate || null
      };

      if (shopId) {
        options.shopId = parseInt(shopId);
      }

      const list = await LogisticsModel.getList(options);

      if (format === 'csv') {
        const headers = [
          'FBA仓库编号', 'SKU编号', 'SKU名称', '运输编号', '目的地',
          '货物类型', '运输方式', '发货日期', '发货数量', '单价', '总价',
          '承运人', '货运代理', '箱数', 'ETD', 'ETA', '提柜时间', '派送时间',
          'FBA开始接收', '箱均价格', 'VAT税费', '退税', '运费',
          '物流状态', '备注'
        ];

        const csvRows = [headers.join(',')];

        list.forEach(item => {
          const row = [
            item.fba_warehouse_number,
            item.sku_code,
            item.sku_name,
            item.tracking_number,
            item.destination_country,
            item.cargo_type,
            item.shipping_method,
            item.ship_date ? new Date(item.ship_date).toISOString().split('T')[0] : '',
            item.ship_quantity,
            item.unit_price,
            item.total_price,
            item.carrier,
            item.forwarder_name,
            item.carton_count,
            item.etd ? new Date(item.etd).toISOString() : '',
            item.eta ? new Date(item.eta).toISOString() : '',
            item.pickup_time ? new Date(item.pickup_time).toISOString() : '',
            item.delivery_time ? new Date(item.delivery_time).toISOString() : '',
            item.fba_start_receive_time ? new Date(item.fba_start_receive_time).toISOString() : '',
            item.price_per_carton,
            item.vat_amount,
            item.tax_rebate,
            item.freight_cost,
            item.logistics_status,
            `"${item.remarks || ''}"`
          ];
          csvRows.push(row.join(','));
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=logistics_${Date.now()}.csv`);
        return res.send(csvRows.join('\n'));
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=logistics_${Date.now()}.json`);
        return res.json(list);
      }
    } catch (error) {
      console.error('导出物流跟踪数据错误:', error);
      res.status(500).json({
        code: 500,
        message: '导出失败',
        data: null
      });
    }
  }

  /**
   * 更新物流记录的SKU列表
   */
  async updateSkuList(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          code: 400,
          message: '请选择要上传的文件',
          data: null
        });
      }

      const { path: filePath } = req.file;
      const { logisticsId } = req.body;

      // 获取物流记录的 shop_id 和 fba_warehouse_number
      let shopId = null;
      let fbaWarehouseNumber = null;
      let logisticsRecord = null;
      try {
        const LogisticsModel = require('../models/LogisticsModel');
        logisticsRecord = await LogisticsModel.findById(logisticsId);
        if (logisticsRecord) {
          shopId = logisticsRecord.shop_id || null;
          fbaWarehouseNumber = logisticsRecord.fba_warehouse_number || null;
        }
      } catch (err) {
        console.error('[Logistics] 获取物流记录失败:', err.message);
      }

      if (!fbaWarehouseNumber) {
        return res.status(400).json({
          code: 400,
          message: '物流记录缺少FBA仓库编号，无法同步到商品',
          data: null
        });
      }

      const xlsx = require('xlsx');
      const workbook = xlsx.readFile(filePath);

      // 优先使用包含 "template" 的 sheet
      const sheetName = workbook.SheetNames.find(name => /template/i.test(name)) || workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      // 跳过说明文字行，找到真正的表头行
      const skipKeywords = [
        '如何', '使用', '步骤', '第', 'instructions', 'step', '注意', 'warning', '请先',
        '点击', '选项卡', 'Create workflow', 'example', '选填', '必填'
      ];
      let headerRowIndex = 0;
      for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length === 0) continue;
        const firstCell = row[0] ? String(row[0]).trim() : '';
        if (!firstCell) continue;
        const isInstructionRow = skipKeywords.some(kw => firstCell.includes(kw));
        if (!isInstructionRow) {
          headerRowIndex = i;
          break;
        }
      }

      const headerRow = rawData[headerRowIndex] || [];
      const dataRows = rawData.slice(headerRowIndex + 1);

      // 构建表头和数据（列名作为key）
      const headers = headerRow.map((h, i) => h !== '' && h !== null ? String(h).trim() : `列${i + 1}`);

      const skuData = dataRows.map(row => {
        const obj = {};
        headers.forEach((header, i) => {
          obj[header] = row[i] !== undefined && row[i] !== '' ? String(row[i]) : '';
        });
        return obj;
      }).filter(row => Object.values(row).some(v => v && v !== ''));

      // 处理SKU数据 - 映射文件列名到数据库字段
      const validSkuData = skuData.map(item => {
        return {
          sku_code: item['Merchant SKU'] || item['SKU'] || item['sku_code'] || '',
          sku_name: item['SKU名称'] || item['sku_name'] || '',
          quantity: parseInt(item['Quantity'] || item['数量'] || item['quantity'] || 0),
          unit_price: parseFloat(item['单价'] || item['unit_price'] || 0),
          total_price: parseFloat(item['总价'] || item['total_price'] || 0),
          remarks: item['备注'] || item['remarks'] || ''
        };
      }).filter(item => item.sku_code);

      const success = await LogisticsModel.update(logisticsId, {
        sku_list: JSON.stringify(validSkuData)
      });

      if (!success) {
        return res.status(404).json({
          code: 404,
          message: '物流记录未找到',
          data: null
        });
      }

      // 同步 SKU 到商品主表（amazon_products）
      // 覆盖更新（按 SKU + 批次匹配），未匹配到则新建
      try {
        const ProductModel = require('../models/ProductModel');
        const result = await ProductModel.syncFromLogistics(
          validSkuData,
          parseInt(logisticsId),
          fbaWarehouseNumber,
          shopId
        );
        console.log(`[Logistics] 商品同步完成: 更新${result.updated}条，新建${result.inserted}条`);
      } catch (syncError) {
        console.error('[Logistics] amazon_products 同步失败:', syncError.message);
      }

      // 写库存变动日志
      try {
        const InventoryChangeService = require('../services/InventoryChangeService');
        const logSvc = new InventoryChangeService('logistics', {
          operatorId: req.user ? req.user.id : null,
          operatorName: req.user ? (req.user.realName || req.user.username) : '',
          referenceId: String(logisticsId),
          remarks: `物流记录#${logisticsId}上传SKU`
        });
        await logSvc.logUpload(validSkuData, { referenceId: String(logisticsId) });
      } catch (logError) {
        console.error('[Logistics] 写库存日志失败:', logError.message);
      }

      res.json({
        code: 200,
        message: '上传成功',
        data: {
          success: validSkuData.length
        }
      });
    } catch (error) {
      console.error('[Logistics] 更新SKU列表错误:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 预览SKU文件内容（不保存）
   */
  async previewSkuList(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ code: 400, message: '请选择要上传的文件', data: null });
      }

      const { path: filePath } = req.file;
      const xlsx = require('xlsx');
      const workbook = xlsx.readFile(filePath);

      // 优先使用包含 "template" 的 sheet（亚马逊 Send to Amazon 格式）
      const sheetName = workbook.SheetNames.find(name => /template/i.test(name)) || workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // 将工作表转换为原始行列数组
      const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      // 跳过说明文字行，找到真正的表头行
      const skipKeywords = [
        '如何', '使用', '步骤', '第', 'instructions', 'step', '注意', 'warning', '请先',
        '点击', '选项卡', 'Create workflow', 'example', '选填', '必填'
      ];
      let headerRowIndex = 0;
      for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length === 0) continue;
        const firstCell = row[0] ? String(row[0]).trim() : '';
        if (!firstCell) continue;
        const isInstructionRow = skipKeywords.some(kw => firstCell.includes(kw));
        if (!isInstructionRow) {
          headerRowIndex = i;
          break;
        }
      }

      const headerRow = rawData[headerRowIndex] || [];
      const dataRows = rawData.slice(headerRowIndex + 1);

      // 构建表头和数据
      const headers = headerRow.map((h, i) => h !== '' && h !== null ? String(h).trim() : `列${i + 1}`);

      const rows = dataRows.map(row => {
        const obj = {};
        headers.forEach((header, i) => {
          obj[header] = row[i] !== undefined && row[i] !== '' ? String(row[i]) : '';
        });
        return obj;
      }).filter(row => Object.values(row).some(v => v && v !== ''));

      res.json({
        code: 200,
        message: '预览成功',
        data: {
          headers,
          rows: rows.slice(0, 100),
          totalRows: rows.length
        }
      });
    } catch (error) {
      console.error('[Logistics] previewSkuList error:', error.message, error.stack);
      res.status(500).json({ code: 500, message: `解析失败: ${error.message}`, data: null });
    }
  }

  /**
   * 将物流SKU列表同步到商品主表
   * 基于已有 sku_list 数据，覆盖更新商品数量和店铺信息
   */
  async syncProducts(req, res) {
    try {
      const { id } = req.params;

      const LogisticsModel = require('../models/LogisticsModel');
      const logisticsRecord = await LogisticsModel.findById(id);

      if (!logisticsRecord) {
        return res.status(404).json({ code: 404, message: '物流记录未找到', data: null });
      }

      const { fba_warehouse_number, shop_id, sku_list } = logisticsRecord;

      if (!fba_warehouse_number) {
        return res.status(400).json({
          code: 400,
          message: '该物流记录缺少FBA仓库编号，无法同步到商品',
          data: null
        });
      }

      if (!sku_list) {
        return res.status(400).json({
          code: 400,
          message: '该物流记录没有SKU数据，请先上传SKU文件',
          data: null
        });
      }

      let skuItems = [];
      try {
        skuItems = typeof sku_list === 'string' ? JSON.parse(sku_list) : sku_list;
      } catch (e) {
        return res.status(400).json({ code: 400, message: 'SKU列表数据格式错误', data: null });
      }

      if (!Array.isArray(skuItems) || skuItems.length === 0) {
        return res.status(400).json({ code: 400, message: 'SKU列表为空', data: null });
      }

      // 调用 ProductModel 的同步方法
      const ProductModel = require('../models/ProductModel');
      const result = await ProductModel.syncFromLogistics(
        skuItems,
        parseInt(id),
        fba_warehouse_number,
        shop_id
      );

      // 写日志
      try {
        const InventoryChangeService = require('../services/InventoryChangeService');
        const logSvc = new InventoryChangeService('logistics', {
          operatorId: req.user ? req.user.id : null,
          operatorName: req.user ? (req.user.realName || req.user.username) : '',
          referenceId: String(id),
          remarks: `手动同步物流#${id} SKU到商品主表`
        });
        await logSvc.logUpload(skuItems, { referenceId: String(id) });
      } catch (logError) {
        console.error('[Logistics] 同步商品写日志失败:', logError.message);
      }

      res.json({
        code: 200,
        message: `同步完成：更新${result.updated}条，新建${result.inserted}条`,
        data: { updated: result.updated, inserted: result.inserted }
      });
    } catch (error) {
      console.error('[Logistics] syncProducts 错误:', error);
      res.status(500).json({ code: 500, message: `服务器内部错误: ${error.message}`, data: null });
    }
  }
}

module.exports = new LogisticsController();