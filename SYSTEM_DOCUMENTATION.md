# 亚马逊跨境电商ERP系统 - 完整系统文档

## 📋 项目概述

亚马逊跨境电商ERP系统是一个为跨境电商卖家设计的全面库存和订单管理系统。系统整合了亚马逊FBA库存管理、订单处理、产品管理、业务报告等功能，帮助卖家高效管理跨境电商业务。

**项目状态**: 开发完成，核心功能已实现
**最新更新**: 2026-04-10

---

## 🎯 功能清单

### 1. 用户认证与权限管理
- ✅ **用户登录/登出**: JWT令牌认证
- ✅ **角色权限控制**: 6种用户角色
  - 管理员(admin): 所有权限，包括文件上传
  - 老板(boss): 查看所有数据，部分管理权限
  - 采购(purchase): 产品管理、采购相关
  - 仓库(warehouse): 库存管理、出入库
  - 财务(finance): 财务数据、报表
  - 销售(sales): 订单管理、客户管理
- ✅ **会话管理**: Token自动刷新（24小时有效期）

### 2. 产品管理模块
- ✅ **产品列表**: 分页、搜索、筛选、排序
- ✅ **产品详情**: 完整产品信息展示
- ✅ **产品编辑**: 多字段更新（SKU、名称、价格、库存等）
- ✅ **产品删除**: 软删除/硬删除支持
- ✅ **批量操作**: 批量导入、导出、更新
- ✅ **产品上传**: Excel/CSV文件上传，自动解析验证
- ✅ **SKU验证**: 自动验证SKU格式，生成错误报告
- ✅ **产品统计**: 总览卡片、库存统计、活跃产品分析
- ✅ **数据导出**: JSON/CSV格式导出

### 3. 订单管理模块（5个时间维度）
- ✅ **今日订单**: 当天订单处理
- ✅ **昨日订单**: 昨日订单查看
- ✅ **近7天订单**: 一周内订单统计
- ✅ **近30天订单**: 月订单分析
- ✅ **自定义时间订单**: 按时间范围查询
- ✅ **订单详情**: 完整订单信息
- ✅ **订单搜索**: 按订单号、SKU、客户等搜索
- ✅ **订单统计**: 销售额、订单数、平均客单价

### 4. FBA库存管理
- ✅ **库存列表**: 亚马逊FBA库存查看
- ✅ **库存详情**: 库存详细信息
- ✅ **库存预警**: 低库存提醒
- ✅ **库存统计**: 库存价值、周转率分析
- ✅ **库存同步**: 支持数据导入

### 5. FBA预留库存管理
- ✅ **预留库存列表**: 查看预留库存
- ✅ **预留原因分析**: 客户订单、入库处理等
- ✅ **预留时长统计**: 平均预留时间分析
- ✅ **库存释放跟踪**: 预留转可用库存跟踪

### 6. 业务报告模块
- ✅ **销售报告**: 销售额、利润分析
- ✅ **库存报告**: 库存周转、缺货分析
- ✅ **绩效报告**: 业务KPI指标
- ✅ **可视化图表**: ECharts图表展示
- ✅ **报告导出**: PDF/Excel格式导出
- ✅ **数据上传**: 业务报告数据导入

### 7. 系统管理功能
- ✅ **文件上传管理**: 上传历史、错误日志
- ✅ **操作日志**: 用户操作记录追踪
- ✅ **系统健康检查**: 服务状态监控
- ✅ **数据备份**: 数据库备份支持

---

## 🛠️ 技术清单

### 后端技术栈 (Node.js + Express)
- **运行时**: Node.js v18+
- **框架**: Express.js 5.x
- **数据库**: MySQL 5.7+ / MySQL2 驱动
- **认证**: JWT (jsonwebtoken) + bcrypt 加密
- **文件处理**: 
  - Multer: 文件上传
  - XLSX: Excel处理
  - csv-parse/csv-parser: CSV处理
- **依赖管理**: npm
- **API文档**: RESTful API设计

