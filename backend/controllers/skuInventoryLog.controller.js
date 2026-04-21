const SkuInventoryLogModel = require('../models/SkuInventoryLogModel');

class SkuInventoryLogController {
  /**
   * 获取单个 SKU 的库存日志
   */
  async getLogsBySku(req, res) {
    try {
      const { sku } = req.params;
      const { page = 1, pageSize = 20, module = '' } = req.query;

      const result = await SkuInventoryLogModel.getLogsBySku(sku, {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        module
      });

      res.json({ code: 200, message: '获取成功', data: result });
    } catch (error) {
      console.error('获取SKU库存日志错误:', error);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  }

  /**
   * 获取所有库存日志（分页）
   */
  async getAllLogs(req, res) {
    try {
      const { page = 1, pageSize = 20, sku = '', module = '' } = req.query;

      const result = await SkuInventoryLogModel.getAllLogs({
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        sku,
        module
      });

      res.json({ code: 200, message: '获取成功', data: result });
    } catch (error) {
      console.error('获取库存日志列表错误:', error);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  }
}

module.exports = new SkuInventoryLogController();
