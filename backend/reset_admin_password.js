const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function resetAdminPassword() {
  let connection;
  try {
    console.log('正在重置admin密码...');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    
    // 检查admin用户是否存在
    const [adminUser] = await connection.execute(
      "SELECT id FROM system_users WHERE username = 'admin'"
    );
    
    if (adminUser.length === 0) {
      console.log('❌ admin用户不存在，无法重置密码');
      return;
    }
    
    const userId = adminUser[0].id;
    const newPassword = 'admin123';
    
    // 生成新的密码哈希
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // 更新密码
    await connection.execute(
      'UPDATE system_users SET password = ?, updated_at = NOW() WHERE id = ?',
      [hashedPassword, userId]
    );
    
    console.log(`✅ admin密码已重置为: ${newPassword}`);
    console.log(`新密码哈希: ${hashedPassword.substring(0, 30)}...`);
    
    // 验证密码
    const [updatedUser] = await connection.execute(
      "SELECT password FROM system_users WHERE id = ?",
      [userId]
    );
    
    const isValid = await bcrypt.compare(newPassword, updatedUser[0].password);
    console.log(`密码验证: ${isValid ? '✅ 成功' : '❌ 失败'}`);
    
  } catch (error) {
    console.error('重置密码时出错:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('数据库连接已关闭');
    }
  }
}

resetAdminPassword();