### 前端技术栈 (Vue 3)
- **框架**: Vue 3 + Composition API
- **构建工具**: Vite 8.x
- **状态管理**: Pinia
- **路由**: Vue Router 4.x
- **UI组件库**: Element Plus 2.x
- **图标库**: Element Plus Icons
- **数据可视化**: ECharts (通过CDN或本地引入)
- **HTTP客户端**: Axios 1.x
- **开发工具**: Vite插件、TypeScript支持

### 数据库技术
- **数据库**: MySQL 5.7+
- **数据库名**: amazon_erp
- **连接池**: MySQL2连接池管理
- **字符集**: UTF-8
- **存储引擎**: InnoDB

### 开发工具与环境
- **代码编辑器**: VS Code推荐
- **版本控制**: Git
- **API测试**: Postman / curl
- **数据库管理**: MySQL Workbench / phpMyAdmin

### 关键技术特性
- **MVC架构**: 清晰的模型-视图-控制器分离
- **RESTful API**: 标准化的API设计
- **响应式设计**: 前端自适应各种屏幕
- **模块化开发**: 组件化、可复用代码
- **错误处理**: 统一的错误处理中间件
- **日志系统**: 完整的操作日志记录

---

## 🚀 如何运行

### 环境要求
1. **Node.js**: v18或更高版本
2. **MySQL**: 5.7或更高版本
3. **npm**: 最新版本
4. **操作系统**: Windows/macOS/Linux

### 第一步：数据库配置
```sql
# 登录MySQL
mysql -u root -p

# 创建数据库
CREATE DATABASE amazon_erp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 创建用户（可选）
CREATE USER 'erp_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON amazon_erp.* TO 'erp_user'@'localhost';
FLUSH PRIVILEGES;
```

### 第二步：后端设置
```bash
# 进入后端目录
cd backend

# 安装依赖
npm install

# 配置环境变量
# 复制.env.example到.env
cp .env.example .env

# 编辑.env文件，设置数据库连接信息
# DB_HOST=localhost
# DB_PORT=3306
# DB_USER=root
# DB_PASSWORD=123456
# DB_NAME=amazon_erp
# JWT_SECRET=your_jwt_secret_key_change_in_production

# 启动服务器
npm start
# 或
node server.js
```

**后端默认运行在**: `http://localhost:3000`

### 第三步：前端设置
```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

**前端默认运行在**: `http://localhost:5173`

### 第四步：初始化数据
1. **创建数据库表**: 系统启动时会自动检查表结构
2. **创建管理员账户**:
   ```bash
   cd backend
   node create_admin.js
   ```
   或使用默认账号:
   - 用户名: `admin`
   - 密码: `admin123`

   **添加测试账号** (可选，推荐用于开发测试):
   ```bash
   cd backend
   node add_test_users.js
   ```
   该脚本将添加6个不同角色的测试账号:
   - boss / boss123 (公司老板)
   - purchase / purchase123 (采购经理)
   - warehouse / warehouse123 (仓库管理员)
   - finance / finance123 (财务专员)
   - sales / sales123 (销售代表)
   - viewer / viewer123 (只读查看员)

3. **导入测试数据** (可选):
   ```bash
   cd backend
   node seed_test_products.js      # 产品测试数据
   node seed_business_data.js      # 业务报告数据
   ```

### 快速启动脚本 (Windows)
```powershell
# 1. 启动MySQL服务
net start mysql

# 2. 启动后端（在新终端）
cd backend
node server.js

# 3. 启动前端（在新终端）
cd frontend
npm run dev
```

---

## 🚀 生产环境部署

### **部署前准备**
1. **修改JWT密钥** (必须):
   ```bash
   # 修改backend/.env文件
   JWT_SECRET=your_strong_random_secret_key_here
   ```

2. **修改数据库配置**:
   ```bash
   DB_HOST=production_mysql_host
   DB_USER=production_username
   DB_PASSWORD=strong_production_password
   DB_NAME=amazon_erp
   ```

3. **创建生产环境用户**:
   ```sql
   -- 删除测试账号（如果不需要）
   DELETE FROM system_users WHERE username IN ('admin', 'boss', 'purchase', 'warehouse', 'finance', 'sales', 'viewer');
   
   -- 创建公司实际员工账号
   INSERT INTO system_users (username, password, real_name, role, email, created_at)
   VALUES ('company_admin', '加密后的密码', '公司管理员', 'admin', 'admin@company.com', NOW());
   ```

