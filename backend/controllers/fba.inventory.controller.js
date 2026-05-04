const FileParser = require('../utils/fileParser');
const FBAInventoryModel = require('../models/FBAInventoryModel');
const ProductModel = require('../models/ProductModel');
const UploadLogModel = require('../models/UploadLogModel');

/**
 * 库存状态翻译
 */
function translateInventoryStatus(status) {
  const map = {
    'Out of stock': '缺货',
    'Excess': '库存过剩',
    'Excess Stock': '库存过剩',
    'Healthy': '库存健康',
    'Low stock': '库存偏低',
    'Low Stock': '库存偏低',
    'In stock': '有库存',
    'Pending': '处理中'
  };
  return map[status] || status || '-';
}

/**
 * 生成库存标签
 * 优先级：已断货 > 无可售库存 > 亚马逊缺货 > 库存过剩 > 库龄风险 > 高库龄风险 > 不可售异常 > 保留库存偏高 > 有在途 > 仓间调拨中 > 有可恢复保留 > 无销量 > 库存健康
 * @param {Object} item - 库存数据
 * @param {boolean} isDetail - 是否为详情模式，详情模式会显示"亚马逊缺货"标签
 */
function generateInventoryTags(item, isDetail = false) {
  const tags = [];

  // 辅助函数
  const num = (v) => {
    if (v === null || v === undefined || v === '') return 0;
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  };

  // 计算衍生字段
  const available = num(item.available_quantity);
  const unitsShippedT30 = num(item.units_shipped_t30);
  const total_reserved_quantity = num(item.total_reserved_quantity) ||
    (num(item.reserved_fc_transfer) + num(item.reserved_fc_processing) + num(item.reserved_customer_order));
  const unfulfillable = num(item.unfulfillable_quantity);
  const pendingRemoval = num(item.pending_removal_quantity);

  // 181天以上库存
  const aged_inventory_181_plus = num(item.inv_age_181_to_270_days) +
    num(item.inv_age_271_to_365_days) +
    num(item.inv_age_366_to_455_days) +
    num(item.inv_age_456_plus_days);

  // 366天以上库存
  const aged_inventory_366_plus = num(item.inv_age_366_to_455_days) +
    num(item.inv_age_456_plus_days);

  // FBA相关库存（用于判断库龄风险是否有意义）
  const fba_related_inventory = available + total_reserved_quantity + unfulfillable + pendingRemoval;

  // ========== 按优先级生成标签 ==========

  // 1. 已断货：available = 0 && units_shipped_t30 > 0
  if (available === 0 && unitsShippedT30 > 0) {
    tags.push({ label: '已断货', type: 'danger' });
  }

  // 2. 无可售库存：available = 0 && units_shipped_t30 = 0
  if (available === 0 && unitsShippedT30 === 0) {
    tags.push({ label: '无可售库存', type: 'warning' });
  }

  // 3. 亚马逊缺货（仅在详情中体现，列表中与已断货不重复显示）
  if (isDetail && item.fba_inventory_level_health_status === 'Out of stock') {
    // 如果已经有"已断货"标签，不重复显示"亚马逊缺货"
    if (!(available === 0 && unitsShippedT30 > 0)) {
      tags.push({ label: '亚马逊缺货', type: 'danger' });
    }
  }

  // 4. 库存过剩
  if (item.fba_inventory_level_health_status === 'Excess' ||
      item.fba_inventory_level_health_status === 'Excess Stock' ||
      num(item.estimated_excess_quantity) > 0) {
    tags.push({ label: '库存过剩', type: 'warning' });
  }

  // 5. 库龄风险：aged_inventory_181_plus > 0 && fba_related_inventory > 0
  if (aged_inventory_181_plus > 0 && fba_related_inventory > 0) {
    tags.push({ label: '库龄风险', type: 'danger' });
  }

  // 6. 高库龄风险：aged_inventory_366_plus > 0 && fba_related_inventory > 0
  if (aged_inventory_366_plus > 0 && fba_related_inventory > 0) {
    tags.push({ label: '高库龄风险', type: 'danger' });
  }

  // 7. 低于FBA最低库存
  if (num(item.fba_minimum_inventory_level) > 0 && available < num(item.fba_minimum_inventory_level)) {
    tags.push({ label: '低于FBA最低库存', type: 'warning' });
  }

  // 8. 不可售异常
  if (unfulfillable > 0) {
    tags.push({ label: '不可售', type: 'danger' });
  }

  // 9. 保留库存偏高
  if (total_reserved_quantity > available * 0.5 && total_reserved_quantity > 10) {
    tags.push({ label: '保留库存偏高', type: 'warning' });
  }

  // 10. 有在途
  if (num(item.inbound_quantity) > 0) {
    tags.push({ label: '有在途', type: 'primary' });
  }

  // 11. 仓间调拨中
  if (num(item.reserved_fc_transfer) > 0) {
    tags.push({ label: '仓间调拨中', type: 'info' });
  }

  // 12. 有可恢复保留库存
  if (num(item.reserved_fc_transfer) + num(item.reserved_fc_processing) > 0) {
    tags.push({ label: '有可恢复保留', type: 'primary' });
  }

  // 13. 无销量（仅在有可售库存且无销量时）
  if (available > 0 && unitsShippedT30 === 0) {
    tags.push({ label: '无销量', type: 'info' });
  }

  // 14. 库存健康
  if (item.fba_inventory_level_health_status === 'Healthy' ||
      (num(item.days_of_supply) >= 45 && num(item.days_of_supply) <= 90 &&
       unitsShippedT30 > 0 && num(item.estimated_excess_quantity) <= 0)) {
    tags.push({ label: '库存健康', type: 'success' });
  }

  return tags;
}

