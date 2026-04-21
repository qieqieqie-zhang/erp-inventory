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
    console.log('请检查:');
    console.log('1. MySQL 服务是否启动');
    console.log('2. 数据库配置是否正确 (.env 文件)');
    console.log('3. 数据库是否存在 (可以手动创建)');
    return false;
  }
}

async function initializeDatabase() {
  try {
    const fs = require('fs').promises;
    const schema = await fs.readFile('./config/schema.sql', 'utf8');
    const connection = await pool.getConnection();
    
    // 分割SQL语句并执行
    const statements = schema.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await connection.query(statement);
        } catch (err) {
          // 忽略表已存在的错误
          if (!err.message.includes('already exists')) {
            console.warn('执行SQL语句时出错:', err.message);
          }
        }
      }
    }
    
    connection.release();
    console.log('✅ 数据库表结构初始化完成');
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error.message);
  }
}

async function startServer() {
  // 测试数据库连接
  try {
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      console.log('将在无数据库连接状态下启动服务器（部分功能不可用）');
    } else {
      // 初始化数据库表
      await initializeDatabase();
    }
  } catch (error) {
    console.log('数据库连接测试失败，将继续启动服务器（部分功能不可用）:', error.message);
  }

  app.listen(PORT, () => {
    console.log(`🚀 服务器启动成功`);
    console.log(`📍 访问地址: http://localhost:${PORT}`);
    console.log(`📚 API文档: http://localhost:${PORT}/api-docs (待实现)`);
    console.log(`⚙️  环境: ${process.env.NODE_ENV || 'development'}`);
    console.log(`⏰ 启动时间: ${new Date().toLocaleString()}`);
  });
}

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号，正在关闭服务器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('收到 SIGINT 信号，正在关闭服务器...');
  process.exit(0);
});

// 启动服务器
startServer().catch(error => {
  console.error('启动服务器失败:', error);
  process.exit(1);
});