### **安全性配置**
1. 启用HTTPS（使用Nginx反向代理）
2. 配置防火墙规则
3. 定期备份数据库
4. 启用操作日志审计

### **性能优化**
1. 数据库索引优化
2. 前端资源压缩
3. CDN静态资源加速
4. 负载均衡（高并发场景）

### **监控与维护**
1. 系统健康检查
2. 错误日志监控
3. 数据库性能监控
4. 定期安全更新

---

## 👥 用户手册

### **系统登录**
1. **访问系统**: 打开浏览器访问 `http://您的域名或IP:3000/login.html`
2. **登录凭证**: 使用公司提供的用户名和密码登录
3. **忘记密码**: 联系系统管理员重置密码

### **主要功能模块**
1. **数据看板**: 实时查看核心业务指标和预警信息
2. **库存管理**: 管理商品库存、FBA库存和预留库存
3. **订单管理**: 处理亚马逊订单，支持多个时间维度查询
4. **业务报告**: 查看销售报告、利润分析和库存报表
5. **产品管理**: 管理商品信息、上传批量数据和导出报表

### **权限体系**
- **管理员**: 系统所有权限，包括用户管理
- **公司老板**: 查看所有数据，审批重要操作
- **部门经理**: 管辖范围内的完整操作权限
- **普通员工**: 分配的操作权限，如查看、编辑
- **只读用户**: 仅查看数据，无编辑权限

### **操作指南**
1. **数据上传**: 支持Excel/CSV文件批量上传
2. **报表导出**: 支持PDF/Excel格式导出
3. **数据筛选**: 多种条件组合筛选
4. **批量操作**: 支持批量更新和删除

### **常见问题**
1. **无法登录**: 检查网络连接，确认用户名密码正确
2. **数据不同步**: 等待5分钟自动同步，或手动刷新
3. **权限不足**: 联系上级领导或系统管理员
4. **系统缓慢**: 检查网络状况，或联系技术支持

---

## 🔐 开发者测试账号信息

> **注意**: 此部分仅用于开发和测试环境，生产环境请勿保留测试账号。

系统预置了 **7个测试账号**，涵盖所有用户角色，方便开发者测试不同权限级别的功能。

### **所有可用账号清单**

| 用户名 | 密码 | 角色 | 权限描述 | 邮箱 |
|--------|------|------|----------|------|
| **admin** | `admin123` | admin | 系统管理员 - 所有权限 | null |
| **boss** | `boss123` | boss | 公司老板 - 查看所有数据，部分管理权限 | boss@example.com |
| **purchase** | `purchase123` | purchase | 采购经理 - 产品管理、采购相关 | purchase@example.com |
| **warehouse** | `warehouse123` | warehouse | 仓库管理员 - 库存管理、出入库 | warehouse@example.com |
| **finance** | `finance123` | finance | 财务专员 - 财务数据、报表 | finance@example.com |
| **sales** | `sales123` | sales | 销售代表 - 订单管理、客户管理 | sales@example.com |
| **viewer** | `viewer123` | sales | 只读查看员 - 仅查看权限 | viewer@example.com |

### **登录方式**
- **测试登录页面**: `http://localhost:3000/login.html` (开发环境)
- **API测试**: 使用Postman或curl调用登录接口

### **详细文档**
- **[ACCOUNTS.md](./ACCOUNTS.md)** - 完整的账号信息文档，包含详细权限说明、维护方法和故障排除指南

---

## 📡 API文档概览

### 认证相关
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出
- `GET /api/auth/profile` - 获取用户信息
- `POST /api/auth/refresh` - 刷新Token

### 产品管理
- `GET /api/products` - 产品列表（分页、搜索）
- `GET /api/products/stats` - 产品统计
- `GET /api/products/:sku` - 产品详情
- `PUT /api/products/:sku` - 更新产品
- `DELETE /api/products/:sku` - 删除产品
- `POST /api/products/upload` - 上传产品文件
- `GET /api/products/export` - 导出产品数据
- `GET /api/products/skus` - 获取SKU列表

