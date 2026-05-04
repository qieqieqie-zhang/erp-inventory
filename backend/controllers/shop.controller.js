const shopModel = require('../models/ShopModel');

class ShopController {
  /**
   * 获取店铺列表
   */
  async getList(req, res) {
    try {
      const { page = 1, pageSize = 20, search = '', status = '' } = req.query;
      
      const list = await shopModel.getShopList({
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        search,
        status
      });
      
      const total = await shopModel.countShops({ search, status });
      
      res.json({
        code: 200,
        message: 'success',
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
      console.error('获取店铺列表失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取店铺列表失败: ' + error.message
      });
    }
  }

  /**
   * 获取店铺详情
   */
  async getDetail(req, res) {
    try {
      const { id } = req.params;
      const shop = await shopModel.query(
        'SELECT * FROM shops WHERE id = ?',
        [id]
      );
      
      if (shop.length === 0) {
        return res.status(404).json({
          code: 404,
          message: '店铺不存在'
        });
      }
      
      res.json({
        code: 200,
        message: 'success',
        data: shop[0]
      });
    } catch (error) {
      console.error('获取店铺详情失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取店铺详情失败: ' + error.message
      });
    }
  }

  /**
   * 获取店铺统计
   */
  async getStats(req, res) {
    try {
      const stats = await shopModel.getShopStats();
      res.json({
        code: 200,
        message: 'success',
        data: stats
      });
    } catch (error) {
      console.error('获取店铺统计失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取店铺统计失败: ' + error.message
      });
    }
  }

  /**
   * 创建店铺
   */
  async create(req, res) {
    try {
      const { shop_id, shop_name, shop_code, shop_type, region, marketplace, seller_id, status } = req.body;
      
      if (!shop_name) {
        return res.status(400).json({
          code: 400,
          message: '店铺名称不能为空'
        });
      }
      
      // 检查店铺名称是否已存在
      const existing = await shopModel.findByName(shop_name);
      if (existing) {
        return res.status(400).json({
          code: 400,
          message: '店铺名称已存在'
        });
      }
      
      const shop = await shopModel.createShop({
        shop_id,
        shop_name,
        shop_code,
        shop_type,
        region,
        marketplace,
        seller_id,
        status
      });
      
      res.json({
        code: 200,
        message: '店铺创建成功',
        data: shop
      });
    } catch (error) {
      console.error('创建店铺失败:', error);
      res.status(500).json({
        code: 500,
        message: '创建店铺失败: ' + error.message
      });
    }
  }

  /**
   * 更新店铺
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const { shop_id, shop_name, shop_code, shop_type, region, marketplace, seller_id, status } = req.body;
      
      const shop = await shopModel.query('SELECT * FROM shops WHERE id = ?', [id]);
      if (shop.length === 0) {
        return res.status(404).json({
          code: 404,
          message: '店铺不存在'
        });
      }
      
      const success = await shopModel.updateShop(id, {
        shop_id,
        shop_name,
        shop_code,
        shop_type,
        region,
        marketplace,
        seller_id,
        status
      });
      
      if (success) {
        const updated = await shopModel.query('SELECT * FROM shops WHERE id = ?', [id]);
        res.json({
          code: 200,
          message: '店铺更新成功',
          data: updated[0]
        });
      } else {
        res.status(400).json({
          code: 400,
          message: '更新失败'
        });
      }
    } catch (error) {
      console.error('更新店铺失败:', error);
      res.status(500).json({
        code: 500,
        message: '更新店铺失败: ' + error.message
      });
    }
  }

  /**
   * 删除店铺
   */
  async delete(req, res) {
    try {
      const { id } = req.params;
      
      const shop = await shopModel.query('SELECT * FROM shops WHERE id = ?', [id]);
      if (shop.length === 0) {
        return res.status(404).json({
          code: 404,
          message: '店铺不存在'
        });
      }
      
      // 检查是否有关联商品
      const hasProducts = await shopModel.hasProducts(id);
      if (hasProducts) {
        return res.status(400).json({
          code: 400,
          message: '该店铺下有商品关联，无法删除'
        });
      }
      
      const success = await shopModel.deleteShop(id);
      
      if (success) {
        res.json({
          code: 200,
          message: '店铺删除成功'
        });
      } else {
        res.status(400).json({
          code: 400,
          message: '删除失败'
        });
      }
    } catch (error) {
      console.error('删除店铺失败:', error);
      res.status(500).json({
        code: 500,
        message: '删除店铺失败: ' + error.message
      });
    }
  }

  /**
   * 获取所有店铺（下拉选择用）
   */
  async getAllShops(req, res) {
    try {
      const shops = await shopModel.getAllShops();
      res.json({
        code: 200,
        message: 'success',
        data: shops
      });
    } catch (error) {
      console.error('获取店铺列表失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取店铺列表失败: ' + error.message
      });
    }
  }
}

module.exports = new ShopController();
