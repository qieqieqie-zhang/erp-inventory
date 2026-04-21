const jwt = require('jsonwebtoken');
const UserModel = require('../models/UserModel');

class AuthController {
  /**
   * 用户登录
   */
  async login(req, res) {
    try {
      const { username, password } = req.body;

      // 验证输入
      if (!username || !password) {
        return res.status(400).json({
          code: 400,
          message: '用户名和密码不能为空',
          data: null
        });
      }

      // 查找用户
      const user = await UserModel.findByUsername(username);
      if (!user) {
        return res.status(401).json({
          code: 401,
          message: '用户名或密码错误',
          data: null
        });
      }

      // 检查用户状态
      if (user.status !== 1) {
        return res.status(401).json({
          code: 401,
          message: '用户已被禁用',
          data: null
        });
      }

      // 验证密码
      const isValidPassword = await UserModel.verifyPassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          code: 401,
          message: '用户名或密码错误',
          data: null
        });
      }

      // 生成JWT令牌
      const token = jwt.sign(
        { 
          userId: user.id,
          username: user.username,
          role: user.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      // 更新最后登录时间
      await UserModel.updateLastLogin(user.id);

      // 返回用户信息（排除密码）
      const { password: _, ...userWithoutPassword } = user;

      res.json({
        code: 200,
        message: '登录成功',
        data: {
          token,
          user: userWithoutPassword
        }
      });
    } catch (error) {
      console.error('登录错误:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 用户退出
   */
  logout(req, res) {
    // JWT是无状态的，客户端需要自行删除token
    res.json({
      code: 200,
      message: '退出成功',
      data: null
    });
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(req, res) {
    try {
      const user = await UserModel.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          code: 404,
          message: '用户不存在',
          data: null
        });
      }

      // 排除密码
      const { password, ...userWithoutPassword } = user;

      res.json({
        code: 200,
        message: '获取成功',
        data: userWithoutPassword
      });
    } catch (error) {
      console.error('获取用户信息错误:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 修改密码
   */
  async changePassword(req, res) {
    try {
      const { oldPassword, newPassword } = req.body;
      const userId = req.user.id;

      if (!oldPassword || !newPassword) {
        return res.status(400).json({
          code: 400,
          message: '旧密码和新密码不能为空',
          data: null
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          code: 400,
          message: '新密码长度不能少于6位',
          data: null
        });
      }

      // 获取用户
      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({
          code: 404,
          message: '用户不存在',
          data: null
        });
      }

      // 验证旧密码
      const isValidPassword = await UserModel.verifyPassword(oldPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({
          code: 400,
          message: '旧密码错误',
          data: null
        });
      }

      // 更新密码
      await UserModel.updatePassword(userId, newPassword);

      res.json({
        code: 200,
        message: '密码修改成功',
        data: null
      });
    } catch (error) {
      console.error('修改密码错误:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 刷新令牌
   */
  async refreshToken(req, res) {
    try {
      const user = await UserModel.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          code: 404,
          message: '用户不存在',
          data: null
        });
      }

      // 生成新的JWT令牌
      const token = jwt.sign(
        { 
          userId: user.id,
          username: user.username,
          role: user.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      res.json({
        code: 200,
        message: '令牌刷新成功',
        data: { token }
      });
    } catch (error) {
      console.error('刷新令牌错误:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }
}

module.exports = new AuthController();