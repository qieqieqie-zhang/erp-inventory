const FileParser = require('../utils/fileParser');
const FBAInventoryModel = require('../models/FBAInventoryModel');
const UploadLogModel = require('../models/UploadLogModel');

class FBAInventoryController {
  /**
   * 上传FBA库存文件
   */
  async upload(req, res) {
    try {
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
        // 允许 sku 或 seller-sku 作为表头
        parsedData = FileParser.autoParseFile(filePath);
      } catch (parseError) {
        return res.status(400).json({
          code: 400,
          message: `文件解析失败: ${parseError.message}`,
          data: null
        });
      }

      // 验证SKU数据：尝试不同的SKU列名
      let validData = [];
      let invalidData = [];
      
      const skuColumn = ['sku', 'seller-sku', 'seller_sku'].find(col => 
        parsedData.data.length > 0 && parsedData.data[0].hasOwnProperty(col)
      ) || 'sku';

      const validation = FileParser.validateSkuData(parsedData.data, skuColumn);
      validData = validation.validData;
      invalidData = validation.invalidData;

      if (validData.length === 0) {
        return res.status(400).json({
          code: 400,
          message: '文件中没有有效的SKU数据',
          data: null
        });
      }

      // 生成上传批次
      const uploadBatch = `FBA_INV_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      // 保存到数据库
      const result = await FBAInventoryModel.bulkUpsert(validData, uploadBatch);

      // 写库存变动日志
      try {
        const InventoryChangeService = require('../services/InventoryChangeService');
        const logSvc = new InventoryChangeService('fba_inventory', {
          operatorId: req.user ? req.user.id : null,
          operatorName: req.user ? (req.user.realName || req.user.username) : '',
          referenceId: uploadBatch,
          remarks: `FBA库存上传，批次${uploadBatch}`
        });
        await logSvc.logUpload(validData, { referenceId: uploadBatch });
      } catch (logError) {
        console.error('[FBAInventory] 写库存日志失败:', logError.message);
      }

      // 记录上传日志
      let errorFile = null;
      if (invalidData.length > 0) {
        errorFile = FileParser.generateErrorFile(
          invalidData,
          process.env.UPLOAD_DIR || './uploads/errors'
        );
      }

      await UploadLogModel.createLog({
        userId: req.user.id,
        username: req.user.username,
        module: 'fba_inventory',
        filename: filename,
        totalRecords: parsedData.data.length,
        successCount: validData.length,
        failCount: invalidData.length,
        errorFile: errorFile
      });

      // 返回响应
      const response = {
        code: 200,
        message: '上传成功',
        data: {
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
      console.error('FBA库存上传错误:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 获取FBA库存列表
   */
  async getList(req, res) {
    try {
      const {
        page = 1,
        pageSize = 20,
        search = '',
        marketplace = '',
        minAvailable = '',
        maxAvailable = '',
        minDaysSupply = '',
        maxDaysSupply = '',
        lowStock = '',
        zeroStock = ''
      } = req.query;

      // 构建查询选项
      const options = {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        search: search,
        marketplace: marketplace
      };

      // 可用库存过滤
      if (minAvailable !== '') {
        options.minAvailable = parseInt(minAvailable);
      }
      if (maxAvailable !== '') {
        options.maxAvailable = parseInt(maxAvailable);
      }

      // 可供天数过滤
      if (minDaysSupply !== '') {
        options.minDaysSupply = parseInt(minDaysSupply);
      }
      if (maxDaysSupply !== '') {
        options.maxDaysSupply = parseInt(maxDaysSupply);
      }

      // 低库存过滤
      if (lowStock === 'true') {
        options.lowStock = true;
      }

      // 零库存过滤
      if (zeroStock === 'true') {
        options.zeroStock = true;
      }

      // 获取数据
      const [inventory, total] = await Promise.all([
        FBAInventoryModel.getInventoryList(options),
        FBAInventoryModel.countInventory(options)
      ]);

      // 映射字段以适配前端
      const mappedInventory = inventory.map(item => ({
        sku: item.seller_sku,
        product_name: item.item_name,
        fnsku: item.fnsku,
        asin: item.asin,
        total_units: (item.available_quantity || 0) + (item.total_reserved_quantity || 0) + (item.inbound_quantity || 0),
        sellable_units: item.available_quantity || 0,
        reserved_units: item.total_reserved_quantity || 0,
        inbound_units: item.inbound_quantity || 0,
        unit_value: 0, // 数据库中暂时没有单价
        total_value: 0,
        warehouse_code: 'FBA',
        country: item.marketplace,
        inventory_age_days: item.days_of_supply || 0, // 暂时用可供天数代替
        condition: item.condition_type || '全新',
        last_updated: item.upload_time,
        // 新增字段
        snapshot_date: item.snapshot_date,
        fba_minimum_inventory_level: item.fba_minimum_inventory_level,
        fba_inventory_level_health_status: item.fba_inventory_level_health_status,
        recommended_ship_in_quantity: item.recommended_ship_in_quantity,
        recommended_ship_in_date: item.recommended_ship_in_date,
        inventory_supply_at_fba: item.inventory_supply_at_fba,
        reserved_fc_transfer: item.reserved_fc_transfer,
        reserved_fc_processing: item.reserved_fc_processing,
        reserved_customer_order: item.reserved_customer_order
      }));

      // 获取站点列表（用于筛选器）
      const marketplaces = await FBAInventoryModel.query(
        'SELECT DISTINCT marketplace FROM amazon_fba_inventory WHERE marketplace IS NOT NULL AND marketplace != "" ORDER BY marketplace'
      ).then(rows => rows.map(row => row.marketplace));

      res.json({
        code: 200,
        message: '获取成功',
        data: {
          list: mappedInventory,
          marketplaces: marketplaces,
          pagination: {
            page: options.page,
            pageSize: options.pageSize,
            total: total,
            totalPages: Math.ceil(total / options.pageSize)
          }
        }
      });
    } catch (error) {
      console.error('获取FBA库存列表错误:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 获取FBA库存统计信息
   */
  async getStats(req, res) {
    try {
      const stats = await FBAInventoryModel.getInventoryStats();
      
      res.json({
        code: 200,
        message: '获取成功',
        data: stats
      });
    } catch (error) {
      console.error('获取FBA库存统计错误:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 获取库存预警列表
   */
  async getAlerts(req, res) {
    try {
      const alerts = await FBAInventoryModel.getStockAlerts();
      
      res.json({
        code: 200,
        message: '获取成功',
        data: alerts
      });
    } catch (error) {
      console.error('获取库存预警列表错误:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 导出FBA库存数据
   */
  async exportData(req, res) {
    try {
      const { format = 'json' } = req.query;

      // 获取所有库存数据
      const inventory = await FBAInventoryModel.getInventoryList({
        page: 1,
        pageSize: 10000 // 导出大量数据
      });

      if (format === 'csv') {
        // 生成CSV
        const headers = [
          'SKU', '商品名称', 'ASIN', 'FNSKU', '可售库存', '不可售库存',
          '在途库存', '已发货在途', '已接收', '近7天销量', '近30天销量',
          '库存可供天数', '站点', '亚马逊建议', '建议补货量'
        ];
        
        const csvRows = [headers.join(',')];
        
        inventory.forEach(item => {
          const row = [
            item.seller_sku,
            `"${item.item_name || ''}"`,
            item.asin,
            item.fnsku,
            item.available_quantity,
            item.unavailable_quantity,
            item.inbound_quantity,
            item.shipped_quantity,
            item.received_quantity,
            item.sales_last_7_days,
            item.sales_last_30_days,
            item.days_of_supply,
            item.marketplace,
            item.amazon_suggestion,
            item.suggested_replenishment
          ];
          csvRows.push(row.join(','));
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=fba_inventory_${Date.now()}.csv`);
        return res.send(csvRows.join('\n'));
      } else {
        // 默认返回JSON
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=fba_inventory_${Date.now()}.json`);
        return res.json(inventory);
      }
    } catch (error) {
      console.error('导出FBA库存数据错误:', error);
      res.status(500).json({
        code: 500,
        message: '导出失败',
        data: null
      });
    }
  }

  /**
   * 按SKU获取详情
   */
  async getDetail(req, res) {
    try {
      const { sku } = req.params;
      
      if (!sku) {
        return res.status(400).json({
          code: 400,
          message: '请提供SKU参数',
          data: null
        });
      }

      const item = await FBAInventoryModel.findBySku(sku);
      
      if (!item) {
        return res.status(404).json({
          code: 404,
          message: '未找到该SKU的FBA库存记录',
          data: null
        });
      }

      res.json({
        code: 200,
        message: '获取成功',
        data: item
      });
    } catch (error) {
      console.error('获取FBA库存详情错误:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }
}

module.exports = new FBAInventoryController();