/**
 * 生成运营建议（基于优先级）
 */
function generateOperationalSuggestion(item) {
  const suggestions = [];
  const num = (v) => {
    if (v === null || v === undefined || v === '') return 0;
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  };

  const available = num(item.available_quantity);
  const inbound = num(item.inbound_quantity);
  const fcTransfer = num(item.reserved_fc_transfer);
  const fcProcessing = num(item.reserved_fc_processing);
  const unitsShippedT30 = num(item.units_shipped_t30);
  const unfulfillable = num(item.unfulfillable_quantity);
  const pendingRemoval = num(item.pending_removal_quantity);
  const total_reserved_quantity = num(item.total_reserved_quantity) ||
    (fcTransfer + fcProcessing + num(item.reserved_customer_order));

  // 补货判断库存 = available + inbound + fcTransfer + fcProcessing
  const replenishmentCoverInventory = available + inbound + fcTransfer + fcProcessing;

  // 181天以上库存
  const aged_inventory_181_plus = num(item.inv_age_181_to_270_days) +
    num(item.inv_age_271_to_365_days) +
    num(item.inv_age_366_to_455_days) +
    num(item.inv_age_456_plus_days);

  // FBA相关库存
  const fba_related_inventory = available + total_reserved_quantity + unfulfillable + pendingRemoval;

  // 立即可售天数
  const dailySales = unitsShippedT30 / 30;
  const immediateCoverDays = dailySales > 0 ? available / dailySales : null;
  // 含保留调拨可售天数
  const estimatedCoverDaysWithReserved = dailySales > 0
    ? replenishmentCoverInventory / dailySales
    : null;

  // ========== 按优先级生成建议 ==========

  // 优先级1: available = 0 && units_shipped_t30 > 0（已断货）
  if (available === 0 && unitsShippedT30 > 0) {
    if (replenishmentCoverInventory === 0) {
      suggestions.push('当前可售库存为0，且近30天仍有销量，存在明确断货风险。请检查在途库存、仓间调拨和仓内处理中库存；如果没有可恢复库存，应尽快补货。');
    } else if (fcTransfer > 0) {
      suggestions.push('当前可售库存为0，近30天有销量，但存在仓间调拨库存。建议优先关注调拨释放情况，再决定是否追加补货。');
    } else if (inbound > 0) {
      suggestions.push('当前可售库存为0，近30天有销量，但存在入库中库存。建议跟进入仓情况，确认上架时间。');
    } else {
      suggestions.push('当前可售库存为0，近30天有销量，但存在仓内处理中库存。建议关注处理释放情况。');
    }

    // 如果同时有库龄风险，追加说明
    if (aged_inventory_181_plus > 0) {
      suggestions.push('注意：该SKU虽然当前无可售库存，但仍存在老库存（181天以上）。这些老库存在不可售、保留、移除中或仓内处理状态，请查看详情确认。');
    }
    return suggestions;
  }

  // 优先级2: available = 0 && units_shipped_t30 = 0（无可售库存）
  if (available === 0 && unitsShippedT30 === 0) {
    suggestions.push('当前无可售库存，且近30天无销量。请先确认该SKU是否继续销售；如继续销售，再结合在途和保留库存安排补货。');

    // 如果同时有库龄风险，追加说明
    if (aged_inventory_181_plus > 0 && fba_related_inventory > 0) {
      suggestions.push('注意：该SKU虽然当前无可售库存，但仍存在老库存（181天以上）。这些老库存在不可售、保留、移除中或仓内处理状态，请查看详情确认。');
    }
    return suggestions;
  }

  // 优先级3: available > 0 && immediateCoverDays < 20 && estimatedCoverDaysWithReserved >= 45
  if (immediateCoverDays !== null && immediateCoverDays < 20 &&
      estimatedCoverDaysWithReserved !== null && estimatedCoverDaysWithReserved >= 45) {
    suggestions.push('当前立即可售库存偏低，但含在途和可恢复保留库存后的覆盖天数较充足。建议先观察入仓/调拨释放，谨慎补货，避免多补。');
    return suggestions;
  }

  // 优先级4: available > 0 && immediateCoverDays < 20 && estimatedCoverDaysWithReserved < 45
  if (immediateCoverDays !== null && immediateCoverDays < 20 &&
      estimatedCoverDaysWithReserved !== null && estimatedCoverDaysWithReserved < 45) {
    suggestions.push('当前立即可售库存和综合覆盖天数都偏低，建议结合采购周期安排补货。');
    return suggestions;
  }

  // 优先级5: 过剩风险
  if (num(item.estimated_excess_quantity) > 0) {
    suggestions.push(`当前存在库存过剩风险，预计过剩库存为${item.estimated_excess_quantity}件。建议暂停补货，结合优惠券、降价或广告清货。`);
    return suggestions;
  }

  // 优先级6: 库龄风险
  if (aged_inventory_181_plus > 0 && fba_related_inventory > 0) {
    suggestions.push('当前存在老库存风险（181天以上）。建议优先促销、降价、Outlet或移除库存。');
    return suggestions;
  }

  // 优先级7: 不可售
  if (unfulfillable > 0) {
    suggestions.push('当前有不可售库存。建议查看不可售原因，并处理移除、弃置或重新上架。');
    return suggestions;
  }

  // 优先级8: 无销量（available > 0 && units_shipped_t30 = 0）
  if (available > 0 && unitsShippedT30 === 0) {
    suggestions.push('当前近30天无销量，补货前请先确认该SKU是否继续销售，并检查Listing、价格、广告和库存状态。');
    return suggestions;
  }

  // 如果都没有，给出健康提示
  if (item.fba_inventory_level_health_status === 'Healthy') {
    suggestions.push('库存状态健康，继续保持当前运营策略。');
  } else if (available > 0 && unitsShippedT30 > 0 && num(item.estimated_excess_quantity) <= 0) {
    suggestions.push('库存和销量状态正常，关注库龄变化。');
  } else {
    suggestions.push('库存状态正常，继续保持当前运营策略。');
  }

  return suggestions;
}

