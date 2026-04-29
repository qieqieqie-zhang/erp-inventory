const ProductNameSkuMappingModel = require('../models/ProductNameSkuMappingModel');
const ProductModel = require('../models/ProductModel');

class ProductNameSkuMappingController {
  /**
   * 获取映射列表
   */
  async getList(req, res) {
    try {
      const {
        page = 1,
        pageSize = 20,
        shop_id = '',
        search = ''
      } = req.query;

      const result = await ProductNameSkuMappingModel.getList({
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        shop_id: shop_id ? parseInt(shop_id) : null,
        search
      });

      res.json({
        code: 200,
        message: '获取成功',
        data: result
      });
    } catch (error) {
      console.error('获取映射列表错误:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 创建或更新映射
   */
  async upsert(req, res) {
    try {
      const { shop_id, product_name_cn, seller_sku } = req.body;

      if (!shop_id || !product_name_cn || !seller_sku) {
        return res.status(400).json({
          code: 400,
          message: '店铺ID、中文名称、seller_sku 都不能为空',
          data: null
        });
      }

      await ProductNameSkuMappingModel.upsert({ shop_id, product_name_cn, seller_sku });

      res.json({
        code: 200,
        message: '保存成功',
        data: null
      });
    } catch (error) {
      console.error('保存映射错误:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 删除映射
   */
  async delete(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          code: 400,
          message: 'ID不能为空',
          data: null
        });
      }

      await ProductNameSkuMappingModel.delete(parseInt(id));

      res.json({
        code: 200,
        message: '删除成功',
        data: null
      });
    } catch (error) {
      console.error('删除映射错误:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 批量导入映射（从已有商品资料导入）
   */
  async importFromProducts(req, res) {
    try {
      const { shop_id } = req.body;

      if (!shop_id) {
        return res.status(400).json({
          code: 400,
          message: '店铺ID不能为空',
          data: null
        });
      }

      // 从商品资料表获取有完整映射的数据
      const products = await ProductModel.getProductList({
        page: 1,
        pageSize: 1000,
        shop_id
      });

      let imported = 0;
      let skipped = 0;

      for (const p of products) {
        if (p.seller_sku && p.product_name_cn) {
          try {
            await ProductNameSkuMappingModel.upsert({
              shop_id: parseInt(shop_id),
              product_name_cn: p.product_name_cn,
              seller_sku: p.seller_sku
            });
            imported++;
          } catch (e) {
            skipped++;
          }
        } else {
          skipped++;
        }
      }

      res.json({
        code: 200,
        message: `导入完成：成功${imported}条，跳过${skipped}条`,
        data: { imported, skipped }
      });
    } catch (error) {
      console.error('导入映射错误:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }
}

module.exports = new ProductNameSkuMappingController();
