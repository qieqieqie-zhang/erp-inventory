# 亚马逊跨境电商 ERP 系统 - 开发指南

## 一、本地开发环境初始化

克隆项目后，只需运行一次初始化脚本：

```bash
./setup-dev-environment.sh
```

脚本会自动：
- 启用 pre-commit hook（JS/Vue 语法检查，提交前自动运行）
- 检测 Node.js 版本
- 检查数据库配置文件

---

## 二、项目启动

### 1. 配置数据库连接

复制环境变量示例文件：

```bash
cp backend/.env.example backend/.env
```

编辑 `backend/.env`，填入 MySQL 数据库信息：

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=你的密码
DB_NAME=erp_inventory
PORT=3000
```

### 2. 初始化数据库表

```bash
cd backend
node init_database.js
```

### 3. 启动后端服务

```bash
cd backend
node server.js
# 或使用
npm start
```

### 4. 启动前端服务

```bash
cd frontend
npm install   # 首次运行需要安装依赖
npm run dev
```

前端地址：http://localhost:5173
后端地址：http://localhost:3000

---

## 三、提交代码规范

### pre-commit hook（自动语法检查）

提交代码前会自动检查 JS/Vue 文件语法，**请确保代码无语法错误后再提交**。

检查内容：
- backend/*.js 文件（node --check）
- frontend/**/*.vue 文件（@vue/compiler-sfc）

### 提交步骤

```bash
# 1. 添加修改的文件
git add .

# 2. 提交（会自动触发语法检查）
git commit -m "提交描述"

# 3. 推送到远程
git push origin main
```

### 提交信息规范

格式：`type: 描述`

type 可选值：
- `feat` — 新功能
- `fix` — 修复 bug
- `refactor` — 重构
- `chore` — 工具/配置变更
- `docs` — 文档更新

示例：
```bash
git commit -m "feat: 添加商品批量删除功能"
git commit -m "fix: 修复物流上传SKU预览失败"
```

---

## 四、测试数据

测试用的 Excel/CSV 文件放在项目根目录下的 `test-data/` 目录，该目录不会提交到 git。

```
test-data/
├── 物流SKU模板.xlsx
├── FBA库存报告.xlsx
└── ...
```

---

## 五、常见问题

### 1. pre-commit hook 报错 "Syntax error"

说明有 JS 或 Vue 文件存在语法错误，需要先修复。

常见错误：
- 多余的 `}` 或 `)`
- 少了逗号 `,`
- 字符串未闭合

### 2. 前端页面空白或报错

检查前端是否正常启动，端口是否被占用：

```bash
cd frontend
npm run dev
```

### 3. 后端数据库连接失败

检查 `backend/.env` 配置是否正确，MySQL 服务是否启动。

---

## 六、Git 协作流程

```
1. 每次开始新任务前，从 main 分支拉取最新代码
   git checkout main
   git pull origin main

2. 创建新分支
   git checkout -b feat/新功能名称

3. 开发完成后，提交代码
   git add .
   git commit -m "feat: xxx"

4. 推送分支
   git push origin feat/新功能名称

