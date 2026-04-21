const BaseModel = require('./BaseModel');

class UploadLogModel extends BaseModel {
  constructor() {
    super('system_upload_logs');
  }

  /**
   * 创建上传日志
   * @param {Object} logData 
   * @returns {Promise<Object>}
   */
  async createLog(logData) {
    const log = {
      user_id: logData.userId,
      username: logData.username,
      module: logData.module,
      dimension: logData.dimension || null,
      filename: logData.filename,
      total_records: logData.totalRecords || 0,
      success_count: logData.successCount || 0,
      update_count: logData.updateCount || 0,
      fail_count: logData.failCount || 0,
      error_file: logData.errorFile || null,
      upload_time: new Date()
    };

    return super.create(log);
  }

  /**
   * 获取上传日志列表
   * @param {Object} options 
   * @returns {Promise<Array>}
   */
  async getLogList(options = {}) {
    const {
      page = 1,
      pageSize = 20,
      module = '',
      username = '',
      startDate = null,
      endDate = null,
      userId = null
    } = options;

    let sql = `
      SELECT 
        ul.*,
        u.real_name as user_real_name,
        u.role as user_role
      FROM system_upload_logs ul
      LEFT JOIN system_users u ON ul.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // 模块过滤
    if (module) {
      sql += ' AND ul.module = ?';
      params.push(module);
    }

    // 用户名过滤
    if (username) {
      sql += ' AND ul.username LIKE ?';
      params.push(`%${username}%`);
    }

    // 用户ID过滤
    if (userId) {
      sql += ' AND ul.user_id = ?';
      params.push(userId);
    }

    // 日期范围过滤
    if (startDate) {
      sql += ' AND ul.upload_time >= ?';
      params.push(new Date(startDate));
    }

    if (endDate) {
      sql += ' AND ul.upload_time <= ?';
      params.push(new Date(endDate));
    }

    // 排序
    sql += ' ORDER BY ul.upload_time DESC';

    // 分页 - 直接拼接LIMIT值，因为MySQL2的占位符在LIMIT中有问题
    const offset = (page - 1) * pageSize;
    sql += ` LIMIT ${pageSize} OFFSET ${offset}`;

    return this.query(sql, params);
  }

  /**
   * 统计上传日志数量
   * @param {Object} filters 
   * @returns {Promise<number>}
   */
  async countLogs(filters = {}) {
    const { module = '', username = '', startDate = null, endDate = null } = filters;
    
    let sql = 'SELECT COUNT(*) as count FROM system_upload_logs WHERE 1=1';
    const params = [];

    if (module) {
      sql += ' AND module = ?';
      params.push(module);
    }

    if (username) {
      sql += ' AND username LIKE ?';
      params.push(`%${username}%`);
    }

    if (startDate) {
      sql += ' AND upload_time >= ?';
      params.push(new Date(startDate));
    }

    if (endDate) {
      sql += ' AND upload_time <= ?';
      params.push(new Date(endDate));
    }

    const rows = await this.query(sql, params);
    return parseInt(rows[0].count);
  }

  /**
   * 获取上传统计信息
   * @returns {Promise<Object>}
   */
  async getUploadStats() {
    const [stats] = await this.query(`
      SELECT 
        COUNT(*) as total_uploads,
        SUM(total_records) as total_records,
        SUM(success_count) as total_success,
        SUM(fail_count) as total_fail,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT module) as unique_modules,
        MIN(upload_time) as first_upload,
        MAX(upload_time) as last_upload
      FROM system_upload_logs
    `);

    return stats;
  }

  /**
   * 获取模块上传统计
   * @returns {Promise<Array>}
   */
  async getModuleStats() {
    return this.query(`
      SELECT 
        module,
        COUNT(*) as upload_count,
        SUM(total_records) as total_records,
        SUM(success_count) as success_count,
        SUM(fail_count) as fail_count,
        AVG(success_count * 100.0 / NULLIF(total_records, 0)) as success_rate
      FROM system_upload_logs
      GROUP BY module
      ORDER BY upload_count DESC
    `);
  }

  /**
   * 获取用户上传统计
   * @returns {Promise<Array>}
   */
  async getUserStats() {
    return this.query(`
      SELECT 
        ul.user_id,
        ul.username,
        u.real_name,
        u.role,
        COUNT(*) as upload_count,
        SUM(ul.total_records) as total_records,
        SUM(ul.success_count) as success_count
      FROM system_upload_logs ul
      LEFT JOIN system_users u ON ul.user_id = u.id
      GROUP BY ul.user_id, ul.username, u.real_name, u.role
      ORDER BY upload_count DESC
    `);
  }
}

module.exports = new UploadLogModel();