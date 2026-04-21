const BaseModel = require('./BaseModel');

class SkuInventoryLogModel extends BaseModel {
  constructor() {
    super('sku_inventory_logs');
  }

  /**
   * 记录库存变动
   * @param {Object} data
   */
  async log(data) {
    const {
      sku_code,
      module,
      action,
      before_quantity = 0,
      after_quantity = 0,
      change_amount = 0,
      remarks = '',
      operator_id = null,
      operator_name = '',
      reference_id = ''
    } = data;

    return await this.create({
      sku_code,
      module,
      action,
      before_quantity,
      after_quantity,
      change_amount,
      remarks,
      operator_id,
      operator_name,
      reference_id
    });
  }

  /**
   * 获取 SKU 的库存变动日志（分页）
   * @param {Object} options
   */
  async getLogsBySku(sku, options = {}) {
    const {
      page = 1,
      pageSize = 20,
      module = ''
    } = options;

    const offset = (page - 1) * pageSize;
    const params = [sku];

    let sql = 'SELECT * FROM sku_inventory_logs WHERE sku_code = ?';
    if (module) {
      sql += ' AND module = ?';
      params.push(module);
    }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    const rows = await this.query(sql, params);

    const countParams = [sku];
    let countSql = 'SELECT COUNT(*) as count FROM sku_inventory_logs WHERE sku_code = ?';
    if (module) {
      countSql += ' AND module = ?';
      countParams.push(module);
    }
    const [countResult] = await this.query(countSql, countParams);
    const total = countResult[0].count;

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
   * 获取所有库存变动日志（分页）
   * @param {Object} options
   */
  async getAllLogs(options = {}) {
    const {
      page = 1,
      pageSize = 20,
      sku = '',
      module = ''
    } = options;

    const offset = (page - 1) * pageSize;
    const params = [];
    let sql = 'SELECT * FROM sku_inventory_logs WHERE 1=1';

    if (sku) {
      sql += ' AND sku_code LIKE ?';
      params.push(`%${sku}%`);
    }
    if (module) {
      sql += ' AND module = ?';
      params.push(module);
    }

    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count');
    const [countResult] = await this.query(countSql, params);
    const total = countResult[0].count;

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    const rows = await this.query(sql, params);

    return {
      list: rows,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
    };
  }
}

module.exports = new SkuInventoryLogModel();
