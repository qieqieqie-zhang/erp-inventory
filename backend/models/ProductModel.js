const BaseModel = require('./BaseModel');

class ProductModel extends BaseModel {
  constructor() {
    super('amazon_products');
  }

  /**
   * 根据SKU查找商品
   * @param {string} sku 
   * @returns {Promise<Object|null>}
   */
  async findBySku(sku) {
    const rows = await this.query(
      'SELECT * FROM amazon_products WHERE seller_sku = ?',
      [sku]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * 批量插入或更新商品数据（全量覆盖）
   * @param {Array} products 
   * @param {string} uploadBatch 
   * @param {number} shopId 店铺ID（可选，如果不传则删除全部商品）
   * @returns {Promise<Object>}
   */
  async bulkUpsert(products, uploadBatch, shopId = null) {
    if (products.length === 0) {
      return { inserted: 0, updated: 0 };
    }

    // 开始事务
    const connection = await this.pool.getConnection();
    await connection.beginTransaction();

    try {
      // 删除现有数据（全量覆盖或按店铺覆盖）
      if (shopId) {
        await connection.execute('DELETE FROM amazon_products WHERE shop_id = ?', [shopId]);
      } else {
        await connection.execute('DELETE FROM amazon_products');
      }

      // 批量插入新数据
      const keys = [
        'seller_sku', 'item_name', 'price', 'quantity', 'pending_quantity',
        'image_url', 'asin1', 'fulfillment_channel', 'status', 'open_date',
        'listing_id', 'shop_id', 'upload_batch'
      ];

      const values = products.map(product => [
        product['seller-sku'] || product.seller_sku || '',
        product['item-name'] || product.item_name || '',
        parseFloat(product.price || product.price || 0),
        parseInt(product.quantity || product.quantity || 0),
        parseInt(product['pending-quantity'] || product.pending_quantity || 0),
        product['image-url'] || product.image_url || '',
        product.asin1 || product.asin || '',
        product['fulfillment-channel'] || product.fulfillment_channel || '',
        product.status || '',
        product['open-date'] || product.open_date ? new Date(product['open-date'] || product.open_date) : null,
        product['listing-id'] || product.listing_id || '',
        shopId,
        uploadBatch
      ]);

      const placeholders = products.map(() => 
        `(${keys.map(() => '?').join(', ')})`
      ).join(', ');

      const flattenedValues = values.flat();
      const sql = `INSERT INTO amazon_products (${keys.join(', ')}) VALUES ${placeholders}`;
      
      const [result] = await connection.execute(sql, flattenedValues);

      await connection.commit();
      
      return {
        inserted: result.affectedRows,
        updated: 0
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 获取商品列表（带分页和搜索）
   * @param {Object} options
   * @returns {Promise<Array>}
   */
  async getProductList(options = {}) {
    const {
      page = 1,
      pageSize = 20,
      search = '',
      status = '',
      channel = '',
      shop_id = '',
      minQuantity = null,
      maxQuantity = null
    } = options;

    // 使用 LEFT JOIN 关联 FBA 库存、FBA 预留、物流 JSON 数据
    let sql = `
      SELECT
        p.*,
        COALESCE(fi.available_quantity, 0) AS fba_inventory_quantity,
        COALESCE(fr.total_reserved, 0) AS fba_reserved_quantity,
        COALESCE(lg.logistics_quantity, 0) AS logistics_quantity,
        lgs.logistics_status
      FROM amazon_products p
      LEFT JOIN amazon_fba_inventory fi ON p.seller_sku = fi.seller_sku COLLATE utf8mb4_general_ci
      LEFT JOIN amazon_fba_reserved fr ON p.seller_sku = fr.seller_sku COLLATE utf8mb4_general_ci
      LEFT JOIN (
        SELECT lt_sku.sku_code, SUM(lt_sku.quantity) AS logistics_quantity
        FROM logistics_tracking lt
        CROSS JOIN JSON_TABLE(
          lt.sku_list,
          '$[*]' COLUMNS (
            sku_code VARCHAR(100) PATH '$.sku_code',
            quantity INT PATH '$.quantity'
          )
        ) AS lt_sku
        WHERE lt.sku_list IS NOT NULL AND lt.sku_list != ''
        GROUP BY lt_sku.sku_code
      ) lg ON p.seller_sku = lg.sku_code COLLATE utf8mb4_general_ci
      LEFT JOIN (
        SELECT latest_sku.sku_code, lt.logistics_status
        FROM logistics_tracking lt
        INNER JOIN (
          SELECT MAX(lt2.id) as max_id, jt2.sku_code
          FROM logistics_tracking lt2
          CROSS JOIN JSON_TABLE(
            lt2.sku_list,
            '$[*]' COLUMNS (sku_code VARCHAR(100) PATH '$.sku_code')
          ) jt2
          WHERE lt2.sku_list IS NOT NULL AND lt2.sku_list != ''
          GROUP BY jt2.sku_code
        ) latest_sku ON lt.id = latest_sku.max_id
      ) lgs ON p.seller_sku = lgs.sku_code COLLATE utf8mb4_general_ci
      WHERE 1=1
    `;
    const params = [];

    // 搜索条件
    if (search) {
      sql += ' AND (p.seller_sku LIKE ? OR p.item_name LIKE ? OR p.asin1 LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // 状态过滤
    if (status) {
      sql += ' AND p.status = ?';
      params.push(status);
    }

    // 配送渠道过滤
    if (channel) {
      sql += ' AND p.fulfillment_channel = ?';
      params.push(channel);
    }

    // 店铺过滤
    if (shop_id) {
      sql += ' AND p.shop_id = ?';
      params.push(shop_id);
    }

    // 库存范围过滤
    if (minQuantity !== null) {
      sql += ' AND p.quantity >= ?';
      params.push(minQuantity);
    }

    if (maxQuantity !== null) {
      sql += ' AND p.quantity <= ?';
      params.push(maxQuantity);
    }

    // 排序 - 处理NULL值
    sql += ' ORDER BY IFNULL(p.open_date, "1970-01-01") DESC, p.seller_sku ASC';

    // 分页 - 直接拼接LIMIT值，因为MySQL2的占位符在LIMIT中有问题
    const offset = (page - 1) * pageSize;
    sql += ` LIMIT ${pageSize} OFFSET ${offset}`;

    return this.query(sql, params);
  }

  /**
   * 统计商品数量
   * @param {Object} filters 
   * @returns {Promise<number>}
   */
  async countProducts(filters = {}) {
    const { search = '', status = '', channel = '', shop_id = '' } = filters;
    
    let sql = 'SELECT COUNT(*) as count FROM amazon_products WHERE 1=1';
    const params = [];

    if (search) {
      sql += ' AND (seller_sku LIKE ? OR item_name LIKE ? OR asin1 LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (channel) {
      sql += ' AND fulfillment_channel = ?';
      params.push(channel);
    }

    if (shop_id) {
      sql += ' AND shop_id = ?';
      params.push(shop_id);
    }

    const rows = await this.query(sql, params);
    return parseInt(rows[0].count);
  }

  /**
   * 获取商品统计信息
   * @returns {Promise<Object>}
   */
  async getProductStats() {
    const [stats] = await this.query(`
      SELECT 
        COUNT(*) as total_products,
        SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active_products,
        SUM(CASE WHEN status = 'Inactive' THEN 1 ELSE 0 END) as inactive_products,
        SUM(CASE WHEN fulfillment_channel = 'FBA' THEN 1 ELSE 0 END) as fba_products,
        SUM(CASE WHEN fulfillment_channel = '自发货' THEN 1 ELSE 0 END) as merchant_products,
        SUM(quantity) as total_quantity,
        SUM(pending_quantity) as total_pending
      FROM amazon_products
    `);

    return stats;
  }

  /**
   * 获取SKU列表（用于下拉选择）
   * @returns {Promise<Array>}
   */
  async getSkuList() {
    return this.query(`
      SELECT seller_sku as sku, item_name as name, asin1 as asin
      FROM amazon_products 
      ORDER BY seller_sku
    `);
  }

  /**
   * 更新商品信息
   * @param {string} sku 
   * @param {Object} data 
   * @returns {Promise<boolean>}
   */
  async updateProduct(sku, data) {
    const fields = [];
    const values = [];
    
    // 构建更新字段和值
    if (data.item_name !== undefined) {
      fields.push('item_name = ?');
      values.push(data.item_name);
    }
    if (data.price !== undefined) {
      fields.push('price = ?');
      values.push(parseFloat(data.price));
    }
    if (data.quantity !== undefined) {
      fields.push('quantity = ?');
      values.push(parseInt(data.quantity));
    }
    if (data.pending_quantity !== undefined) {
      fields.push('pending_quantity = ?');
      values.push(parseInt(data.pending_quantity));
    }
    if (data.asin1 !== undefined) {
      fields.push('asin1 = ?');
      values.push(data.asin1);
    }
    if (data.fulfillment_channel !== undefined) {
      fields.push('fulfillment_channel = ?');
      values.push(data.fulfillment_channel);
    }
    if (data.status !== undefined) {
      fields.push('status = ?');
      values.push(data.status);
    }
    if (data.image_url !== undefined) {
      fields.push('image_url = ?');
      values.push(data.image_url);
    }
    
    if (fields.length === 0) {
      return false; // 没有要更新的字段
    }
    
    values.push(sku);
    
    const sql = `UPDATE amazon_products SET ${fields.join(', ')} WHERE seller_sku = ?`;
    const result = await this.query(sql, values);
    return result.affectedRows > 0;
  }

  /**
   * 删除商品
   * @param {string} sku
   * @returns {Promise<boolean>}
   */
  async deleteProduct(sku) {
    const [result] = await this.query(
      'DELETE FROM amazon_products WHERE seller_sku = ?',
      [sku]
    );
    return result.affectedRows > 0;
  }

  /**
   * 根据SKU和批次前缀查找商品
   * @param {string} sku
   * @param {string} batchPrefix - 批次前缀，如 'logistics_MIT'
   * @returns {Promise<Object|null>}
   */
  async findBySkuAndBatch(sku, batchPrefix) {
    const rows = await this.query(
      'SELECT * FROM amazon_products WHERE seller_sku = ? AND upload_batch LIKE ?',
      [sku, `${batchPrefix}%`]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * 根据目的地国家映射配送渠道
   * @param {string} destinationCountry - 目的地国家
   * @returns {string} fulfillment_channel值
   */
  mapDestinationToChannel(destinationCountry) {
    if (!destinationCountry) return '';

    const country = destinationCountry.toUpperCase();

    // 美国 -> 亚马逊北美
    if (country === 'US' || country === 'USA' || country === 'UNITED STATES') {
      return 'AMAZON_NA';
    }

    // 日本 -> 亚马逊日本
    if (country === 'JP' || country === 'JAPAN') {
      return 'AMAZON_JP';
    }

    // 欧洲主要国家 -> 亚马逊欧洲
    const euCountries = ['UK', 'GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'PL', 'SE', 'CZ', 'AT', 'BE', 'IE', 'PT', 'SK', 'HU'];
    if (euCountries.includes(country)) {
      return 'AMAZON_EU';
    }

    // 加拿大、墨西哥 -> 亚马逊北美（可单独处理）
    if (country === 'CA' || country === 'MX') {
      return 'AMAZON_NA';
    }

    // 澳大利亚 -> 单独站点（如果有的话可以添加）
    if (country === 'AU') {
      return 'AMAZON_NA'; // 暂时归到北美
    }

    return '';
  }

  /**
   * 从物流记录同步/覆盖商品数据（按 SKU + 批次匹配）
   * 匹配到则覆盖数量、店铺等信息，未匹配到则新建
   * @param {Array} items - SKU数据列表 [{sku_code, sku_name, quantity}]
   * @param {number} logisticsId - 物流记录ID
   * @param {string} fbaWarehouseNumber - FBA仓库编号（用于批次标识）
   * @param {number} shopId - 店铺ID
   * @param {string} destinationCountry - 目的地国家（用于映射fulfillment_channel）
   * @returns {Promise<Object>} { updated, inserted }
   */
  async syncFromLogistics(items, logisticsId, fbaWarehouseNumber, shopId, destinationCountry) {
    // 批次前缀用 logistics_ID 格式，与创建时保持一致
    const batchPrefix = `logistics_${logisticsId}`;

    // 根据目的地国家映射配送渠道
    const fulfillmentChannel = this.mapDestinationToChannel(destinationCountry);

    let updated = 0;
    let inserted = 0;

    for (const item of items) {
      const sku = item.sku_code || item.seller_sku || '';
      if (!sku) continue;

      // 优先按 SKU + 批次匹配（找当前物流批次的产品）
      let existing = await this.findBySkuAndBatch(sku, batchPrefix);

      // 未找到，则按 SKU 匹配当前 logistics 批次（兼容旧数据）
      if (!existing) {
        const allBySku = await this.query(
          'SELECT * FROM amazon_products WHERE seller_sku = ? AND upload_batch = ?',
          [sku, batchPrefix]
        );
        if (allBySku.length > 0) existing = allBySku[0];
      }

      if (existing) {
        // 覆盖更新：店铺和批次取物流数据，数量固定为0（在途≠可售），更新配送渠道
        await this.query(
          `UPDATE amazon_products SET
            item_name = COALESCE(?, item_name),
            shop_id = ?,
            upload_batch = ?,
            quantity = 0,
            fulfillment_channel = ?
          WHERE id = ?`,
          [item.sku_name || existing.item_name, shopId, batchPrefix, fulfillmentChannel, existing.id]
        );
        updated++;
      } else {
        // 新建商品：数量固定为0（物流在途，不算可售）
        await this.create({
          seller_sku: sku,
          item_name: item.sku_name || sku,
          quantity: 0,
          shop_id: shopId,
          upload_batch: batchPrefix,
          fulfillment_channel: fulfillmentChannel
        });
        inserted++;
      }
    }

    return { updated, inserted };
  }
}

module.exports = new ProductModel();