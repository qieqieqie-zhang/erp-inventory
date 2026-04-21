require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

async function executeSQL() {
  console.log('正在执行SQL文件...');
  
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'amazon_erp',
    multipleStatements: true  // 允许多条语句
  };
  
  let connection;
  
  try {
    // 连接到MySQL
    connection = await mysql.createConnection(config);
    console.log('MySQL连接成功！');
    
    // 读取SQL文件
    const sqlPath = path.join(__dirname, 'config', 'schema.sql');
    console.log(`正在读取SQL文件: ${sqlPath}`);
    
    const sqlContent = await fs.readFile(sqlPath, 'utf-8');
    console.log(`SQL文件大小: ${sqlContent.length} 字符`);
    
    // 执行整个SQL文件
    console.log('正在执行SQL语句...');
    const [results] = await connection.query(sqlContent);
    console.log('SQL执行成功！');
    
    // 检查表
    const [tables] = await connection.query(
      'SHOW TABLES'
    );
    
    console.log(`\n数据库中的表 (共 ${tables.length} 个):`);
    for (const table of tables) {
      const tableName = table[`Tables_in_${config.database}`];
      console.log(`  - ${tableName}`);
    }
    
    // 检查system_users表中的管理员账户
    const [users] = await connection.query(
      'SELECT username, role, real_name FROM system_users WHERE username = "admin"'
    );
    
    if (users.length > 0) {
      console.log('\n管理员账户已创建:');
      console.log(`  用户名: ${users[0].username}`);
      console.log(`  角色: ${users[0].role}`);
      console.log(`  姓名: ${users[0].real_name}`);
      console.log(`  密码: admin123 (bcrypt加密)`);
    }
    
    await connection.end();
    console.log('\n数据库初始化完成！');
    return true;
  } catch (error) {
    console.error('SQL执行错误:', error.message);
    
    if (connection) {
      try {
        await connection.end();
      } catch (e) {}
    }
    
    return false;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  executeSQL().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = executeSQL;