/**
 * 库存变动日志服务（统一切面）
 * 所有库存写操作都通过此类代理，自动记录 sku_inventory_logs
 *
 * 使用方式：
 *   const svc = new InventoryChangeService('logistics');
 *   await svc.write(skuCode, 'upload', beforeQty, afterQty, { operatorId, operatorName, referenceId, remarks });
 *
 * 模块标识：
 *   logistics      - 物流跟踪
 *   fba_inventory  - FBA库存
 *   fba_reserved   - FBA预留
 */
const SkuInventoryLogModel = require('../models/SkuInventoryLogModel');

class InventoryChangeService {
  /**
   * @param {string} module - 模块标识
   * @param {Object} defaultMeta - 默认元数据
   */
  constructor(module, defaultMeta = {}) {
    this.module = module;
    this.defaultMeta = defaultMeta;
  }

  /**
   * 记录库存变动日志
   * @param {Object} params
   * @param {string} params.skuCode - SKU编号
   * @param {string} params.action - 操作类型: upload/delete/update/status_change
   * @param {number} params.beforeQty - 变动前数量
   * @param {number} params.afterQty - 变动后数量
   * @param {Object} [params.meta] - 元数据: operatorId, operatorName, referenceId, remarks
   */
  async log({ skuCode, action, beforeQty, afterQty, meta = {} }) {
    const { operatorId = null, operatorName = '', referenceId = '', remarks = '' } = { ...this.defaultMeta, ...meta };
    const changeAmount = afterQty - beforeQty;

    // 过滤掉无效的SKU或无变动
    if (!skuCode || (!beforeQty && !afterQty)) return;

    try {
      await SkuInventoryLogModel.log({
        sku_code: skuCode,
        module: this.module,
        action,
        before_quantity: beforeQty,
        after_quantity: afterQty,
        change_amount: changeAmount,
        remarks: remarks || `${this._getModuleName()} ${this._getActionName(action)}`,
        operator_id: operatorId,
        operator_name: operatorName,
        reference_id: referenceId || ''
      });
    } catch (error) {
      console.error(`[InventoryChangeService] 写日志失败 [${this.module}]:`, error.message);
    }
  }

  /**
   * 批量记录库存变动日志
   * @param {Array} changes - [{ skuCode, action, beforeQty, afterQty, meta }]
   */
  async logBatch(changes) {
    for (const change of changes) {
      await this.log(change);
    }
  }

  /**
   * 在写操作后自动记录日志（需外部传入操作结果）
   * @param {string} skuCode
   * @param {string} action
   * @param {number} beforeQty
   * @param {number} afterQty
   * @param {Object} meta
   */
  async logAfterWrite(skuCode, action, beforeQty, afterQty, meta = {}) {
    await this.log({ skuCode, action, beforeQty, afterQty, meta });
  }

  /**
   * 上传写入后自动记录日志
   * @param {Array} items - 上传的SKU项目列表 [{ sku_code, quantity }]
   * @param {Object} meta
   */
  async logUpload(items, meta = {}) {
    const changes = items.map(item => ({
      skuCode: item.sku_code || item.seller_sku || item.sellerSku || '',
      action: 'upload',
      beforeQty: 0,
      afterQty: parseInt(item.quantity || item.available_quantity || item.total_reserved || 0),
      meta
    })).filter(c => c.skuCode);
    await this.logBatch(changes);
  }

  /**
   * 删除操作后自动记录日志
   * @param {Array} items - 被删除的SKU项目列表
   * @param {number} beforeQty - 删除前的数量
   * @param {Object} meta
   */
  async logDelete(items, beforeQty = 0, meta = {}) {
    const changes = items.map(item => ({
      skuCode: item.sku_code || item.seller_sku || item.sellerSku || '',
      action: 'delete',
      beforeQty: beforeQty,
      afterQty: 0,
      meta
    })).filter(c => c.skuCode);
    await this.logBatch(changes);
  }

  _getModuleName() {
    const map = { logistics: '物流', fba_inventory: 'FBA库存', fba_reserved: 'FBA预留' };
    return map[this.module] || this.module;
  }

  _getActionName(action) {
    const map = { upload: '上传', delete: '删除', update: '更新', status_change: '状态变更' };
    return map[action] || action;
  }
}

module.exports = InventoryChangeService;
