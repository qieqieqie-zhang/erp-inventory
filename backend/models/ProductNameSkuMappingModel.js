const BaseModel = require('./BaseModel');

class ProductNameSkuMappingModel extends BaseModel {
  constructor() {
    super('product_name_sku_mapping');
  }

  /**
   * 查找 sku 对应的唯一中文名称
   * @param {number} shopId
   * @param {string} sellerSku
   * @returns {Promise<string|null>} 唯一匹配的中文名称，或null
   */
  async findNameBySku(shopId, sellerSku) {
    const rows = await this.query(
      `SELECT product_name_cn FROM product_name_sku_mapping
       WHERE shop_id = ? AND seller_sku = ? AND is_active = 1`,
      [shopId, sellerSku]
    );
    if (rows.length === 0) return null;
    return rows[0].product_name_cn;
  }

  /**
   * 查找中文名称对应的唯一 sku
   * @param {number} shopId
   * @param {string} productNameCn
   * @returns {Promise<string|null>} 唯一匹配的 seller_sku，或null
   */
  async findSkuByName(shopId, productNameCn) {
    const rows = await this.query(
      `SELECT seller_sku FROM product_name_sku_mapping
       WHERE shop_id = ? AND product_name_cn = ? AND is_active = 1`,
      [shopId, productNameCn]
    );
    if (rows.length === 0) return null;
    return rows[0].seller_sku;
  }

  /**
   * upsert 映射关系
   * @param {Object} data { shop_id, product_name_cn, seller_sku }
   */
  async upsert(data) {
    const { shop_id, product_name_cn, seller_sku } = data;
    await this.query(
      `INSERT INTO product_name_sku_mapping (shop_id, product_name_cn, seller_sku, source_type, is_active)
       VALUES (?, ?, ?, 'upload', 1)
       ON DUPLICATE KEY UPDATE
         product_name_cn = VALUES(product_name_cn),
         seller_sku = VALUES(seller_sku),
         updated_at = CURRENT_TIMESTAMP`,
      [shop_id, product_name_cn, seller_sku]
    );
  }

  /**
   * 获取映射列表（带分页）
   */
  async getList(options = {}) {
    const {
      page = 1,
      pageSize = 20,
      shop_id = null,
      shop_code = '',
      search = ''
    } = options;

    let sql = `
      SELECT m.*, s.shop_name
      FROM product_name_sku_mapping m
      LEFT JOIN shops s ON m.shop_id = s.id
      WHERE m.is_active = 1
    `;
    const params = [];

    if (shop_id) {
      sql += ' AND m.shop_id = ?';
      params.push(shop_id);
    }

    // 店铺代码过滤（使用子查询避免LEFT JOIN + WHERE失效问题）
    if (shop_code) {
      sql += ' AND m.shop_id IN (SELECT id FROM shops WHERE shop_code = ?)';
      params.push(shop_code);
    }

    if (search) {
      sql += ' AND (m.product_name_cn LIKE ? OR m.seller_sku LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // 排序
    sql += ' ORDER BY m.updated_at DESC';

    // 先查总数
    let countSql = sql.replace(/SELECT m.\*, s.shop_name/, 'SELECT COUNT(*) as total');
    const countRows = await this.query(countSql, params);
    const total = countRows[0]?.total || 0;

    // 分页
    const offset = (page - 1) * pageSize;
    sql += ` LIMIT ${pageSize} OFFSET ${offset}`;

    const rows = await this.query(sql, params);

    return {
      list: rows,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }

  /**
   * 删除映射（软删除，设 is_active = 0）
   */
  async delete(id) {
    await this.query(
      'UPDATE product_name_sku_mapping SET is_active = 0 WHERE id = ?',
      [id]
    );
  }
}

module.exports = new ProductNameSkuMappingModel();