### 订单管理
- `GET /api/orders/today` - 今日订单
- `GET /api/orders/yesterday` - 昨日订单
- `GET /api/orders/week` - 近7天订单
- `GET /api/orders/month` - 近30天订单
- `GET /api/orders/range` - 自定义时间订单
- `GET /api/orders/:id` - 订单详情

### FBA库存管理
- `GET /api/fba-inventory` - FBA库存列表
- `GET /api/fba-inventory/stats` - 库存统计
- `POST /api/fba-inventory/upload` - 上传库存数据

### FBA预留库存管理
- `GET /api/fba-reserved` - FBA预留库存列表
- `GET /api/fba-reserved/stats` - 预留库存统计
- `POST /api/fba-reserved/upload` - 上传预留库存数据

### 业务报告
- `GET /api/business-reports` - 业务报告列表
- `GET /api/business-reports/stats` - 报告统计
- `POST /api/business-reports/upload` - 上传业务数据
- `GET /api/business-reports/export` - 导出报告

### 系统管理
- `GET /api/upload-logs` - 上传日志
- `GET /api/operation-logs` - 操作日志
- `GET /api/health` - 系统健康检查

---

## 🗄️ 数据库结构

### 核心数据表

#### 1. system_users (系统用户表)
```sql
id INT PRIMARY KEY AUTO_INCREMENT,
username VARCHAR(50) UNIQUE NOT NULL,
password VARCHAR(255) NOT NULL,
role ENUM('admin','boss','purchase','warehouse','finance','sales') NOT NULL,
email VARCHAR(100),
phone VARCHAR(20),
status ENUM('active','inactive') DEFAULT 'active',
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

#### 2. amazon_products (商品库存表)
```sql
id INT PRIMARY KEY AUTO_INCREMENT,
seller_sku VARCHAR(100) UNIQUE NOT NULL,
product_name VARCHAR(255) NOT NULL,
category VARCHAR(100),
brand VARCHAR(100),
price DECIMAL(10,2),
cost DECIMAL(10,2),
stock_quantity INT DEFAULT 0,
safety_stock INT DEFAULT 10,
status ENUM('active','inactive','discontinued') DEFAULT 'active',
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

