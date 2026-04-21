const FileParser = require('../utils/fileParser');
const FBAReservedModel = require('../models/FBAReservedModel');
const UploadLogModel = require('../models/UploadLogModel');

class FBAReservedController {
  /**
   * 上传FBA预留库存文件
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
        parsedData = FileParser.autoParseFile(filePath, [
          'seller-sku', 'item-name', 'asin'
        ]);
      } catch (parseError) {
        return res.status(400).json({
          code: 400,
          message: `文件解析失败: ${parseError.message}`,
          data: null
        });
      }

      // 验证SKU数据
      const { validData, invalidData } = FileParser.validateSkuData(parsedData.data, 'seller-sku');

      if (validData.length === 0) {
        return res.status(400).json({
          code: 400,
          message: '文件中没有有效的SKU数据',
          data: null
        });
      }

      // 生成上传批次
      const uploadBatch = `FBA_RSV_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      // 保存到数据库
      const result = await FBAReservedModel.bulkUpsert(validData, uploadBatch);

      // 写库存变动日志
      try {
        const InventoryChangeService = require('../services/InventoryChangeService');
        const logSvc = new InventoryChangeService('fba_reserved', {
          operatorId: req.user ? req.user.id : null,
          operatorName: req.user ? (req.user.realName || req.user.username) : '',
          referenceId: uploadBatch,
          remarks: `FBA预留库存上传，批次${uploadBatch}`
        });
        await logSvc.logUpload(validData, { referenceId: uploadBatch });
      } catch (logError) {
        console.error('[FBAReserved] 写库存日志失败:', logError.message);
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
        module: 'fba_reserved',
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
      console.error('FBA预留库存上传错误:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 获取FBA预留库存列表
   */
  async getList(req, res) {
    try {
      const {
        page = 1,
        pageSize = 20,
        search = '',
        minReserved = '',
        maxReserved = ''
      } = req.query;

      // 构建查询选项
      const options = {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        search: search
      };

      // 预留数量过滤
      if (minReserved !== '') {
        options.minReserved = parseInt(minReserved);
      }
      if (maxReserved !== '') {
        options.maxReserved = parseInt(maxReserved);
      }

      // 获取数据
      const [reserved, total] = await Promise.all([
        FBAReservedModel.getReservedList(options),
        FBAReservedModel.countReserved(options)
      ]);

      // 项目类型列表（用于筛选器）
      const projectTypes = await FBAReservedModel.query(
        'SELECT DISTINCT project_type FROM amazon_fba_reserved WHERE project_type IS NOT NULL AND project_type != "" ORDER BY project_type'
      ).then(rows => rows.map(row => row.project_type));

      res.json({
        code: 200,
        message: '获取成功',
        data: {
          list: reserved,
          projectTypes: projectTypes,
          pagination: {
            page: options.page,
            pageSize: options.pageSize,
            total: total,
            totalPages: Math.ceil(total / options.pageSize)
          }
        }
      });
    } catch (error) {
      console.error('获取FBA预留库存列表错误:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 获取FBA预留库存统计信息
   */
  async getStats(req, res) {
    try {
      const stats = await FBAReservedModel.getReservedStats();
      
      res.json({
        code: 200,
        message: '获取成功',
        data: stats
      });
    } catch (error) {
      console.error('获取FBA预留库存统计错误:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 导出FBA预留库存数据
   */
  async exportData(req, res) {
    try {
      const { format = 'json' } = req.query;

      // 获取所有预留库存数据
      const reserved = await FBAReservedModel.getReservedList({
        page: 1,
        pageSize: 10000 // 导出大量数据
      });

      if (format === 'csv') {
        // 生成CSV
        const headers = [
          'SKU', '商品名称', 'ASIN', 'FNSKU', '总预留数量',
          '买家订单预留', '调仓预留', '仓库处理预留', '项目类型'
        ];
        
        const csvRows = [headers.join(',')];
        
        reserved.forEach(item => {
          const row = [
            item.seller_sku,
            `"${item.item_name || ''}"`,
            item.asin,
            item.fnsku,
            item.total_reserved,
            item.customer_order_reserved,
            item.transfer_reserved,
            item.warehouse_processing_reserved,
            item.project_type
          ];
          csvRows.push(row.join(','));
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=fba_reserved_${Date.now()}.csv`);
        return res.send(csvRows.join('\n'));
      } else {
        // 默认返回JSON
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=fba_reserved_${Date.now()}.json`);
        return res.json(reserved);
      }
    } catch (error) {
      console.error('导出FBA预留库存数据错误:', error);
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

      const item = await FBAReservedModel.findBySku(sku);
      
      if (!item) {
        return res.status(404).json({
          code: 404,
          message: '未找到该SKU的FBA预留库存记录',
          data: null
        });
      }

      res.json({
        code: 200,
        message: '获取成功',
        data: item
      });
    } catch (error) {
      console.error('获取FBA预留库存详情错误:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 获取预留类型分布
   */
  async getReservationTypeDistribution(req, res) {
    try {
      const distribution = await FBAReservedModel.query(`
        SELECT 
          project_type,
          COUNT(*) as sku_count,
          SUM(total_reserved) as total_reserved,
          SUM(customer_order_reserved) as total_customer,
          SUM(transfer_reserved) as total_transfer,
          SUM(warehouse_processing_reserved) as total_warehouse
        FROM amazon_fba_reserved
        WHERE project_type IS NOT NULL AND project_type != ''
        GROUP BY project_type
        ORDER BY total_reserved DESC
      `);
      
      res.json({
        code: 200,
        message: '获取成功',
        data: distribution
      });
    } catch (error) {
      console.error('获取预留类型分布错误:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }
}

module.exports = new FBAReservedController();