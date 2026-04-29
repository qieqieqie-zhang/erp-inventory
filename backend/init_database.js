require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

async function initDatabase() {
  console.log('正在初始化数据库...');
  
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  };
  
  let pool;
  let connection;
  
  try {
    // 连接到MySQL
    pool = mysql.createPool(config);
    connection = await pool.getConnection();
    console.log('MySQL连接成功！');
    
    // 确保数据库存在
    const dbName = process.env.DB_NAME || 'amazon_erp';
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await connection.query(`USE \`${dbName}\``);
    console.log(`数据库 "${dbName}" 已准备就绪`);
    
    // 读取SQL文件
    const sqlPath = path.join(__dirname, 'config', 'schema.sql');
    console.log(`正在读取SQL文件: ${sqlPath}`);
    
    const sqlContent = await fs.readFile(sqlPath, 'utf-8');
    
    // 分割SQL语句（按分号分割）
    const sqlStatements = sqlContent
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0 && !statement.startsWith('--'));
    
    console.log(`找到 ${sqlStatements.length} 个SQL语句`);
    
    // 执行每个SQL语句
    for (let i = 0; i < sqlStatements.length; i++) {
      const sql = sqlStatements[i] + ';'; // 重新添加分号
      const isCreateTable = sql.toLowerCase().includes('create table');
      const isInsert = sql.toLowerCase().includes('insert into');
      
      try {
        console.log(`[${i + 1}/${sqlStatements.length}] ${isCreateTable ? '创建表...' : isInsert ? '插入数据...' : '执行SQL...'}`);
        
        await connection.query(sql);
        
        if (isCreateTable) {
          // 提取表名用于反馈
          const tableMatch = sql.match(/CREATE TABLE IF NOT EXISTS `([^`]+)`/i) || 
                           sql.match(/CREATE TABLE `([^`]+)`/i);
          if (tableMatch) {
            console.log(`  ✓ 表 "${tableMatch[1]}" 创建成功`);
          }
        }
      } catch (error) {
        // 忽略重复键错误（对于INSERT ... ON DUPLICATE KEY UPDATE）
        if (error.code === 'ER_DUP_ENTRY' && sql.toLowerCase().includes('on duplicate key update')) {
          console.log(`  ⓘ 数据已存在（忽略重复键错误）`);
        } else {
          console.error(`  ✗ SQL执行错误: ${error.message}`);
          console.error(`    语句: ${sql.substring(0, 100)}...`);
          // 继续执行其他语句
        }
      }
    }
    
    // 验证表是否存在
    console.log('\n验证数据库表...');
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM information_schema.tables 
      WHERE table_schema = ?
      ORDER BY TABLE_NAME
    `, [dbName]);
    
    console.log(`数据库 "${dbName}" 中的表 (共 ${tables.length} 个):`);
    tables.forEach(table => {
      console.log(`  - ${table.TABLE_NAME}`);
    });
    
    // 检查关键表
    const criticalTables = [
      'system_users',
      'product_master',
      'amazon_order_items',
      'amazon_fba_inventory',
      'amazon_fba_reserved'
    ];
    
    console.log('\n关键表状态:');
    for (const tableName of criticalTables) {
      const exists = tables.some(t => t.TABLE_NAME === tableName);
      console.log(`  ${tableName}: ${exists ? '✓ 存在' : '✗ 缺失'}`);
    }
    
    connection.release();
    await pool.end();
    
    console.log('\n数据库初始化完成！');
    console.log('可以使用以下账户登录系统:');
    console.log('  用户名: admin');
    console.log('  密码: admin123');
    
    return true;
  } catch (error) {
    console.error('数据库初始化错误:', error);
    
    if (connection) {
      try {
        connection.release();
      } catch (e) {}
    }
    
    if (pool) {
      try {
        await pool.end();
      } catch (e) {}
    }
    
    return false;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initDatabase().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = initDatabase;