#### 3. amazon_orders (订单表)
```sql
id INT PRIMARY KEY AUTO_INCREMENT,
order_id VARCHAR(100) UNIQUE NOT NULL,
seller_sku VARCHAR(100) NOT NULL,
quantity INT NOT NULL,
unit_price DECIMAL(10,2),
total_amount DECIMAL(10,2),
order_date DATE NOT NULL,
order_status ENUM('pending','shipped','delivered','cancelled') DEFAULT 'pending',
customer_info TEXT,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### 4. amazon_fba_inventory (FBA库存表)
```sql
id INT PRIMARY KEY AUTO_INCREMENT,
seller_sku VARCHAR(100) NOT NULL,
fnsku VARCHAR(100),
product_name VARCHAR(255),
available_quantity INT DEFAULT 0,
inbound_quantity INT DEFAULT 0,
total_quantity INT DEFAULT 0,
warehouse VARCHAR(100),
report_date DATE NOT NULL,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### 5. amazon_fba_reserved (FBA预留库存表)
```sql
id INT PRIMARY KEY AUTO_INCREMENT,
seller_sku VARCHAR(100) NOT NULL,
reserved_quantity INT DEFAULT 0,
reserved_type VARCHAR(50),
reserved_reason VARCHAR(255),
expected_release_date DATE,
report_date DATE NOT NULL,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### 6. amazon_business_report (亚马逊业务报告表)
```sql
id INT PRIMARY KEY AUTO_INCREMENT,
seller_sku VARCHAR(100) NOT NULL,
report_month DATE NOT NULL COMMENT '报告月份，格式 YYYY-MM-01',
item_title TEXT,
parent_asin VARCHAR(20),
child_asin VARCHAR(20),
sessions INT DEFAULT 0 COMMENT '会话数 - 总计',
sessions_b2b INT DEFAULT 0 COMMENT '会话 - 总计 - B2B',
conversion_rate DECIMAL(5, 2) COMMENT '转化率 - 总计',
session_percentage_b2b DECIMAL(5, 2) COMMENT '会话百分比 - 总计 - B2B',
page_views INT DEFAULT 0 COMMENT '页面浏览量 - 总计',
page_views_b2b INT DEFAULT 0 COMMENT '页面浏览量 - 总计 - B2B',
page_views_percentage DECIMAL(5, 2) COMMENT '页面浏览量百分比 - 总计',
page_views_percentage_b2b DECIMAL(5, 2) COMMENT '页面浏览量百分比 - 总计 - B2B',
recommended_offer_percentage DECIMAL(5, 2) COMMENT '推荐报价（推荐报价展示位）百分比',
recommended_offer_percentage_b2b DECIMAL(5, 2) COMMENT '推荐报价（推荐报价展示位）百分比 - B2B',
ordered_quantity INT DEFAULT 0 COMMENT '已订购商品数量',
ordered_quantity_b2b INT DEFAULT 0 COMMENT '已订购商品数量 - B2B',
product_session_percentage DECIMAL(5, 2) COMMENT '商品会话百分比',
product_session_percentage_b2b DECIMAL(5, 2) COMMENT '商品会话百分比 - B2B',
sales_amount DECIMAL(10, 2) COMMENT '已订购商品销售额',
sales_amount_b2b DECIMAL(10, 2) COMMENT '已订购商品销售额 - B2B',
total_order_items INT DEFAULT 0 COMMENT '订单商品总数',
total_order_items_b2b INT DEFAULT 0 COMMENT '订单商品总数 - B2B',
upload_batch VARCHAR(50),
upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
UNIQUE KEY uk_sku_month (seller_sku, report_month),
INDEX idx_sku (seller_sku),
INDEX idx_month (report_month),
INDEX idx_parent_asin (parent_asin)
```

**字段映射说明**（中文表头 → 数据库字段名）：
- （父）ASIN → parent_asin
- （子）ASIN → child_asin
- 标题 → item_title
- SKU → seller_sku
- 会话数 - 总计 → sessions
- 会话 - 总计 - B2B → sessions_b2b
- 转化率 - 总计 → conversion_rate
- 会话百分比 - 总计 - B2B → session_percentage_b2b
- 页面浏览量 - 总计 → page_views
- 页面浏览量 - 总计 - B2B → page_views_b2b
- 页面浏览量百分比 - 总计 → page_views_percentage
- 页面浏览量百分比 - 总计 - B2B → page_views_percentage_b2b
- 推荐报价（推荐报价展示位）百分比 → recommended_offer_percentage
- 推荐报价（推荐报价展示位）百分比 - B2B → recommended_offer_percentage_b2b
- 已订购商品数量 → ordered_quantity
- 已订购商品数量 - B2B → ordered_quantity_b2b
- 商品会话百分比 → product_session_percentage
- 商品会话百分比 - B2B → product_session_percentage_b2b
- 已订购商品销售额 → sales_amount
- 已订购商品销售额 - B2B → sales_amount_b2b
- 订单商品总数 → total_order_items
- 订单商品总数 - B2B → total_order_items_b2b

**完整示例数据**（CSV格式）：

### 表头（必须包含以下中文表头）：
```
（父）ASIN,（子）ASIN,标题,SKU,会话数 - 总计,会话 - 总计 - B2B,转化率 - 总计,会话百分比 - 总计 - B2B,页面浏览量 - 总计,页面浏览量 - 总计 - B2B,页面浏览量百分比 - 总计,页面浏览量百分比 - 总计 - B2B,推荐报价（推荐报价展示位）百分比,推荐报价（推荐报价展示位）百分比 - B2B,已订购商品数量,已订购商品数量 - B2B,商品会话百分比,商品会话百分比 - B2B,已订购商品销售额,已订购商品销售额 - B2B,订单商品总数,订单商品总数 - B2B
```

### 数据行示例（支持千位分隔符和货币符号）：
```
B0FK1Y4HJZ,B0FK1T49NS,SIMIWALI Colorful Funny Novelty Dress Socks for Men Women Teens Mothers Day Gifts Crazy Funky Cool Argyle Striped Crew Socks Patterned Printed Comfy Casual Happy Fun for Dad Mum Grandpa Size 9-11,SY05-005,1,034,25,3.12%,3.94%,1,364,35,3.39%,4.49%,100.00%,100.00%,85,4,8.22%,16.00%,US$1,100.15,US$47.96,85,4
```

### 数据转换说明：
原始CSV数据中的字段 | 数据库存储值 | 转换规则
---|---|---
`1,034` | `1034` | 去除千位分隔符逗号
`3.12%` | `3.12` | 去除百分号，存储为小数
`US$1,100.15` | `1100.15` | 去除货币符号和千位分隔符
`1,364` | `1364` | 去除千位分隔符逗号
`100.00%` | `100.00` | 去除百分号，存储为小数
`85` | `85` | 直接存储（无转换）

### 示例文件下载：
系统提供了两个示例文件供测试使用：

1. **英文表头示例文件**：[business_report_sample.csv](business_report_sample.csv)
   - 表头格式：`report_id,site,report_date,total_sales,total_orders,...`
   - 适用于旧版本系统或英文报告

2. **中文表头示例文件**：[business_report_chinese_sample.csv](business_report_chinese_sample.csv)
   - 表头格式：`（父）ASIN,（子）ASIN,标题,SKU,会话数 - 总计,...`
   - 包含用户提供的完整22个字段中文表头
   - 数据已预处理好千位分隔符和货币符号转换

**使用建议**：新用户请使用中文表头示例文件，系统会自动识别并处理中文字段映射。

### 上传文件要求：
1. **文件格式**: CSV或Excel (.xlsx, .xls)
2. **字符编码**: UTF-8（推荐）
3. **表头要求**: 必须包含以上完整中文表头，顺序可调整
4. **数据格式**: 支持包含千位分隔符、货币符号、百分号的数值
5. **必填字段**: SKU（店铺代码）必须填写，其他字段可为空
6. **日期字段**: 如果包含报告日期，系统会自动转换为report_month（YYYY-MM-01格式）

### 系统处理流程：
1. 文件上传 → 2. 自动解析中文表头 → 3. 字段映射到数据库字段 → 4. 数据清洗转换 → 5. 批量插入/更新数据库 → 6. 生成上传日志

**数据转换规则**：
1. 数值处理：去除千位分隔符（逗号）、货币符号（US$、¥等）、空格
2. 百分比处理：去除百分号，存储为小数（如"3.12%" → 3.12）
3. 日期处理：report_month字段格式为YYYY-MM-01，由报告日期转换而来
4. SKU映射：优先使用SKU字段，其次使用report_id、seller_sku等

#### 7. system_upload_logs (上传日志表)
```sql
id INT PRIMARY KEY AUTO_INCREMENT,
user_id INT NOT NULL,
file_name VARCHAR(255) NOT NULL,
file_type VARCHAR(50),
record_count INT,
success_count INT,
error_count INT,
error_file_path VARCHAR(255),
upload_status ENUM('success','partial','failed') DEFAULT 'success',
upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### 8. system_operation_logs (操作日志表)
```sql
id INT PRIMARY KEY AUTO_INCREMENT,
user_id INT NOT NULL,
operation_type VARCHAR(50) NOT NULL,
operation_target VARCHAR(100),
operation_details TEXT,
ip_address VARCHAR(45),
user_agent TEXT,
operation_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### 数据库关系图
```
system_users (1) → (多) system_upload_logs
system_users (1) → (多) system_operation_logs
amazon_products (1) → (多) amazon_orders
amazon_products (1) → (多) amazon_fba_inventory
amazon_products (1) → (多) amazon_fba_reserved
```

---

## 🚢 部署指南

### 开发环境部署
1. **克隆代码库**
   ```bash
   git clone <repository-url>
   cd 库存管理
   ```

2. **安装依赖**
   ```bash
   # 后端
   cd backend
   npm install
   
   # 前端
   cd ../frontend
   npm install
   ```

3. **环境配置**
   ```bash
   # 后端环境变量
   cp backend/.env.example backend/.env
   # 编辑backend/.env文件
   
   # 前端API配置（如果需要）
   # 编辑frontend/src/utils/api.js中的baseURL
   ```

4. **启动服务**
   ```bash
   # 终端1 - 后端
   cd backend
   npm start
   
   # 终端2 - 前端
   cd frontend
   npm run dev
   ```

### 生产环境部署建议

#### 1. 服务器要求
- **CPU**: 2核心以上
- **内存**: 4GB以上
- **存储**: 50GB以上（根据数据量）
- **操作系统**: Ubuntu 20.04+/CentOS 8+

#### 2. 安全配置
- 修改默认JWT_SECRET
- 配置HTTPS证书
- 设置防火墙规则
- 定期备份数据库
- 使用环境变量存储敏感信息

#### 3. 性能优化
- **数据库**: 添加索引、查询优化
- **Node.js**: 使用PM2进程管理
- **前端**: 代码压缩、CDN加速
- **缓存**: Redis缓存热点数据

#### 4. 监控与维护
- **日志**: 集中日志管理
- **监控**: 系统资源监控
- **备份**: 自动化数据库备份
- **更新**: 定期更新依赖包

---

## ⚠️ 重要技术注意事项

### 1. MySQL2驱动限制
**问题**: MySQL2驱动不支持参数化查询中的LIMIT/OFFSET占位符
**解决方案**: 使用字符串拼接代替占位符
```javascript
// 错误示例
sql += ' LIMIT ? OFFSET ?';
params.push(pageSize, offset);

