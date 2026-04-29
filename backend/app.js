const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// 导入路由
const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const orderRoutes = require('./routes/order.routes');
const fbaInventoryRoutes = require('./routes/fba.inventory.routes');
const fbaReservedRoutes = require('./routes/fba.reserved.routes');
const businessRoutes = require('./routes/business.routes');
const dataRoutes = require('./routes/data.routes');
const adminRoutes = require('./routes/admin.routes');
const shopRoutes = require('./routes/shop.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const logisticsRoutes = require('./routes/logistics.routes');
const skuInventoryLogRoutes = require('./routes/skuInventoryLog.routes');
const cockpitRoutes = require('./routes/cockpit.routes');
const categoryRoutes = require('./routes/category.routes');
const domesticInventoryRoutes = require('./routes/domestic.inventory.routes');
const productNameSkuMappingRoutes = require('./routes/product.name.sku.mapping.routes');

// 导入中间件
const { authenticateToken, authorizeRoles } = require('./middleware/auth.middleware');
const errorHandler = require('./middleware/error.middleware');

const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务（用于上传的文件）
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// 静态文件服务（用于登录页面等）
app.use(express.static(path.join(__dirname, 'public')));

// 健康检查路由
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/product', authenticateToken, productRoutes);
app.use('/api/orders', authenticateToken, orderRoutes);
app.use('/api/fba/inventory', authenticateToken, fbaInventoryRoutes);
app.use('/api/fba/reserved', authenticateToken, fbaReservedRoutes);
app.use('/api/business', authenticateToken, businessRoutes);
app.use('/api/data', authenticateToken, dataRoutes);
app.use('/api/admin', authenticateToken, authorizeRoles(['admin']), adminRoutes);
app.use('/api/shops', authenticateToken, shopRoutes);
app.use('/api/dashboard', authenticateToken, dashboardRoutes);
app.use('/api/logistics', authenticateToken, logisticsRoutes);
app.use('/api/sku-logs', authenticateToken, skuInventoryLogRoutes);
app.use('/api/cockpit', authenticateToken, cockpitRoutes);
app.use('/api/category', authenticateToken, categoryRoutes);
app.use('/api/domestic-inventory', authenticateToken, domesticInventoryRoutes);
app.use('/api/product-name-sku-mapping', authenticateToken, productNameSkuMappingRoutes);

// 错误处理中间件（放在最后）
app.use(errorHandler);

// 404 处理（放在所有路由之后）
app.use((req, res) => {
  res.status(404).json({
    code: 404,
    message: '路由未找到',
    data: null
  });
});

module.exports = app;