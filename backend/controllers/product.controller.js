const FileParser = require('../utils/fileParser');
const ProductModel = require('../models/ProductModel');
const CategoryModel = require('../models/CategoryModel');
const UploadLogModel = require('../models/UploadLogModel');
const ProductNameSkuMappingModel = require('../models/ProductNameSkuMappingModel');
const DomesticInventoryModel = require('../models/DomesticInventoryModel');

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
      const shop_id = req.body.shop_id ? parseInt(req.body.shop_id) : null;
      const category_id = req.body.category_id || null;

      // 解析文件
      let parsedData;
      try {
        parsedData = FileParser.autoParseFile(filePath, [
          'seller-sku'
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

      // ===== 映射补全逻辑 =====
      const enrichedData = [];
      const mappingErrors = [];

      for (let i = 0; i < validData.length; i++) {
        const row = validData[i];
        const rowNum = i + 2; // 行号从2开始（1是表头）

        // 支持多种字段名格式
        const sku = row['seller-sku'] || row['seller_sku'] || row['sku'] || '';
        const nameCn = row['product-name-cn'] || row['product_name_cn'] || row['商品名称'] || row['name_cn'] || '';

        const skuVal = (sku || '').toString().trim();
        const nameCnVal = (nameCn || '').toString().trim();

        let finalSku = skuVal;
        let finalNameCn = nameCnVal;

        // 情况1：两者都有，直接使用
        if (skuVal && nameCnVal) {
          // 保持原值
        }
        // 情况2：只有 sku，没有中文名称，尝试映射补全
        else if (skuVal && !nameCnVal) {
          if (!shop_id) {
            mappingErrors.push({ row: rowNum, sku: skuVal, error: '缺少中文名称，且未指定店铺，无法从映射表查找' });
            continue;
          }
          const mappedName = await ProductNameSkuMappingModel.findNameBySku(shop_id, skuVal);
          if (mappedName === null) {
            mappingErrors.push({ row: rowNum, sku: skuVal, error: '缺少中文名称，且未在映射表中找到对应关系' });
            continue;
          }
          finalNameCn = mappedName;
        }
        // 情况3：只有中文名称，没有 sku，尝试映射补全
        else if (!skuVal && nameCnVal) {
          if (!shop_id) {
            mappingErrors.push({ row: rowNum, name: nameCnVal, error: '缺少seller_sku，且未指定店铺，无法从映射表查找' });
            continue;
          }
          const mappedSku = await ProductNameSkuMappingModel.findSkuByName(shop_id, nameCnVal);
          if (mappedSku === null) {
            mappingErrors.push({ row: rowNum, name: nameCnVal, error: '缺少seller_sku，且未在映射表中找到对应关系' });
            continue;
          }
          finalSku = mappedSku;
        }
        // 情况4：两者都没有
        else {
          mappingErrors.push({ row: rowNum, error: 'seller_sku 和中文名称都为空，不允许导入' });
          continue;
        }

        // 补全后的数据加入列表
        enrichedData.push({
          ...row,
          'seller-sku': finalSku,
          'product_name_cn': finalNameCn
        });
      }

      if (mappingErrors.length > 0) {
        return res.status(400).json({
          code: 400,
          message: `上传失败：${mappingErrors.length} 条记录无法处理`,
          data: {
            errors: mappingErrors.map(e => ({
              row: e.row,
              error: e.error,
              sku: e.sku || null,
              name: e.name || null
            }))
          }
        });
      }

      // 如果文件中有 category_name 字段，转为 category_id
      let finalCategoryId = category_id;
      if (enrichedData[0] && enrichedData[0]['category_name']) {
        const categoryName = enrichedData[0]['category_name'];
        if (categoryName) {
          try {
            const cat = await CategoryModel.findByName(categoryName);
            if (cat) {
              finalCategoryId = cat.id;
            }
          } catch (e) {
            // 分类查找失败，不影响上传
          }
        }
      }

      // 生成上传批次
      const uploadBatch = `PRD_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      // 保存到数据库（带上店铺ID和分类ID）
      const result = await ProductModel.bulkUpsert(enrichedData, uploadBatch, shop_id, finalCategoryId);

      // ===== 保存成功后，沉淀有完整映射的记录到 mapping 表 =====
      for (const item of enrichedData) {
        const sku = item['seller-sku'];
        const nameCn = item['product_name_cn'];
        if (sku && nameCn && shop_id) {
          try {
            await ProductNameSkuMappingModel.upsert({
              shop_id,
              product_name_cn: nameCn,
              seller_sku: sku
            });
          } catch (e) {
            console.error('映射表沉淀失败:', e.message);
          }
        }
      }

      // ===== 保存成功后，同步到国内库存 =====
      try {
        await DomesticInventoryModel.syncFromProductUpload(
          enrichedData,
          uploadBatch,
          req.user?.username || 'system'
        );
      } catch (e) {
        console.error('国内库存同步失败:', e.message);
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
        module: 'product',
        filename: filename,
        totalRecords: parsedData.data.length,
        successCount: enrichedData.length,
        failCount: invalidData.length,
        errorFile: errorFile
      });

      // 返回响应
      const response = {
        code: 200,
        message: '上传成功',
        data: {
          total: parsedData.data.length,
          success: enrichedData.length,
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
        shop_code = '',
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
        shop_id: shop_id,
        shop_code: shop_code
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
      const { shopId = '', shop_code = '' } = req.query;
      const stats = await ProductModel.getProductStats({
        shopId: shopId ? parseInt(shopId) : null,
        shop_code: shop_code
      });

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