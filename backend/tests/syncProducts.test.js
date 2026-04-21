const request = require('supertest');
const app = require('../app');

// Mock the models
jest.mock('../models/LogisticsModel', () => ({
  findById: jest.fn()
}));

jest.mock('../models/ProductModel', () => ({
  syncFromLogistics: jest.fn()
}));

jest.mock('../services/InventoryChangeService', () => {
  return jest.fn().mockImplementation(() => ({
    logUpload: jest.fn()
  }));
});

// Mock auth middleware to set user
jest.mock('../middleware/auth.middleware', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 1, username: 'admin', realName: '管理员' };
    next();
  },
  authorizeRoles: () => (req, res, next) => next()
}));

const LogisticsModel = require('../models/LogisticsModel');
const ProductModel = require('../models/ProductModel');

describe('物流同步商品功能测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/logistics/sync-products/:id', () => {
    test('同步成功 - 更新已有商品', async () => {
      const logisticsRecord = {
        id: 144,
        fba_warehouse_number: 'MIT-001',
        shop_id: 16,
        sku_list: JSON.stringify([
          { sku_code: 'SKU001', sku_name: '商品1', quantity: 100 },
          { sku_code: 'SKU002', sku_name: '商品2', quantity: 50 }
        ])
      };

      LogisticsModel.findById.mockResolvedValue(logisticsRecord);
      ProductModel.syncFromLogistics.mockResolvedValue({ updated: 2, inserted: 0 });

      const res = await request(app)
        .post('/api/logistics/sync-products/144')
        .expect(200);

      expect(res.body.code).toBe(200);
      expect(res.body.message).toContain('更新2条');
      expect(ProductModel.syncFromLogistics).toHaveBeenCalledWith(
        expect.any(Array),
        144,
        'MIT-001',
        16
      );
    });

    test('同步成功 - 新建商品', async () => {
      const logisticsRecord = {
        id: 145,
        fba_warehouse_number: 'MIT-002',
        shop_id: 16,
        sku_list: JSON.stringify([
          { sku_code: 'NEW-SKU', sku_name: '新商品', quantity: 30 }
        ])
      };

      LogisticsModel.findById.mockResolvedValue(logisticsRecord);
      ProductModel.syncFromLogistics.mockResolvedValue({ updated: 0, inserted: 1 });

      const res = await request(app)
        .post('/api/logistics/sync-products/145')
        .expect(200);

      expect(res.body.code).toBe(200);
      expect(res.body.message).toContain('新建1条');
    });

    test('物流记录不存在 - 返回404', async () => {
      LogisticsModel.findById.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/logistics/sync-products/999')
        .expect(404);

      expect(res.body.code).toBe(404);
      expect(res.body.message).toContain('未找到');
    });

    test('缺少FBA仓库编号 - 返回400', async () => {
      const logisticsRecord = {
        id: 146,
        fba_warehouse_number: null,
        shop_id: 16,
        sku_list: JSON.stringify([{ sku_code: 'SKU001' }])
      };

      LogisticsModel.findById.mockResolvedValue(logisticsRecord);

      const res = await request(app)
        .post('/api/logistics/sync-products/146')
        .expect(400);

      expect(res.body.code).toBe(400);
      expect(res.body.message).toContain('FBA仓库编号');
    });

    test('SKU列表为空 - 返回400', async () => {
      const logisticsRecord = {
        id: 147,
        fba_warehouse_number: 'MIT-003',
        shop_id: 16,
        sku_list: null
      };

      LogisticsModel.findById.mockResolvedValue(logisticsRecord);

      const res = await request(app)
        .post('/api/logistics/sync-products/147')
        .expect(400);

      expect(res.body.code).toBe(400);
      expect(res.body.message).toContain('SKU数据');
    });

    test('SKU列表格式错误 - 返回400', async () => {
      const logisticsRecord = {
        id: 148,
        fba_warehouse_number: 'MIT-004',
        shop_id: 16,
        sku_list: 'invalid-json'
      };

      LogisticsModel.findById.mockResolvedValue(logisticsRecord);

      const res = await request(app)
        .post('/api/logistics/sync-products/148')
        .expect(400);

      expect(res.body.code).toBe(400);
      expect(res.body.message).toContain('格式错误');
    });

    test('SKU列表为空数组 - 返回400', async () => {
      const logisticsRecord = {
        id: 149,
        fba_warehouse_number: 'MIT-005',
        shop_id: 16,
        sku_list: JSON.stringify([])
      };

      LogisticsModel.findById.mockResolvedValue(logisticsRecord);

      const res = await request(app)
        .post('/api/logistics/sync-products/149')
        .expect(400);

      expect(res.body.code).toBe(400);
      expect(res.body.message).toContain('空');
    });

    test('ProductModel.syncFromLogistics抛出异常 - 返回500', async () => {
      const logisticsRecord = {
        id: 150,
        fba_warehouse_number: 'MIT-006',
        shop_id: 16,
        sku_list: JSON.stringify([{ sku_code: 'SKU001' }])
      };

      LogisticsModel.findById.mockResolvedValue(logisticsRecord);
      ProductModel.syncFromLogistics.mockRejectedValue(new Error('数据库错误'));

      const res = await request(app)
        .post('/api/logistics/sync-products/150')
        .expect(500);

      expect(res.body.code).toBe(500);
      expect(res.body.message).toContain('服务器内部错误');
    });

    test('同步时传递正确的物流ID和仓库编号', async () => {
      const logisticsRecord = {
        id: 151,
        fba_warehouse_number: 'WAREHOUSE-X',
        shop_id: 20,
        sku_list: JSON.stringify([
          { sku_code: 'TEST-SKU', sku_name: '测试商品' }
        ])
      };

      LogisticsModel.findById.mockResolvedValue(logisticsRecord);
      ProductModel.syncFromLogistics.mockResolvedValue({ updated: 1, inserted: 0 });

      await request(app)
        .post('/api/logistics/sync-products/151')
        .expect(200);

      // 验证传递的参数正确
      expect(ProductModel.syncFromLogistics).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ sku_code: 'TEST-SKU' })]),
        151,                    // 物流记录ID
        'WAREHOUSE-X',         // FBA仓库编号
        20                     // 店铺ID
      );
    });
  });
});
