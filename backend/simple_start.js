const app = require('./app');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

// 测试数据库连接
const pool = require('./config/db.config');

async function testDatabaseConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ 数据库连接成功');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    return false;
  }
}

async function startServer() {
  console.log('🚀 正在启动服务器...');
  
  try {
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      console.log('⚠️  将在无数据库连接状态下启动服务器（部分功能不可用）');
    }
  } catch (error) {
    console.log('⚠️  数据库连接测试失败，将继续启动服务器:', error.message);
  }

  app.listen(PORT, () => {
    console.log(`✅ 服务器启动成功`);
    console.log(`📍 访问地址: http://localhost:${PORT}`);
    console.log(`⚙️  环境: ${process.env.NODE_ENV || 'development'}`);
    console.log(`⏰ 启动时间: ${new Date().toLocaleString()}`);
  });
}

startServer().catch(error => {
  console.error('❌ 启动服务器失败:', error);
  process.exit(1);
});