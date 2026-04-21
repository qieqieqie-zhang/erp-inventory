const BaseModel = require('./BaseModel');
const bcrypt = require('bcrypt');

class UserModel extends BaseModel {
  constructor() {
    super('system_users');
  }

  /**
   * 根据用户名查找用户
   * @param {string} username 
   * @returns {Promise<Object|null>}
   */
  async findByUsername(username) {
    const rows = await this.query(
      'SELECT * FROM system_users WHERE username = ?',
      [username]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * 创建用户（自动加密密码）
   * @param {Object} userData 
   * @returns {Promise<Object>}
   */
  async createUser(userData) {
    const { password, ...rest } = userData;
    
    // 加密密码
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    const user = {
      ...rest,
      password: hashedPassword,
      status: 1, // 默认启用
      created_at: new Date(),
      updated_at: new Date()
    };
    
    return super.create(user);
  }

  /**
   * 验证用户密码
   * @param {string} plainPassword 
   * @param {string} hashedPassword 
   * @returns {Promise<boolean>}
   */
  async verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * 更新用户密码
   * @param {number} userId 
   * @param {string} newPassword 
   * @returns {Promise<boolean>}
   */
  async updatePassword(userId, newPassword) {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    return this.update(userId, {
      password: hashedPassword,
      updated_at: new Date()
    });
  }

  /**
   * 更新用户最后登录时间
   * @param {number} userId 
   * @returns {Promise<boolean>}
   */
  async updateLastLogin(userId) {
    return this.update(userId, {
      last_login: new Date(),
      updated_at: new Date()
    });
  }

  /**
   * 获取所有用户（分页）
   * @param {Object} options 
   * @returns {Promise<Array>}
   */
  async getAllUsers(options = {}) {
    const {
      page = 1,
      pageSize = 20,
      search = '',
      role = '',
      status = ''
    } = options;

    let sql = `
      SELECT id, username, role, real_name, email, phone, status, 
             last_login, created_at, updated_at
      FROM system_users
      WHERE 1=1
    `;
    const params = [];

    // 搜索条件
    if (search) {
      sql += ' AND (username LIKE ? OR real_name LIKE ? OR email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // 角色过滤
    if (role) {
      sql += ' AND role = ?';
      params.push(role);
    }

    // 状态过滤
    if (status !== '') {
      sql += ' AND status = ?';
      params.push(parseInt(status));
    }

    // 排序
    sql += ' ORDER BY created_at DESC';

    // 分页 - 直接拼接LIMIT值，因为MySQL2的占位符在LIMIT中有问题
    const offset = (page - 1) * pageSize;
    sql += ` LIMIT ${pageSize} OFFSET ${offset}`;

    return this.query(sql, params);
  }

  /**
   * 统计用户数量
   * @param {Object} filters 
   * @returns {Promise<number>}
   */
  async countUsers(filters = {}) {
    const { search = '', role = '', status = '' } = filters;
    
    let sql = 'SELECT COUNT(*) as count FROM system_users WHERE 1=1';
    const params = [];

    if (search) {
      sql += ' AND (username LIKE ? OR real_name LIKE ? OR email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (role) {
      sql += ' AND role = ?';
      params.push(role);
    }

    if (status !== '') {
      sql += ' AND status = ?';
      params.push(parseInt(status));
    }

    const rows = await this.query(sql, params);
    return parseInt(rows[0].count);
  }
}

module.exports = new UserModel();