// 正确示例
sql += ` LIMIT ${pageSize} OFFSET ${offset}`;
// params中不再包含pageSize和offset
```

### 2. UPDATE查询返回值
**问题**: UPDATE/DELETE/INSERT查询返回`ResultSetHeader`对象，而不是数组
**解决方案**: 直接使用查询结果，不要数组解构
```javascript
// 错误示例
const [result] = await this.query(sql, values);

// 正确示例
const result = await this.query(sql, values);
return result.affectedRows > 0;
```

### 3. 文件上传配置
- 上传目录: `backend/uploads/`
- 最大文件大小: 10MB
- 支持格式: Excel (.xlsx, .xls), CSV
- 文件处理: 异步处理，生成错误报告

### 4. 分页参数安全
由于LIMIT/OFFSET使用字符串拼接，需要确保`pageSize`和`offset`是安全数字：
```javascript
const pageSize = Math.min(Math.max(parseInt(req.query.pageSize) || 20, 1), 100);
const page = Math.max(parseInt(req.query.page) || 1, 1);
const offset = (page - 1) * pageSize;
```

---

## 🔧 故障排除

### 常见问题

#### 1. 数据库连接失败
```bash
# 检查MySQL服务状态
sudo systemctl status mysql

# 检查连接配置
cat backend/.env | grep DB_