/**
 * FBA库存数据映射函数（独立函数，避免this上下文问题）
 */
function mapFbaInventoryItem(item) {
  if (!item) return null;

  // 安全数字转换：null/undefined/空字符串/NaN 都转为 0
  const num = (v) => {
    if (v === null || v === undefined || v === '') return 0;
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  };

  // 总保留库存：优先使用数据库原始值，仅在为空时兜底计算
  const rawTotalReserved = item.total_reserved_quantity;
  const total_reserved_quantity = (rawTotalReserved !== null && rawTotalReserved !== undefined)
    ? num(rawTotalReserved)
    : (num(item.reserved_fc_transfer) + num(item.reserved_fc_processing) + num(item.reserved_customer_order));

  // 衍生字段：可恢复保留库存 = 仓间调拨 + 仓内处理中
  const recoverable_reserved_inventory = num(item.reserved_fc_transfer) + num(item.reserved_fc_processing);

  // 衍生字段：补货判断库存 = 可售 + 入库中 + 仓间调拨 + 仓内处理中
  const replenishment_cover_inventory = num(item.available_quantity) + num(item.inbound_quantity) +
    num(item.reserved_fc_transfer) + num(item.reserved_fc_processing);

  // 近30天日均销量
  const dailySales = num(item.units_shipped_t30) / 30;

  // 衍生字段：含保留调拨可售天数
  const estimated_cover_days_with_reserved = dailySales > 0
    ? Math.round(replenishment_cover_inventory / dailySales)
    : null;

  // 衍生字段：立即可售天数
  const immediate_cover_days = dailySales > 0
    ? Math.round(num(item.available_quantity) / dailySales)
    : null;

  // 衍生字段：181天以上库存
  const aged_inventory_181_plus = num(item.inv_age_181_to_270_days) +
    num(item.inv_age_271_to_365_days) +
    num(item.inv_age_366_to_455_days) +
    num(item.inv_age_456_plus_days);

  // 衍生字段：366天以上库存
  const aged_inventory_366_plus = num(item.inv_age_366_to_455_days) +
    num(item.inv_age_456_plus_days);

  // 衍生字段：FBA相关库存（用于判断库龄风险是否有意义）
  const fba_related_inventory = num(item.available_quantity) + total_reserved_quantity +
    num(item.unfulfillable_quantity) + num(item.pending_removal_quantity);

  // 衍生字段：是否有库龄风险（用于详情展示）
  const has_aged_inventory_risk = aged_inventory_181_plus > 0 && fba_related_inventory > 0;
  const has_high_aged_inventory_risk = aged_inventory_366_plus > 0 && fba_related_inventory > 0;

  const mapped = {
      // 基础信息
      sku: item.seller_sku,
      product_name: item.item_name,
      fnsku: item.fnsku,
      asin: item.asin,
      condition: item.condition_type,
      marketplace: item.marketplace,
      snapshot_date: item.snapshot_date,
      last_updated: item.upload_time || item.snapshot_date,

      // 库存数量
      available: item.available_quantity,
      pending_removal_quantity: item.pending_removal_quantity,
      unfulfillable_quantity: item.unfulfillable_quantity,
      total_reserved_quantity: total_reserved_quantity,
      reserved_fc_transfer: num(item.reserved_fc_transfer),
      reserved_fc_processing: num(item.reserved_fc_processing),
      reserved_customer_order: num(item.reserved_customer_order),
      inbound_quantity: item.inbound_quantity,
      inbound_working: item.inbound_working,
      shipped_quantity: item.shipped_quantity,
      inbound_received: item.inbound_received,

      // 销量件数（用于分析）
      units_shipped_t7: item.units_shipped_t7,
      units_shipped_t30: item.units_shipped_t30,
      units_shipped_t60: item.units_shipped_t60,
      units_shipped_t90: item.units_shipped_t90,

      // 销售额（单独保留）
      sales_last_7_days: item.sales_last_7_days,
      sales_last_30_days: item.sales_last_30_days,
      sales_shipped_last_60_days: item.sales_shipped_last_60_days,
      sales_shipped_last_90_days: item.sales_shipped_last_90_days,

      // 库存状态
      days_of_supply: item.days_of_supply,
      sell_through: item.sell_through,
      estimated_excess_quantity: item.estimated_excess_quantity,
      estimated_storage_cost_next_month: item.estimated_storage_cost_next_month,

      // FBA健康状态
      fba_inventory_level_health_status: item.fba_inventory_level_health_status,
      fba_minimum_inventory_level: item.fba_minimum_inventory_level,

      // 建议
      recommended_action: item.recommended_action,
      recommended_removal_quantity: item.recommended_removal_quantity,
      recommended_ship_in_quantity: item.recommended_ship_in_quantity,
      recommended_ship_in_date: item.recommended_ship_in_date,
      estimated_cost_savings: item.estimated_cost_savings,

      // 价格
      your_price: item.your_price,
      sales_price: item.sales_price,
      lowest_price_new_plus_shipping: item.lowest_price_new_plus_shipping,
      lowest_price_used: item.lowest_price_used,
      featuredoffer_price: item.featuredoffer_price,

      // 库龄
      inv_age_0_to_30_days: item.inv_age_0_to_30_days,
      inv_age_31_to_60_days: item.inv_age_31_to_60_days,
      inv_age_61_to_90_days: item.inv_age_61_to_90_days,
      inv_age_0_to_90_days: item.inv_age_0_to_90_days,
      inv_age_91_to_180_days: item.inv_age_91_to_180_days,
      inv_age_181_to_270_days: item.inv_age_181_to_270_days,
      inv_age_271_to_365_days: item.inv_age_271_to_365_days,
      inv_age_366_to_455_days: item.inv_age_366_to_455_days,
      inv_age_456_plus_days: item.inv_age_456_plus_days,

      // 其他
      alert: item.alert,
      sales_rank: item.sales_rank,
      weeks_of_cover_t30: item.weeks_of_cover_t30,
      weeks_of_cover_t90: item.weeks_of_cover_t90,
      historical_days_of_supply: item.historical_days_of_supply,
      inventory_supply_at_fba: item.inventory_supply_at_fba,
      total_days_supply_open_shipments: item.total_days_supply_open_shipments,
      supplier: item.supplier,
      is_seasonal_next_3_months: item.is_seasonal_next_3_months,
      season_name: item.season_name,
      season_start_date: item.season_start_date,
      season_end_date: item.season_end_date,

      // 库龄附加费
      quantity_ais_181_210_days: item.quantity_ais_181_210_days,
      estimated_ais_181_210_days: item.estimated_ais_181_210_days,
      quantity_ais_211_240_days: item.quantity_ais_211_240_days,
      estimated_ais_211_240_days: item.estimated_ais_211_240_days,
      quantity_ais_241_270_days: item.quantity_ais_241_270_days,
      estimated_ais_241_270_days: item.estimated_ais_241_270_days,
      quantity_ais_271_300_days: item.quantity_ais_271_300_days,
      estimated_ais_271_300_days: item.estimated_ais_271_300_days,
      quantity_ais_301_330_days: item.quantity_ais_301_330_days,
      estimated_ais_301_330_days: item.estimated_ais_301_330_days,
      quantity_ais_331_365_days: item.quantity_ais_331_365_days,
      estimated_ais_331_365_days: item.estimated_ais_331_365_days,
      quantity_ais_366_455_days: item.quantity_ais_366_455_days,
      estimated_ais_366_455_days: item.estimated_ais_366_455_days,
      quantity_ais_456_plus_days: item.quantity_ais_456_plus_days,
      estimated_ais_456_plus_days: item.estimated_ais_456_plus_days,

      // 豁免状态
      exempted_low_inventory_fee: item.exempted_low_inventory_fee,
      low_inventory_fee_applied: item.low_inventory_fee_applied,
      short_term_historical_days: item.short_term_historical_days,
      long_term_historical_days: item.long_term_historical_days,
      inventory_age_snapshot_date: item.inventory_age_snapshot_date,

      // 库存状态中文翻译
      status_text: translateInventoryStatus(item.fba_inventory_level_health_status),

      // 库存标签（详情模式会显示"亚马逊缺货"等额外标签）
      inventoryTags: generateInventoryTags(item, true),

      // 运营建议
      operational_suggestion: generateOperationalSuggestion(item),

      // 衍生字段
      recoverable_reserved_inventory,
      replenishment_cover_inventory,
      estimated_cover_days_with_reserved,
      immediate_cover_days,
      aged_inventory_181_plus,
      aged_inventory_366_plus,
      fba_related_inventory,
      has_aged_inventory_risk,
      has_high_aged_inventory_risk,

      // 保留原始数据用于调试
      _raw: item
    };

    return mapped;
  }

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
        shop_code = '',
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
        marketplace: marketplace,
        shop_code: shop_code
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

      // 使用统一映射函数
      const mappedInventory = inventory.map(item => {
        const mapped = {};
        // 基础信息
        mapped.sku = item.seller_sku;
        mapped.product_name = item.item_name;
        mapped.fnsku = item.fnsku;
        mapped.asin = item.asin;
        mapped.condition = item.condition_type;
        mapped.marketplace = item.marketplace;
        mapped.snapshot_date = item.snapshot_date;
        mapped.last_updated = item.upload_time || item.snapshot_date;

        // 库存数量
        mapped.available = item.available_quantity;
        mapped.pending_removal_quantity = item.pending_removal_quantity;
        mapped.unfulfillable_quantity = item.unfulfillable_quantity;
        mapped.total_reserved_quantity = item.total_reserved_quantity;
        mapped.reserved_fc_transfer = item.reserved_fc_transfer;
        mapped.reserved_fc_processing = item.reserved_fc_processing;
        mapped.reserved_customer_order = item.reserved_customer_order;
        mapped.inbound_quantity = item.inbound_quantity;
        mapped.inbound_working = item.inbound_working;
        mapped.shipped_quantity = item.shipped_quantity;
        mapped.inbound_received = item.inbound_received;

        // 销量件数
        mapped.units_shipped_t7 = item.units_shipped_t7;
        mapped.units_shipped_t30 = item.units_shipped_t30;
        mapped.units_shipped_t60 = item.units_shipped_t60;
        mapped.units_shipped_t90 = item.units_shipped_t90;

        // 销售额
        mapped.sales_last_7_days = item.sales_last_7_days;
        mapped.sales_last_30_days = item.sales_last_30_days;
        mapped.sales_shipped_last_60_days = item.sales_shipped_last_60_days;
        mapped.sales_shipped_last_90_days = item.sales_shipped_last_90_days;

        // 库存状态
        mapped.days_of_supply = item.days_of_supply;
        mapped.sell_through = item.sell_through;
        mapped.estimated_excess_quantity = item.estimated_excess_quantity;
        mapped.estimated_storage_cost_next_month = item.estimated_storage_cost_next_month;

        // FBA健康状态
        mapped.fba_inventory_level_health_status = item.fba_inventory_level_health_status;
        mapped.fba_minimum_inventory_level = item.fba_minimum_inventory_level;

        // 建议
        mapped.recommended_action = item.recommended_action;
        mapped.recommended_removal_quantity = item.recommended_removal_quantity;
        mapped.recommended_ship_in_quantity = item.recommended_ship_in_quantity;
        mapped.recommended_ship_in_date = item.recommended_ship_in_date;
        mapped.estimated_cost_savings = item.estimated_cost_savings;

        // 价格
        mapped.your_price = item.your_price;
        mapped.sales_price = item.sales_price;
        mapped.lowest_price_new_plus_shipping = item.lowest_price_new_plus_shipping;
        mapped.lowest_price_used = item.lowest_price_used;
        mapped.featuredoffer_price = item.featuredoffer_price;

        // 库龄
        mapped.inv_age_0_to_30_days = item.inv_age_0_to_30_days;
        mapped.inv_age_31_to_60_days = item.inv_age_31_to_60_days;
        mapped.inv_age_61_to_90_days = item.inv_age_61_to_90_days;
        mapped.inv_age_0_to_90_days = item.inv_age_0_to_90_days;
        mapped.inv_age_91_to_180_days = item.inv_age_91_to_180_days;
        mapped.inv_age_181_to_270_days = item.inv_age_181_to_270_days;
        mapped.inv_age_271_to_365_days = item.inv_age_271_to_365_days;
        mapped.inv_age_366_to_455_days = item.inv_age_366_to_455_days;
        mapped.inv_age_456_plus_days = item.inv_age_456_plus_days;

        // 其他
        mapped.alert = item.alert;
        mapped.sales_rank = item.sales_rank;
        mapped.weeks_of_cover_t30 = item.weeks_of_cover_t30;
        mapped.weeks_of_cover_t90 = item.weeks_of_cover_t90;
        mapped.historical_days_of_supply = item.historical_days_of_supply;
        mapped.inventory_supply_at_fba = item.inventory_supply_at_fba;
        mapped.total_days_supply_open_shipments = item.total_days_supply_open_shipments;
        mapped.supplier = item.supplier;
        mapped.is_seasonal_next_3_months = item.is_seasonal_next_3_months;
        mapped.season_name = item.season_name;
        mapped.season_start_date = item.season_start_date;
        mapped.season_end_date = item.season_end_date;

        // 库龄附加费
        mapped.quantity_ais_181_210_days = item.quantity_ais_181_210_days;
        mapped.estimated_ais_181_210_days = item.estimated_ais_181_210_days;
        mapped.quantity_ais_211_240_days = item.quantity_ais_211_240_days;
        mapped.estimated_ais_211_240_days = item.estimated_ais_211_240_days;
        mapped.quantity_ais_241_270_days = item.quantity_ais_241_270_days;
        mapped.estimated_ais_241_270_days = item.estimated_ais_241_270_days;
        mapped.quantity_ais_271_300_days = item.quantity_ais_271_300_days;
        mapped.estimated_ais_271_300_days = item.estimated_ais_271_300_days;
        mapped.quantity_ais_301_330_days = item.quantity_ais_301_330_days;
        mapped.estimated_ais_301_330_days = item.estimated_ais_301_330_days;
        mapped.quantity_ais_331_365_days = item.quantity_ais_331_365_days;
        mapped.estimated_ais_331_365_days = item.estimated_ais_331_365_days;
        mapped.quantity_ais_366_455_days = item.quantity_ais_366_455_days;
        mapped.estimated_ais_366_455_days = item.estimated_ais_366_455_days;
        mapped.quantity_ais_456_plus_days = item.quantity_ais_456_plus_days;
        mapped.estimated_ais_456_plus_days = item.estimated_ais_456_plus_days;

        // 豁免状态
        mapped.exempted_low_inventory_fee = item.exempted_low_inventory_fee;
        mapped.low_inventory_fee_applied = item.low_inventory_fee_applied;
        mapped.short_term_historical_days = item.short_term_historical_days;
        mapped.long_term_historical_days = item.long_term_historical_days;
        mapped.inventory_age_snapshot_date = item.inventory_age_snapshot_date;

        // 库存状态中文翻译
        mapped.status_text = translateInventoryStatus(item.fba_inventory_level_health_status);

        // 库存标签
        mapped.inventoryTags = generateInventoryTags(item);

        // 运营建议
        mapped.operational_suggestion = generateOperationalSuggestion(item);

        // 衍生字段
        const num = (v) => {
          if (v === null || v === undefined || v === '') return 0;
          const n = parseFloat(v);
          return isNaN(n) ? 0 : n;
        };
        // 总保留库存：优先使用数据库原始值，仅在为空时兜底计算
        const rawTotalReserved = item.total_reserved_quantity;
        mapped.total_reserved_quantity = (rawTotalReserved !== null && rawTotalReserved !== undefined)
          ? num(rawTotalReserved)
          : (num(item.reserved_fc_transfer) + num(item.reserved_fc_processing) + num(item.reserved_customer_order));
        mapped.reserved_fc_transfer = num(item.reserved_fc_transfer);
        mapped.reserved_fc_processing = num(item.reserved_fc_processing);
        mapped.reserved_customer_order = num(item.reserved_customer_order);

        // 可恢复保留库存 = 仓间调拨 + 仓内处理中
        mapped.recoverable_reserved_inventory = num(item.reserved_fc_transfer) + num(item.reserved_fc_processing);

        // 补货判断库存 = 可售 + 入库中 + 仓间调拨 + 仓内处理中
        mapped.replenishment_cover_inventory = num(item.available_quantity) + num(item.inbound_quantity) +
          num(item.reserved_fc_transfer) + num(item.reserved_fc_processing);

        // 近30天日均销量
        const dailySales = num(item.units_shipped_t30) / 30;

        // 含保留调拨可售天数
        mapped.estimated_cover_days_with_reserved = dailySales > 0
          ? Math.round(mapped.replenishment_cover_inventory / dailySales)
          : null;

        // 立即可售天数
        mapped.immediate_cover_days = dailySales > 0
          ? Math.round(num(item.available_quantity) / dailySales)
          : null;

        // 181天以上库存
        mapped.aged_inventory_181_plus = num(item.inv_age_181_to_270_days) +
          num(item.inv_age_271_to_365_days) +
          num(item.inv_age_366_to_455_days) +
          num(item.inv_age_456_plus_days);

        // 366天以上库存
        mapped.aged_inventory_366_plus = num(item.inv_age_366_to_455_days) +
          num(item.inv_age_456_plus_days);

        // FBA相关库存
        mapped.fba_related_inventory = num(item.available_quantity) + mapped.total_reserved_quantity +
          num(item.unfulfillable_quantity) + num(item.pending_removal_quantity);

        // 是否有库龄风险
        mapped.has_aged_inventory_risk = mapped.aged_inventory_181_plus > 0 && mapped.fba_related_inventory > 0;
        mapped.has_high_aged_inventory_risk = mapped.aged_inventory_366_plus > 0 && mapped.fba_related_inventory > 0;

        // 保留原始数据
        mapped._raw = item;

        return mapped;
      });

      // 参考经营驾驶舱，批量查询中文名称并合并
      const skuList = mappedInventory.map(item => item.sku).filter(Boolean);
      if (skuList.length > 0) {
        const nameMap = await ProductModel.getProductNameMapBySkus(skuList);
        mappedInventory.forEach(item => {
          item.product_name_cn = nameMap[item.sku] || null;
        });
      } else {
        mappedInventory.forEach(item => {
          item.product_name_cn = null;
        });
      }

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
      const { shop_code = '' } = req.query;
      const stats = await FBAInventoryModel.getInventoryStats({ shop_code });
      
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
   * 删除所有FBA库存数据
   */
  async deleteAll(req, res) {
    try {
      await FBAInventoryModel.deleteAll()
      res.json({
        code: 200,
        message: '删除成功',
        data: null
      })
    } catch (error) {
      console.error('删除FBA库存错误:', error)
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      })
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

      // 使用统一映射函数
      const mappedItem = mapFbaInventoryItem(item);

      res.json({
        code: 200,
        message: '获取成功',
        data: mappedItem
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