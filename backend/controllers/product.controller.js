const FileParser = require('../utils/fileParser');
const ProductModel = require('../models/ProductModel');
const UploadLogModel = require('../models/UploadLogModel');

class ProductController {
  /**
   * 上传商品库存文件
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
      const shop_id = req.body.shop_id || null;
      
      // 解析文件
      let parsedData;
      try {
        parsedData = FileParser.autoParseFile(filePath, [
          'seller-sku', 'item-name', 'quantity'
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
      const uploadBatch = `PRD_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      // 保存到数据库（带上店铺ID）
      const result = await ProductModel.bulkUpsert(validData, uploadBatch, shop_id);

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
        module: 'product',
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
      console.error('商品上传错误:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 获取商品列表
   */
  async getList(req, res) {
    try {
      const {
        page = 1,
        pageSize = 20,
        search = '',
        status = '',
        channel = '',
        shop_id = '',
        minQuantity = '',
        maxQuantity = ''
      } = req.query;

      // 构建查询选项
      const options = {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        search: search,
        status: status,
        channel: channel,
        shop_id: shop_id
      };

      // 数量过滤
      if (minQuantity !== '') {
        options.minQuantity = parseInt(minQuantity);
      }
      if (maxQuantity !== '') {
        options.maxQuantity = parseInt(maxQuantity);
      }

      // 获取数据
      const [products, total] = await Promise.all([
        ProductModel.getProductList(options),
        ProductModel.countProducts(options)
      ]);

      res.json({
        code: 200,
        message: '获取成功',
        data: {
          list: products,
          pagination: {
            page: options.page,
            pageSize: options.pageSize,
            total: total,
            totalPages: Math.ceil(total / options.pageSize)
          }
        }
      });
    } catch (error) {
      console.error('获取商品列表错误:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 获取商品详情
   */
  async getDetail(req, res) {
    try {
      const { sku } = req.params;

      if (!sku) {
        return res.status(400).json({
          code: 400,
          message: 'SKU不能为空',
          data: null
        });
      }

      const product = await ProductModel.findBySku(sku);
      if (!product) {
        return res.status(404).json({
          code: 404,
          message: '商品不存在',
          data: null
        });
      }

      res.json({
        code: 200,
        message: '获取成功',
        data: product
      });
    } catch (error) {
      console.error('获取商品详情错误:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 获取商品统计信息
   */
  async getStats(req, res) {
    try {
      const stats = await ProductModel.getProductStats();
      
      res.json({
        code: 200,
        message: '获取成功',
        data: stats
      });
    } catch (error) {
      console.error('获取商品统计错误:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 获取SKU列表（用于下拉选择）
   */
  async getSkuList(req, res) {
    try {
      const skuList = await ProductModel.getSkuList();
      
      res.json({
        code: 200,
        message: '获取成功',
        data: skuList
      });
    } catch (error) {
      console.error('获取SKU列表错误:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 导出商品数据
   */
  async exportData(req, res) {
    try {
      const { format = 'json' } = req.query;

      // 获取所有商品数据
      const products = await ProductModel.findAll({
        orderBy: 'seller_sku',
        order: 'ASC'
      });

      if (format === 'csv') {
        // 生成CSV
        const headers = [
          'SKU', '商品名称', '售价', '可售库存', '待处理库存',
          'ASIN', '配送渠道', '状态', '上架时间'
        ];
        
        const csvRows = [headers.join(',')];
        
        products.forEach(product => {
          const row = [
            product.seller_sku,
            `"${product.item_name || ''}"`,
            product.price,
            product.quantity,
            product.pending_quantity,
            product.asin1,
            product.fulfillment_channel,
            product.status,
            product.open_date ? new Date(product.open_date).toISOString() : ''
          ];
          csvRows.push(row.join(','));
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=products_${Date.now()}.csv`);
        return res.send(csvRows.join('\n'));
      } else {
        // 默认返回JSON
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=products_${Date.now()}.json`);
        return res.json(products);
      }
    } catch (error) {
      console.error('导出商品数据错误:', error);
      res.status(500).json({
        code: 500,
        message: '导出失败',
        data: null
      });
    }
  }

  /**
   * 更新商品信息
   */
  async update(req, res) {
    try {
      const { sku } = req.params;
      const updateData = req.body;

      if (!sku) {
        return res.status(400).json({
          code: 400,
          message: 'SKU不能为空',
          data: null
        });
      }

      // 验证商品是否存在
      const product = await ProductModel.findBySku(sku);
      if (!product) {
        return res.status(404).json({
          code: 404,
          message: '商品不存在',
          data: null
        });
      }

      // 更新商品
      const updated = await ProductModel.updateProduct(sku, updateData);
      if (!updated) {
        return res.status(400).json({
          code: 400,
          message: '更新失败，请检查提交的数据',
          data: null
        });
      }

      // 获取更新后的商品信息
      const updatedProduct = await ProductModel.findBySku(sku);

      res.json({
        code: 200,
        message: '更新成功',
        data: updatedProduct
      });
    } catch (error) {
      console.error('更新商品错误:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 删除商品
   */
  async delete(req, res) {
    try {
      const { sku } = req.params;

      if (!sku) {
        return res.status(400).json({
          code: 400,
          message: 'SKU不能为空',
          data: null
        });
      }

      // 验证商品是否存在
      const product = await ProductModel.findBySku(sku);
      if (!product) {
        return res.status(404).json({
          code: 404,
          message: '商品不存在',
          data: null
        });
      }

      // 删除商品
      const deleted = await ProductModel.deleteProduct(sku);
      if (!deleted) {
        return res.status(500).json({
          code: 500,
          message: '删除失败',
          data: null
        });
      }

      res.json({
        code: 200,
        message: '删除成功',
        data: null
      });
    } catch (error) {
      console.error('删除商品错误:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }
}

module.exports = new ProductController();