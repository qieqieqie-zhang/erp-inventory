const BaseModel = require('./BaseModel');

class ShopModel extends BaseModel {
  constructor() {
    super('shops');
  }

  /**
   * 根据店铺名称查找
   * @param {string} shopName 
   * @returns {Promise<Object|null>}
   */
  async findByName(shopName) {
    const rows = await this.query(
      'SELECT * FROM shops WHERE shop_name = ?',
      [shopName]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * 获取店铺列表（带分页和搜索）
   * @param {Object} options 
   * @returns {Promise<Array>}
   */
  async getShopList(options = {}) {
    const {
      page = 1,
      pageSize = 20,
      search = '',
      status = ''
    } = options;

    let sql = 'SELECT * FROM shops WHERE 1=1';
    const params = [];

    if (search) {
      sql += ' AND (shop_name LIKE ? OR shop_code LIKE ? OR region LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC';

    const offset = (page - 1) * pageSize;
    sql += ` LIMIT ${pageSize} OFFSET ${offset}`;

    return this.query(sql, params);
  }

  /**
   * 统计店铺数量
   * @param {Object} filters 
   * @returns {Promise<number>}
   */
  async countShops(filters = {}) {
    const { search = '', status = '' } = filters;
    
    let sql = 'SELECT COUNT(*) as count FROM shops WHERE 1=1';
    const params = [];

    if (search) {
      sql += ' AND (shop_name LIKE ? OR shop_code LIKE ? OR region LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    const rows = await this.query(sql, params);
    return parseInt(rows[0].count);
  }

  /**
   * 获取店铺统计信息
   * @returns {Promise<Object>}
   */
  async getShopStats() {
    const [stats] = await this.query(`
      SELECT 
        COUNT(*) as total_shops,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_shops,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive_shops,
        SUM(CASE WHEN shop_type = 'Amazon' THEN 1 ELSE 0 END) as amazon_shops,
        SUM(CASE WHEN shop_type = 'eBay' THEN 1 ELSE 0 END) as ebay_shops,
        SUM(CASE WHEN shop_type = 'Walmart' THEN 1 ELSE 0 END) as walmart_shops
      FROM shops
    `);

    return stats;
  }

  /**
   * 生成店铺ID
   * @returns {string}
   */
  generateShopId() {
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(2, 14); // YYMMDDHHMMSS
    const random = Math.random().toString(36).substring(2, 6).toUpperCase(); // 4位随机字母数字
    return `SHP${timestamp}${random}`;
  }

  /**
   * 创建店铺
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async createShop(data) {
    // 自动生成店铺ID（如果未提供）
    const shopId = data.shop_id || this.generateShopId();
    // 自动生成店铺代码（如果未提供）
    const shopCode = data.shop_code || this.generateShopCode(data.shop_name);
    const fields = ['shop_id', 'shop_name', 'shop_code', 'shop_type', 'region', 'marketplace', 'seller_id', 'status', 'created_at'];
    const values = [
      shopId,
      data.shop_name,
      shopCode,
      data.shop_type || 'Amazon',
      data.region || '',
      data.marketplace || '',
      data.seller_id || '',
      data.status || 'active',
      new Date()
    ];

    const sql = `INSERT INTO shops (${fields.join(', ')}) VALUES (${values.map(() => '?').join(', ')})`;
    const result = await this.query(sql, values);
    return { id: result.insertId, shop_id: shopId, shop_code: shopCode, ...data };
  }

  /**
   * 生成店铺代码
   * @param {string} shopName
   * @returns {string}
   */
  generateShopCode(shopName) {
    if (!shopName) return 'S' + Date.now();
    // 取店铺名称的前4个字符+时间戳后4位
    const prefix = shopName.substring(0, 4).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
    return (prefix + timestamp).substring(0, 10);
  }

  /**
   * 更新店铺信息
   * @param {number} id 
   * @param {Object} data 
   * @returns {Promise<boolean>}
   */
  async updateShop(id, data) {
    const fields = [];
    const values = [];
    
    if (data.shop_id !== undefined) {
      fields.push('shop_id = ?');
      values.push(data.shop_id);
    }
    if (data.shop_name !== undefined) {
      fields.push('shop_name = ?');
      values.push(data.shop_name);
    }
    if (data.shop_code !== undefined) {
      fields.push('shop_code = ?');
      values.push(data.shop_code);
    }
    if (data.shop_type !== undefined) {
      fields.push('shop_type = ?');
      values.push(data.shop_type);
    }
    if (data.region !== undefined) {
      fields.push('region = ?');
      values.push(data.region);
    }
    if (data.marketplace !== undefined) {
      fields.push('marketplace = ?');
      values.push(data.marketplace);
    }
    if (data.seller_id !== undefined) {
      fields.push('seller_id = ?');
      values.push(data.seller_id);
    }
    if (data.status !== undefined) {
      fields.push('status = ?');
      values.push(data.status);
    }
    
    if (fields.length === 0) {
      return false;
    }
    
    fields.push('updated_at = ?');
    values.push(new Date());
    values.push(id);
    
    const sql = `UPDATE shops SET ${fields.join(', ')} WHERE id = ?`;
    const result = await this.query(sql, values);
    return result.affectedRows > 0;
  }

  /**
   * 删除店铺
   * @param {number} id 
   * @returns {Promise<boolean>}
   */
  async deleteShop(id) {
    const [result] = await this.query(
      'DELETE FROM shops WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  /**
   * 获取所有店铺（用于下拉选择）
   * @returns {Promise<Array>}
   */
  async getAllShops() {
    return this.query(`
      SELECT id, shop_id, shop_name, shop_code, shop_type, region, status
      FROM shops 
      WHERE status = 'active'
      ORDER BY shop_name
    `);
  }

  /**
   * 检查店铺是否有商品关联
   * @param {number} shopId 
   * @returns {Promise<boolean>}
   */
  async hasProducts(shopId) {
    const [result] = await this.query(
      'SELECT COUNT(*) as count FROM product_master WHERE shop_id = ?',
      [shopId]
    );
    return result.count > 0;
  }
}

module.exports = new ShopModel();
