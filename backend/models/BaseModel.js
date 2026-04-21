const pool = require('../config/db.config');

class BaseModel {
  constructor(tableName) {
    this.tableName = tableName;
    this.pool = pool;
  }

  /**
   * 执行查询
   * @param {string} sql 
   * @param {Array} params 
   * @returns {Promise<Array>}
   */
  async query(sql, params = []) {
    try {
      const [rows] = await this.pool.execute(sql, params);
      return rows;
    } catch (error) {
      console.error('数据库查询错误:', error);
      throw error;
    }
  }

  /**
   * 查找所有记录
   * @param {Object} options 
   * @returns {Promise<Array>}
   */
  async findAll(options = {}) {
    const {
      where = {},
      orderBy = 'id',
      order = 'DESC',
      limit = null,
      offset = 0
    } = options;

    let sql = `SELECT * FROM ${this.tableName}`;
    const params = [];

    // 构建WHERE条件
    const whereConditions = Object.keys(where);
    if (whereConditions.length > 0) {
      sql += ' WHERE ';
      sql += whereConditions.map(key => {
        params.push(where[key]);
        return `${key} = ?`;
      }).join(' AND ');
    }

    // 排序
    sql += ` ORDER BY ${orderBy} ${order}`;

    // 分页 - 直接拼接LIMIT值，因为MySQL2的占位符在LIMIT中有问题
    if (limit !== null) {
      sql += ` LIMIT ${limit} OFFSET ${offset}`;
    }

    return this.query(sql, params);
  }

  /**
   * 根据ID查找
   * @param {number} id 
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    const rows = await this.query(
      `SELECT * FROM ${this.tableName} WHERE id = ?`,
      [id]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * 创建记录
   * @param {Object} data 
   * @returns {Promise<Object>}
   */
  async create(data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders})`;
    
    const [result] = await this.pool.execute(sql, values);
    return { id: result.insertId, ...data };
  }

  /**
   * 批量创建
   * @param {Array} dataArray 
   * @returns {Promise<Object>}
   */
  async bulkCreate(dataArray) {
    if (dataArray.length === 0) {
      return { affectedRows: 0 };
    }

    const keys = Object.keys(dataArray[0]);
    const values = dataArray.map(item => Object.values(item));
    
    const placeholders = dataArray.map(() => 
      `(${keys.map(() => '?').join(', ')})`
    ).join(', ');
    
    const flattenedValues = values.flat();
    const sql = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES ${placeholders}`;
    
    const [result] = await this.pool.execute(sql, flattenedValues);
    return result;
  }

  /**
   * 更新记录
   * @param {number} id 
   * @param {Object} data 
   * @returns {Promise<boolean>}
   */
  async update(id, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    
    const setClause = keys.map(key => `${key} = ?`).join(', ');
    const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
    
    const [result] = await this.pool.execute(sql, [...values, id]);
    return result.affectedRows > 0;
  }

  /**
   * 删除记录
   * @param {number} id 
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    const [result] = await this.pool.execute(
      `DELETE FROM ${this.tableName} WHERE id = ?`,
      [id]
    );
    return result.affectedRows > 0;
  }

  /**
   * 统计数量
   * @param {Object} where 
   * @returns {Promise<number>}
   */
  async count(where = {}) {
    let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    const params = [];

    const whereConditions = Object.keys(where);
    if (whereConditions.length > 0) {
      sql += ' WHERE ';
      sql += whereConditions.map(key => {
        params.push(where[key]);
        return `${key} = ?`;
      }).join(' AND ');
    }

    const rows = await this.query(sql, params);
    return parseInt(rows[0].count);
  }

  /**
   * 执行原生SQL
   * @param {string} sql 
   * @param {Array} params 
   * @returns {Promise<Array>}
   */
  async raw(sql, params = []) {
    return this.query(sql, params);
  }
}

module.exports = BaseModel;