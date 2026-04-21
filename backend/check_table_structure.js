const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkTableStructure() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    
    console.log('检查 amazon_business_report 表结构...\n');
    
    // 获取表结构
    const [columns] = await connection.execute(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        COLUMN_KEY,
        EXTRA
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'amazon_business_report'
      ORDER BY ORDINAL_POSITION
    `, [process.env.DB_NAME]);
    
    if (columns.length === 0) {
      console.log('amazon_business_report 表不存在');
      
      // 检查所有表
      const [tables] = await connection.execute(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = ?
      `, [process.env.DB_NAME]);
      
      console.log('\n当前数据库中的表:');
      tables.forEach(table => {
        console.log(`  - ${table.TABLE_NAME}`);
      });
    } else {
      console.log('表结构:');
      console.log('----------------------------------------');
      console.log('列名 | 数据类型 | 可为空 | 主键 | 额外信息');
      console.log('----------------------------------------');
      columns.forEach(col => {
        console.log(`${col.COLUMN_NAME} | ${col.DATA_TYPE} | ${col.IS_NULLABLE} | ${col.COLUMN_KEY} | ${col.EXTRA}`);
      });
      console.log('----------------------------------------');
    }
    
  } catch (error) {
    console.error('检查表结构时出错:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n数据库连接已关闭');
    }
  }
}

checkTableStructure();