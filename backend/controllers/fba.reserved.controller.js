const FileParser = require('../utils/fileParser');
const FBAReservedModel = require('../models/FBAReservedModel');
const UploadLogModel = require('../models/UploadLogModel');

/**
 * 数字安全转换
 */
const num = (v) => {
  if (v === null || v === undefined || v === '') return 0;
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

/**
 * 生成预留状态标签
 * @param {Object} row - 预留库存数据
 * @returns {Array} 标签数组
 */
function getReservedTags(row) {
  const tags = [];

  const reserved_qty = num(row.reserved_qty);
  const reserved_customerorders = num(row.reserved_customerorders);
  const reserved_fc_transfers = num(row.reserved_fc_transfers);
  const reserved_fc_processing = num(row.reserved_fc_processing);

  const reserved_detail_total = reserved_customerorders + reserved_fc_transfers + reserved_fc_processing;
  const reserved_difference = reserved_qty - reserved_detail_total;

  // 客户订单预留
  if (reserved_customerorders > 0) {
    tags.push({ label: '客户订单预留', type: 'blue' });
  }

  // 仓间调拨中
  if (reserved_fc_transfers > 0) {
    tags.push({ label: '仓间调拨中', type: 'cyan' });
  }

  // 仓内处理中
  if (reserved_fc_processing > 0) {
    tags.push({ label: '仓内处理中', type: 'orange' });
  }

  // 高调拨占比
  if (reserved_detail_total > 0) {
    const fc_transfer_ratio = reserved_fc_transfers / reserved_detail_total;
    if (fc_transfer_ratio >= 0.7) {
      tags.push({ label: '高调拨占比', type: 'purple' });
    }

    // 高处理占比
    const fc_processing_ratio = reserved_fc_processing / reserved_detail_total;
    if (fc_processing_ratio >= 0.7) {
      tags.push({ label: '高处理占比', type: 'warning' });
    }

    // 高客户订单占比
    const customer_order_ratio = reserved_customerorders / reserved_detail_total;
    if (customer_order_ratio >= 0.7) {
      tags.push({ label: '高客户订单占比', type: 'primary' });
    }
  }

  // 报告口径差异
  if (reserved_difference !== 0) {
    tags.push({ label: '报告口径差异', type: 'danger' });
  }

  // 无明细原因
  if (reserved_qty > 0 && reserved_detail_total === 0) {
    tags.push({ label: '无明细原因', type: 'info' });
  }

  // 无预留
  if (reserved_qty === 0 && reserved_detail_total === 0) {
    tags.push({ label: '无预留', type: 'gray' });
  }

  return tags;
}

/**
 * 生成主要预留原因
 * @param {Object} row - 预留库存数据
 * @returns {string} 主要原因
 */
function getPrimaryReservedReason(row) {
  const reserved_customerorders = num(row.reserved_customerorders);
  const reserved_fc_transfers = num(row.reserved_fc_transfers);
  const reserved_fc_processing = num(row.reserved_fc_processing);

  const max = Math.max(reserved_customerorders, reserved_fc_transfers, reserved_fc_processing);

  if (max === 0) return '无明细原因';

  if (reserved_customerorders === max && reserved_customerorders > 0) return '客户订单';
  if (reserved_fc_transfers === max && reserved_fc_transfers > 0) return '仓间调拨';
  if (reserved_fc_processing === max && reserved_fc_processing > 0) return '仓内处理';

  return '无明细原因';
}

/**
 * 生成预留原因拆解
 * @param {Object} row - 预留库存数据
 * @returns {Object} 原因拆解
 */
function getReservedReasonBreakdown(row) {
  const reserved_customerorders = num(row.reserved_customerorders);
  const reserved_fc_transfers = num(row.reserved_fc_transfers);
  const reserved_fc_processing = num(row.reserved_fc_processing);

  const reserved_detail_total = reserved_customerorders + reserved_fc_transfers + reserved_fc_processing;

  return {
    customer_order_ratio: reserved_detail_total > 0 ? reserved_customerorders / reserved_detail_total : 0,
    fc_transfer_ratio: reserved_detail_total > 0 ? reserved_fc_transfers / reserved_detail_total : 0,
    fc_processing_ratio: reserved_detail_total > 0 ? reserved_fc_processing / reserved_detail_total : 0
  };
}

/**
 * 生成运营建议
 * @param {Object} row - 预留库存数据
 * @returns {Array} 建议数组
 */
function generateReservedSuggestion(row) {
  const suggestions = [];
  const breakdown = getReservedReasonBreakdown(row);
  const primaryReason = getPrimaryReservedReason(row);
  const reserved_qty = num(row.reserved_qty);
  const reserved_customerorders = num(row.reserved_customerorders);
  const reserved_fc_transfers = num(row.reserved_fc_transfers);
  const reserved_fc_processing = num(row.reserved_fc_processing);
  const reserved_detail_total = reserved_customerorders + reserved_fc_transfers + reserved_fc_processing;
  const reserved_difference = reserved_qty - reserved_detail_total;
  const recoverable_reserved_qty = reserved_fc_transfers + reserved_fc_processing;

  // 可恢复预留提示
  if (recoverable_reserved_qty > 0) {
    suggestions.push('当前SKU存在可恢复预留库存，其中包含仓间调拨或仓内处理库存。补货判断时应结合可售库存、在途库存和可恢复预留库存，避免因available暂时偏低而重复补货。');
  }

  // 客户订单预留提示
  if (reserved_customerorders > 0) {
    suggestions.push('客户订单预留通常已被订单占用，不建议作为未来可卖库存计算。');
  }

  if (breakdown.fc_transfer_ratio >= 0.7) {
    suggestions.push('当前SKU的预留主要来自仓间调拨。库存已在FBA网络内，但短期可能影响可售或配送时效。建议先观察释放情况，避免仅因available偏低而重复补货。');
  }

  if (breakdown.fc_processing_ratio >= 0.7) {
    suggestions.push('当前SKU的预留主要来自仓内处理。可能是接收、测量、分拣、调查或移除流程。建议关注处理时间，如长期不释放可联系亚马逊支持。');
  }

  if (breakdown.customer_order_ratio >= 0.7) {
    suggestions.push('当前SKU的预留主要来自客户订单。通常表示库存已被订单占用，等待付款或发货完成，一般不应作为未来可卖库存计算。');
  }

  if (reserved_difference !== 0) {
    suggestions.push('当前"报告预留总数"和"预留原因明细合计"存在口径差异，请以亚马逊原始报告字段为准，结合明细字段判断预留原因。');
  }

  if (reserved_qty === 0 && reserved_detail_total === 0) {
    suggestions.push('当前SKU暂无预留库存。');
  }

  if (suggestions.length === 0 && primaryReason !== '无明细原因') {
    suggestions.push(`当前SKU主要预留原因为${primaryReason}，请关注释放情况。`);
  }

  return suggestions;
}

/**
 * 映射预留库存数据（添加衍生字段）
 * @param {Object} item - 数据库原始数据
 * @returns {Object} 映射后的数据
 */
function mapReservedItem(item) {
  const reserved_qty = num(item.reserved_qty);
  const reserved_customerorders = num(item.reserved_customerorders);
  const reserved_fc_transfers = num(item.reserved_fc_transfers);
  const reserved_fc_processing = num(item.reserved_fc_processing);

  const reserved_detail_total = reserved_customerorders + reserved_fc_transfers + reserved_fc_processing;
  const reserved_difference = reserved_qty - reserved_detail_total;
  const breakdown = getReservedReasonBreakdown(item);

  // 可恢复预留 = 仓间调拨预留 + 仓内处理预留
  const recoverable_reserved_qty = reserved_fc_transfers + reserved_fc_processing;

  return {
    // 基础字段
    sku: item.sku,
    fnsku: item.fnsku,
    asin: item.asin,
    product_name: item.product_name,
    reserved_qty,
    reserved_customerorders,
    reserved_fc_transfers,
    reserved_fc_processing,
    program: item.program || '-',

    // 衍生字段
    reserved_detail_total,
    reserved_difference,
    recoverable_reserved_qty,
    customer_order_ratio: breakdown.customer_order_ratio,
    fc_transfer_ratio: breakdown.fc_transfer_ratio,
    fc_processing_ratio: breakdown.fc_processing_ratio,
    primary_reserved_reason: getPrimaryReservedReason(item),

    // 状态标签
    reserved_tags: getReservedTags(item),

    // 运营建议
    operational_suggestion: generateReservedSuggestion(item),

    // 原始数据
    _raw: item
  };
}

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
        // 允许 sku 或 seller-sku 作为表头
        parsedData = FileParser.autoParseFile(filePath);
      } catch (parseError) {
        return res.status(400).json({
          code: 400,
          message: `文件解析失败: ${parseError.message}`,
          data: null
        });
      }

      // 验证SKU数据
      const skuColumn = ['sku', 'seller-sku', 'seller_sku'].find(col =>
        parsedData.data.length > 0 && parsedData.data[0].hasOwnProperty(col)
      ) || 'sku';

      const validation = FileParser.validateSkuData(parsedData.data, skuColumn);
      const validData = validation.validData;
      const invalidData = validation.invalidData;

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
        asinSearch = '',
        reasonFilter = '',
        dataStatusFilter = ''
      } = req.query;

      // 构建查询选项
      const options = {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        search: search,
        asinSearch: asinSearch,
        reasonFilter: reasonFilter,
        dataStatusFilter: dataStatusFilter
      };

      // 获取数据
      const [reserved, total] = await Promise.all([
        FBAReservedModel.getReservedList(options),
        FBAReservedModel.countReserved(options)
      ]);

      // 映射数据，添加衍生字段
      const mappedReserved = reserved.map(item => mapReservedItem(item));

      // Program列表（用于筛选器）
      const programs = await FBAReservedModel.query(
        'SELECT DISTINCT program FROM amazon_fba_reserved WHERE program IS NOT NULL AND program != "" ORDER BY program'
      ).then(rows => rows.map(row => row.program));

      res.json({
        code: 200,
        message: '获取成功',
        data: {
          list: mappedReserved,
          programs: programs,
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

      // 检查数据一致性
      const total_reserved_qty = num(stats.total_reserved_qty);
      const detail_total = num(stats.detail_total);
      const is_consistent = total_reserved_qty === detail_total;

      res.json({
        code: 200,
        message: '获取成功',
        data: {
          ...stats,
          detail_total,
          is_data_consistent: is_consistent,
          data_warning: !is_consistent ? '亚马逊报告中的"报告预留总数"和"原因明细合计"可能存在口径差异。详情中可查看数据校验说明。' : null
        }
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
        pageSize: 10000
      });

      // 映射数据
      const mappedReserved = reserved.map(item => mapReservedItem(item));

      if (format === 'csv') {
        // 生成CSV
        const headers = [
          'SKU', '商品名称', 'ASIN', 'FNSKU', '报告预留总数',
          '客户订单预留', '仓间调拨预留', '仓内处理预留',
          '明细合计', '差异', '主要预留原因', 'Program'
        ];

        const csvRows = [headers.join(',')];

        mappedReserved.forEach(item => {
          const row = [
            item.sku,
            `"${item.product_name || ''}"`,
            item.asin,
            item.fnsku,
            item.reserved_qty,
            item.reserved_customerorders,
            item.reserved_fc_transfers,
            item.reserved_fc_processing,
            item.reserved_detail_total,
            item.reserved_difference,
            item.primary_reserved_reason,
            item.program
          ];
          csvRows.push(row.join(','));
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=fba_reserved_${Date.now()}.csv`);
        return res.send(csvRows.join('\n'));
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=fba_reserved_${Date.now()}.json`);
        return res.json(mappedReserved);
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

      // 映射数据
      const mappedItem = mapReservedItem(item);

      res.json({
        code: 200,
        message: '获取成功',
        data: mappedItem
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
   * 清空所有FBA预留库存数据
   */
  async deleteAll(req, res) {
    try {
      await FBAReservedModel.deleteAll();
      res.json({
        code: 200,
        message: '清除成功',
        data: null
      });
    } catch (error) {
      console.error('清除FBA预留库存错误:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }
}

module.exports = new FBAReservedController();