# 测试数据库连接
mysql -u root -p -e "USE amazon_erp; SHOW TABLES;"
```

#### 2. 后端启动失败
```bash
# 检查端口占用
netstat -tlnp | grep :3000

# 检查Node.js版本
node --version

# 检查依赖
cd backend
npm list --depth=0
```

#### 3. 前端启动失败
```bash
# 检查端口占用
netstat -tlnp | grep :5173

# 清除缓存
rm -rf node_modules package-lock.json
npm install
```

#### 4. API请求失败
- 检查后端是否运行
- 检查CORS配置
- 检查JWT令牌有效性
- 查看服务器日志

### 日志位置
- **后端日志**: `backend/server.log` (如果配置了日志重定向)
- **前端日志**: 浏览器开发者工具Console
- **数据库日志**: MySQL错误日志
- **上传日志**: `backend/uploads/`目录下的错误文件

---

## 📞 支持与联系

### 开发团队
- **技术支持**: 系统开发与维护团队
- **问题报告**: GitHub Issues或团队邮箱
- **文档更新**: 定期更新系统文档

### 版本信息
- **当前版本**: v1.0.0
- **最新更新**: 2026-04-10
- **功能状态**: 核心功能开发完成

### 未来规划
- 移动端适配
- 第三方API集成（亚马逊API、物流API）
- 高级数据分析与预测
- 多店铺管理支持
- 自动化补货建议

---

**文档最后更新**: 2026-04-10  
**维护状态**: 活跃维护  
**系统状态**: 开发完成，可投入生产使用