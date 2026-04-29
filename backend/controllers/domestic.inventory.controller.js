const domesticInventoryModel = require('../models/DomesticInventoryModel');
const productModel = require('../models/ProductModel');

class DomesticInventoryController {
  /**
   * 获取国内库存列表
   * GET /api/domestic-inventory/list
   */
  async getList(req, res, next) {
    try {
      const { page = 1, pageSize = 20, search = '' } = req.query;

      const list = await domesticInventoryModel.getList({
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        search
      });

      const total = await domesticInventoryModel.count({ search });

      res.json({
        code: 200,
        message: '获取成功',
        data: {
          list,
          pagination: {
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            total
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取单个库存详情
   * GET /api/domestic-inventory/:productNameCn
   */
  async getDetail(req, res, next) {
    try {
      const { productNameCn } = req.params;

      const stock = await domesticInventoryModel.findByProductNameCn(productNameCn);

      if (!stock) {
        return res.json({
          code: 404,
          message: '库存记录不存在',
          data: null
        });
      }

      res.json({
        code: 200,
        message: '获取成功',
        data: stock
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取库存统计
   * GET /api/domestic-inventory/stats
   */
  async getStats(req, res, next) {
    try {
      const stats = await domesticInventoryModel.getStats();

      res.json({
        code: 200,
        message: '获取成功',
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 创建/初始化库存记录
   * POST /api/domestic-inventory
   */
  async create(req, res, next) {
    try {
      const { product_name_cn, on_hand_qty = 0, available_qty = 0 } = req.body;

      if (!product_name_cn) {
        return res.status(400).json({
          code: 400,
          message: '中文名称不能为空'
        });
      }

      // 检查是否已存在
      const existing = await domesticInventoryModel.findByProductNameCn(product_name_cn);
      if (existing) {
        return res.status(400).json({
          code: 400,
          message: '该商品库存记录已存在'
        });
      }

      const data = await domesticInventoryModel.create({
        product_name_cn,
        on_hand_qty,
        available_qty
      });

      res.json({
        code: 200,
        message: '创建成功',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新库存
   * PUT /api/domestic-inventory/:productNameCn
   */
  async update(req, res, next) {
    try {
      const { productNameCn } = req.params;
      const { on_hand_qty, available_qty } = req.body;

      const data = {};
      if (on_hand_qty !== undefined) data.on_hand_qty = on_hand_qty;
      if (available_qty !== undefined) data.available_qty = available_qty;

      const success = await domesticInventoryModel.update(productNameCn, data);

      if (!success) {
        return res.status(404).json({
          code: 404,
          message: '库存记录不存在'
        });
      }

      res.json({
        code: 200,
        message: '更新成功'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 删除库存记录
   * DELETE /api/domestic-inventory/:productNameCn
   */
  async delete(req, res, next) {
    try {
      const { productNameCn } = req.params;

      const success = await domesticInventoryModel.delete(productNameCn);

      if (!success) {
        return res.status(404).json({
          code: 404,
          message: '库存记录不存在'
        });
      }

      res.json({
        code: 200,
        message: '删除成功'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 库存变动（入库/出库/调整）
   * POST /api/domestic-inventory/change
   */
  async changeStock(req, res, next) {
    try {
      const { product_name_cn, change_type, biz_type, quantity, remark, related_doc_type, related_doc_id } = req.body;
      const operator = req.user?.username || 'system';

      if (!product_name_cn || !change_type || !biz_type || !quantity) {
        return res.status(400).json({
          code: 400,
          message: '参数不完整：product_name_cn, change_type, biz_type, quantity 都是必填项'
        });
      }

      if (quantity <= 0) {
        return res.status(400).json({
          code: 400,
          message: '变动数量必须大于0'
        });
      }

      if (!['in', 'out', 'adjust'].includes(change_type)) {
        return res.status(400).json({
          code: 400,
          message: '变动类型必须是 in、out 或 adjust'
        });
      }

      // 验证 biz_type 必须是允许的值
      const validBizTypes = domesticInventoryModel.constructor.getBizTypeList().map(t => t.value);
      if (!validBizTypes.includes(biz_type)) {
        return res.status(400).json({
          code: 400,
          message: '业务类型不合法'
        });
      }

      // 验证 biz_type 与 change_type 的匹配关系
      const inBizTypes = ['purchase', 'return', 'transfer'];
      const outBizTypes = ['order', 'damage', 'return_supplier'];
      if (change_type === 'in' && !inBizTypes.includes(biz_type)) {
        return res.status(400).json({
          code: 400,
          message: '入库类型的变动只能选择：采购入库、退货入库、调拨入库'
        });
      }
      if (change_type === 'out' && !outBizTypes.includes(biz_type)) {
        return res.status(400).json({
          code: 400,
          message: '出库类型的变动只能选择：订单出库、损耗出库、退货给供应商'
        });
      }

      const result = await domesticInventoryModel.changeStock(
        product_name_cn,
        change_type,
        biz_type,
        parseInt(quantity),
        { remark, related_doc_type, related_doc_id, operator }
      );

      res.json({
        code: 200,
        message: '库存变动成功',
        data: result
      });
    } catch (error) {
      if (error.message.includes('不足') || error.message.includes('不存在')) {
        return res.status(400).json({
          code: 400,
          message: error.message
        });
      }
      next(error);
    }
  }

  // ==================== 日志接口 ====================

  /**
   * 获取库存变动日志列表
   * GET /api/domestic-inventory/logs
   */
  async getLogs(req, res, next) {
    try {
      const { page = 1, pageSize = 20, search, product_name_cn, change_type, biz_type, start_date, end_date } = req.query;

      const list = await domesticInventoryModel.getLogList({
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        search,
        productNameCn: product_name_cn,
        changeType: change_type,
        bizType: biz_type,
        startDate: start_date,
        endDate: end_date
      });

      const total = await domesticInventoryModel.countLogs({
        search,
        productNameCn: product_name_cn,
        changeType: change_type,
        bizType: biz_type,
        startDate: start_date,
        endDate: end_date
      });

      res.json({
        code: 200,
        message: '获取成功',
        data: {
          list,
          pagination: {
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            total
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取日志统计
   * GET /api/domestic-inventory/log-stats
   */
  async getLogStats(req, res, next) {
    try {
      const { product_name_cn, start_date, end_date } = req.query;

      const stats = await domesticInventoryModel.getLogStats({
        productNameCn: product_name_cn,
        startDate: start_date,
        endDate: end_date
      });

      res.json({
        code: 200,
        message: '获取成功',
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取业务类型列表
   * GET /api/domestic-inventory/biz-types
   */
  async getBizTypes(req, res, next) {
    try {
      const list = domesticInventoryModel.constructor.getBizTypeList();
      res.json({
        code: 200,
        message: '获取成功',
        data: list
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取变动类型列表
   * GET /api/domestic-inventory/change-types
   */
  async getChangeTypes(req, res, next) {
    try {
      const list = domesticInventoryModel.constructor.getChangeTypeList();
      res.json({
        code: 200,
        message: '获取成功',
        data: list
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DomesticInventoryController();
