const mysql = require('mysql2/promise');
require('dotenv').config();

async function seedBusinessData() {
  let connection;
  try {
    console.log('连接数据库...');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    
    console.log('开始插入业务报告示例数据...');
    
    // 清空现有数据（可选）
    await connection.execute('DELETE FROM amazon_business_report');
    
    // 生成示例数据 - 过去30天的数据
    const sites = ['US', 'UK', 'DE', 'FR', 'JP', 'CA', 'IT', 'ES', 'AU', 'MX'];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    const reports = [];
    
    for (let i = 0; i < 30; i++) {
      const reportDate = new Date(startDate);
      reportDate.setDate(startDate.getDate() + i);
      
      // 每个站点生成一条报告
      for (const site of sites.slice(0, 3)) { // 只生成前3个站点的数据
        const reportId = `BR-${site}-${reportDate.toISOString().slice(0, 10).replace(/-/g, '')}`;
        const totalSales = Math.floor(Math.random() * 10000) + 5000;
        const totalOrders = Math.floor(Math.random() * 200) + 50;
        const totalUnits = Math.floor(Math.random() * 300) + 100;
        const pageViews = Math.floor(Math.random() * 5000) + 2000;
        const visitors = Math.floor(Math.random() * 2000) + 1000;
        
        reports.push([
          reportId,
          site,
          reportDate.toISOString().split('T')[0],
          totalSales,
          totalOrders,
          totalUnits,
          (totalSales / totalOrders).toFixed(2),
          ((totalOrders / visitors) * 100).toFixed(2),
          pageViews,
          visitors,
          Math.floor(Math.random() * 5) + 1, // session_duration_minutes
          new Date().toISOString().slice(0, 19).replace('T', ' '),
          new Date().toISOString().slice(0, 19).replace('T', ' ')
        ]);
      }
    }
    
    if (reports.length > 0) {
      const sql = `
        INSERT INTO amazon_business_report (
          report_id, site, report_date, total_sales, total_orders, total_units,
          average_sales_per_order, conversion_rate, page_views, visitors,
          session_duration_minutes, created_at, updated_at
        ) VALUES ?
      `;
      
      await connection.query(sql, [reports]);
      console.log(`成功插入 ${reports.length} 条业务报告数据`);
      
      // 显示统计信息
      const [countResult] = await connection.execute(
        'SELECT COUNT(*) as count FROM amazon_business_report'
      );
      console.log(`当前表中有 ${countResult[0].count} 条记录`);
      
      const [statsResult] = await connection.execute(`
        SELECT 
          SUM(total_sales) as total_sales,
          SUM(total_orders) as total_orders,
          SUM(total_units) as total_units
        FROM amazon_business_report
      `);
      
      console.log('数据统计:');
      console.log(`总销售额: ¥${statsResult[0].total_sales.toLocaleString('zh-CN')}`);
      console.log(`总订单数: ${statsResult[0].total_orders}`);
      console.log(`总销售数量: ${statsResult[0].total_units}`);
    } else {
      console.log('没有数据需要插入');
    }
    
  } catch (error) {
    console.error('插入数据时出错:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('数据库连接已关闭');
    }
  }
}

seedBusinessData();