5. 在 GitHub 上创建 Pull Request 合并到 main
```

---

## 七、项目技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3 + Element Plus + Vite + Pinia |
| 后端 | Node.js + Express + MySQL |
| 认证 | JWT |
| 日志 | 库存变动日志（sku_inventory_logs） |

---

## 八、功能清单

### 8.1 数据看板（Dashboard）

**路由**: `/dashboard`

综合数据展示与预警，包含：
- 首页核心指标（总商品数、FBA可售库存、近7天销量、近30天销售额）
- 销量 TOP10 商品排行（支持 7天/30天 切换）
- 库存预警提醒（零库存、低库存、积压库存）
- 最近上传记录查看
- 快捷操作入口

**API**: `/api/dashboard/stats`、`/api/dashboard/top-products`、`/api/dashboard/alerts`、`/api/dashboard/recent-uploads`

---

### 8.2 店铺管理（Shop）

**路由**: `/shops`

多平台店铺（Amazon / eBay / Walmart / Other）统一管理，包含：
- 店铺列表（分页、搜索、状态筛选）
- 店铺统计（总数、活跃/停用、按平台分类）
- 新增 / 编辑 / 删除店铺
- 批量删除

**API**: `/api/shops`（CRUD）、`/api/shops/stats`、`/api/shops/all`

**数据表**: `shops`

---

### 8.3 商品管理（Product）

**路由**: `/products`

SKU 级别商品库存管理，包含：
- 商品列表（SKU搜索、店铺筛选、状态筛选、库存范围筛选）
- 商品统计（总数、在售、低库存、缺货）
- 上传商品库存文件（批量覆盖更新）
- 商品详情（含库存变动日志展示）
- 编辑商品信息（名称、价格、库存、状态）
- 删除 / 批量删除
- 导出商品数据（CSV/JSON）
- **库存分布**（物流库存 + FBA库存 + FBA预留，统一视图）
- 关联店铺信息

**API**: `/api/product/list`、`/api/product/upload`、`/api/product/detail/:sku`、`/api/product/:sku`（PUT/DELETE）

**数据表**: `amazon_products`

---

### 8.4 订单管理（Order）

**路由**: `/orders`

5个时间维度独立存储的订单追踪，包含：
- 订单列表（昨日/近3天/近7天/近14天/近30天）
- 订单统计（订单总数、销售总额、销售数量、客单价）
- 按维度上传订单文件
- 订单筛选（SKU、日期范围、订单状态）
- 订单详情查看
- 订单导出
- 国家分布统计

**API**: `/api/orders/:dimension/list`、`/api/orders/:dimension/upload`、`/api/orders/:dimension/summary`、`/api/orders/:dimension/stats`

**数据表**: `amazon_orders`（含 `dimension` 字段区分时间维度）

---

### 8.5 FBA库存管理（FBA Inventory）

**路由**: `/fba/inventory`

FBA 仓库库存精细化管理，包含：
- FBA库存概览（总库存数量、库存总价值、低库存商品数、库龄平均值）
- 库存列表（SKU/名称搜索、站点筛选、库龄筛选）
- 高级筛选（仓库代码、可售数量、预留数量、入库时间）
- 库存预警（零库存、即将断货、积压库存）
- 上传FBA库存报告（全量覆盖）
- 导出FBA库存数据
- 表格/卡片双视图切换
- 自定义显示列
- **补货建议**（含建议补货量、建议发货日期）

**API**: `/api/fba/inventory/list`、`/api/fba/inventory/upload`、`/api/fba/inventory/stats`、`/api/fba/inventory/alerts`

**数据表**: `amazon_fba_inventory`

---

### 8.6 FBA预留管理（FBA Reserved）

**路由**: `/fba/reserved`

FBA 预留库存分类统计，包含：
- 预留库存列表（搜索、筛选、分页）
- 预留统计（总SKU数、总预留量）
- 预留类型分布（买家订单、调仓、仓库处理）
- 上传FBA预留库存报告
- 导出FBA预留库存数据
- 按SKU查看详情

**API**: `/api/fba/reserved/list`、`/api/fba/reserved/upload`、`/api/fba/reserved/stats`、`/api/fba/reserved/distribution`

**数据表**: `amazon_fba_reserved`

---

### 8.7 物流跟踪（Logistics）

**路由**: `/logistics`

头程物流全程监控，包含：
- 物流列表（店铺、状态、国家、关键词、日期筛选）
- 物流统计（待发货/已发货/运输中/已到港/清关完成/已派送）
- 新增 / 编辑 / 删除物流记录
- 批量删除
- 上传物流数据（支持多物流公司格式自动解析）
- 物流数据预览
- **SKU列表上传与预览**（亚马逊 Send to Amazon 模版）
- **同步SKU到商品主表**（按FBA仓库编号批次覆盖）
- 更新物流状态
- 导出物流数据

**API**: `/api/logistics/list`、`/api/logistics/upload`、`/api/logistics/update-sku-list`、`/api/logistics/sync-products/:id`、`/api/logistics/:id`（CRUD）、`/api/logistics/:id/status`（PATCH）

**数据表**: `logistics_tracking`（含 `sku_list` JSON 字段存储SKU明细）

---

### 8.8 业务报告（Business Report）

**路由**: `/business`

月度销售与会话数据分析，包含：
- 业务报告列表（日期范围筛选、排序、分页）
- 报告摘要（SKU统计、销售统计、转化率、会话数据）
- 按站点销售统计
- 销售趋势分析
- 上传业务报告数据（支持中文表头）
- 导出业务报告数据

**API**: `/api/business/reports`、`/api/business/upload`、`/api/business/summary`

**数据表**: `amazon_business_report`

---

### 8.9 数据汇总（Data Summary）

**路由**: `/data-summary`

全局数据合并展示（预留扩展功能）

---

### 8.10 用户管理（Admin / User Management）

**路由**: `/admin/users`（仅 admin 角色可见）

系统用户管理，包含：
- 用户列表（搜索、角色筛选、分页）
- 创建 / 编辑 / 删除用户
- 用户角色：admin / boss / purchase / warehouse / finance / sales
- 重置密码

**API**: `/api/admin/users`（CRUD）、`/api/admin/users/:id/reset-password`

**数据表**: `system_users`

---

### 8.11 上传日志（Upload Logs）

**路由**: `/admin/upload-logs`（仅 admin 角色可见）

所有文件上传记录审计，包含：
- 上传记录列表（模块筛选、用户筛选、日期范围）
- 成功/失败/更新条数统计
- 错误文件下载

**API**: `/api/admin/upload-logs`

**数据表**: `system_upload_logs`

---

### 8.12 认证模块（Auth）

**路由**: `/login`

JWT 令牌认证，包含：
- 用户登录（用户名 + 密码）
- 用户退出
- 获取当前用户信息
- 修改密码
- 刷新 Token

**API**: `/api/auth/login`、`/api/auth/logout`、`/api/auth/me`、`/api/auth/change-password`

**数据表**: `system_users`

---

### 8.13 库存变动日志（SKU Inventory Log）

贯穿所有库存变更操作，统一日志记录：

| 字段 | 说明 |
|------|------|
| module | 来源模块（logistics / fba_inventory / fba_reserved） |
| action | 操作类型（upload / delete / update / status_change） |
| before_quantity | 变动前数量 |
| after_quantity | 变动后数量 |
| change_amount | 变动数量（正增负减） |
| operator_name | 操作人 |
| reference_id | 关联业务ID（如物流ID、批次号） |

日志自动写入切面：`InventoryChangeService`，已接入：
- 物流SKU上传
- FBA库存上传
- FBA预留上传
- 手动同步商品

**API**: `/api/sku-logs`、`/api/sku-logs/:sku`

**数据表**: `sku_inventory_logs`

---

## 九、数据库表清单

| 表名 | 说明 |
|------|------|
| `shops` | 店铺管理表 |
| `system_users` | 系统用户表 |
| `amazon_products` | 商品库存表（主商品档案） |
| `amazon_orders` | 订单表（含 dimension 时间维度） |
| `amazon_fba_inventory` | FBA库存表 |
| `amazon_fba_reserved` | FBA预留库存表 |
| `amazon_business_report` | 业务报告表 |
| `logistics_tracking` | 物流跟踪表 |
| `system_upload_logs` | 上传日志表 |
| `system_operation_logs` | 操作日志表 |
| `sku_inventory_logs` | SKU库存变动日志表 |
