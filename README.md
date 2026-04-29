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

**数据表**: `product_master`

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
| `product_master` | 商品库存表（主商品档案） |
| `amazon_orders` | 订单表（含 dimension 时间维度） |
| `amazon_fba_inventory` | FBA库存表 |
| `amazon_fba_reserved` | FBA预留库存表 |
| `amazon_business_report` | 业务报告表 |
| `logistics_tracking` | 物流跟踪表 |
| `system_upload_logs` | 上传日志表 |
| `system_operation_logs` | 操作日志表 |
| `sku_inventory_logs` | SKU库存变动日志表 |

---

## 十、数据库表结构

### 10.1 shops（店铺管理表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| shop_id | VARCHAR(50) | 店铺标识ID（唯一） |
| shop_name | VARCHAR(100) | 店铺名称 |
| shop_code | VARCHAR(50) | 店铺代码（唯一） |
| shop_type | ENUM | 平台类型：Amazon / eBay / Walmart / Other |
| region | VARCHAR(100) | 区域/国家 |
| marketplace | VARCHAR(100) | 市场/站点 |
| seller_id | VARCHAR(100) | 卖家ID |
| status | ENUM | 状态：active / inactive |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

**关联**：被 `product_master`、`amazon_orders`、`logistics_tracking` 的 `shop_id` 字段引用。

---

### 10.2 system_users（系统用户表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| username | VARCHAR(50) | 用户名（唯一） |
| password | VARCHAR(255) | 密码（bcrypt加密） |
| role | ENUM | 角色：admin / boss / purchase / warehouse / finance / sales |
| real_name | VARCHAR(100) | 真实姓名 |
| email | VARCHAR(100) | 邮箱 |
| phone | VARCHAR(20) | 电话 |
| status | TINYINT | 状态：1正常 / 0禁用 |
| last_login | DATETIME | 最后登录时间 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

**关联**：被 `system_upload_logs` 的 `user_id` 引用。

---

### 10.3 product_master（商品库存表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| seller_sku | VARCHAR(100) | SKU编号（唯一） |
| item_name | TEXT | 商品名称 |
| price | DECIMAL(10,2) | 售价 |
| quantity | INT | **可售库存**（商品管理页面直接填写的库存） |
| pending_quantity | INT | 待处理库存 |
| image_url | TEXT | 商品图片URL |
| asin1 | VARCHAR(20) | ASIN |
| fulfillment_channel | VARCHAR(50) | 配送渠道：FBA / 自发货 |
| status | VARCHAR(50) | 状态：Active / Inactive |
| open_date | DATETIME | 上架时间 |
| listing_id | VARCHAR(100) | listing ID |
| shop_id | INT | **关联店铺ID**（物流同步时写入） |
| upload_batch | VARCHAR(50) | **上传批次**（格式：`logistics_{FBA仓库编号}` 或 `PRD_{时间戳}`） |
| upload_time | TIMESTAMP | 上传时间 |

**关联**：通过 `shop_id` 关联 `shops`；通过 `upload_batch` 前缀可区分数据来源。

**注意**：`quantity` 是"可售库存"，来自商品管理页面；物流/FBA的库存数量通过 JOIN 查询显示，不写入此字段。

---

### 10.4 amazon_orders（订单表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| order_item_id | VARCHAR(100) | 订单项ID（唯一约束） |
| dimension | ENUM | **时间维度**：1day / 3days / 7days / 14days / 30days |
| seller_sku | VARCHAR(100) | SKU |
| order_id | VARCHAR(100) | 订单号 |
| total_amount | DECIMAL(10,2) | 总金额 |
| quantity_purchased | INT | 购买数量 |
| purchase_date | DATETIME | 购买日期 |
| ship_country | VARCHAR(100) | 收货国家 |
| fulfillment_channel | VARCHAR(50) | 配送渠道 |
| shop_id | INT | **关联店铺ID** |
| upload_batch | VARCHAR(50) | 上传批次 |
| upload_time | TIMESTAMP | 上传时间 |

**联合唯一索引**：`uk_order_dimension (order_item_id, dimension)` — 同一订单在不同时间维度独立存储。

---

### 10.5 amazon_fba_inventory（FBA库存表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| seller_sku | VARCHAR(100) | SKU（唯一） |
| item_name | TEXT | 商品名称 |
| asin | VARCHAR(20) | ASIN |
| fnsku | VARCHAR(100) | FNSKU |
| available_quantity | INT | **可售库存数量** |
| unavailable_quantity | INT | 不可售库存数量 |
| inbound_quantity | INT | 入库总数 |
| inbound_working | INT | 入库处理中 |
| shipped_quantity | INT | 已发货在途 |
| received_quantity | INT | 已接收数量 |
| total_reserved_quantity | INT | 总预留数量 |
| unfulfillable_quantity | INT | 无法配送数量 |
| sales_last_7_days | INT | 近7天销量 |
| sales_last_30_days | INT | 近30天销量 |
| days_of_supply | INT | 库存可供天数 |
| days_of_supply | INT | 库存可供天数 |
| marketplace | VARCHAR(50) | 站点 |
| snapshot_date | DATE | 库存快照日期 |
| recommended_ship_in_quantity | INT | 建议补货量 |
| recommended_ship_in_date | DATE | 建议发货日期 |
| shop_id | INT | **关联店铺ID** |
| upload_batch | VARCHAR(50) | 上传批次 |
| upload_time | TIMESTAMP | 上传时间 |

**关联**：通过 `seller_sku` 与 `product_master` 关联查询。

---

### 10.6 amazon_fba_reserved（FBA预留库存表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| seller_sku | VARCHAR(100) | SKU（唯一） |
| total_reserved | INT | **总预留数量** |
| customer_order_reserved | INT | 买家订单预留 |
| transfer_reserved | INT | 调仓预留 |
| warehouse_processing_reserved | INT | 仓库处理预留 |
| item_name | TEXT | 商品名称 |
| asin | VARCHAR(20) | ASIN |
| fnsku | VARCHAR(100) | FNSKU |
| project_type | VARCHAR(100) | 项目类型 |
| upload_batch | VARCHAR(50) | 上传批次 |
| upload_time | TIMESTAMP | 上传时间 |

---

### 10.7 logistics_tracking（物流跟踪表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| shop_id | INT | **关联店铺ID** |
| fba_warehouse_number | VARCHAR(100) | **FBA入仓号**（关联商品的关键标识） |
| tracking_number | VARCHAR(200) | 物流单号 |
| destination_country | VARCHAR(100) | 目的国家 |
| ship_date | DATE | 发货日期 |
| eta | DATETIME | 预计到达时间 |
| etd | DATETIME | 发船时间 |
| forwarder_name | VARCHAR(200) | 货代名称 |
| carton_count | INT | 箱数 |
| shipping_method | VARCHAR(50) | 运输方式：海运/空运/快递 |
| price | DECIMAL(12,2) | 总价 |
| price_per_carton | DECIMAL(10,2) | 箱均价格 |
| vat_amount | DECIMAL(12,2) | VAT税费 |
| tax_rebate | DECIMAL(12,2) | 退税金额 |
| freight_cost | DECIMAL(12,2) | 运费 |
| sku_list | TEXT | **SKU列表（JSON格式）**，包含每个SKU的 code/name/quantity/unit_price |
| logistics_status | ENUM | **物流状态**：pending / shipped / in_transit / arrived / customs_cleared / delivered |
| upload_batch | VARCHAR(50) | 上传批次 |
| upload_time | TIMESTAMP | 上传时间 |

**sku_list JSON 结构示例**：
```json
[
  { "sku_code": "SKU001", "sku_name": "商品名称", "quantity": 100, "unit_price": 12.5 },
  { "sku_code": "SKU002", "sku_name": "商品名称2", "quantity": 200, "unit_price": 8.0 }
]
```

**关联**：通过 `fba_warehouse_number` 批次前缀 `logistics_{FBA仓库编号}` 关联 `product_master.upload_batch`。

---

### 10.8 amazon_business_report（业务报告表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| seller_sku | VARCHAR(100) | SKU |
| report_month | DATE | 报告月份（格式 YYYY-MM-01） |
| item_title | TEXT | 商品标题 |
| parent_asin | VARCHAR(20) | 父ASIN |
| child_asin | VARCHAR(20) | 子ASIN |
| sessions | INT | 会话数 |
| page_views | INT | 页面浏览量 |
| conversion_rate | DECIMAL(5,2) | 转化率 |
| ordered_quantity | INT | 已订购数量 |
| sales_amount | DECIMAL(10,2) | 销售额 |
| sales_amount_b2b | DECIMAL(10,2) | B2B销售额 |
| upload_batch | VARCHAR(50) | 上传批次 |
| upload_time | TIMESTAMP | 上传时间 |

**联合唯一索引**：`uk_sku_month (seller_sku, report_month)`

---

### 10.9 system_upload_logs（上传日志表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| user_id | INT | **操作人ID** |
| username | VARCHAR(50) | 操作人名称 |
| module | VARCHAR(50) | 模块：product / order / fba_inventory / fba_reserved / business / logistics |
| dimension | VARCHAR(20) | 时间维度（仅订单模块） |
| filename | VARCHAR(255) | 上传文件名 |
| total_records | INT | 总记录数 |
| success_count | INT | 成功条数 |
| update_count | INT | 更新条数 |
| fail_count | INT | 失败条数 |
| error_file | TEXT | 错误记录文件路径 |
| upload_time | TIMESTAMP | 上传时间 |

---

### 10.10 sku_inventory_logs（库存变动日志表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| sku_code | VARCHAR(100) | SKU编号 |
| module | VARCHAR(50) | **来源模块**：logistics / fba_inventory / fba_reserved |
| action | VARCHAR(50) | **操作类型**：upload / delete / update / status_change |
| before_quantity | INT | 变动前数量 |
| after_quantity | INT | 变动后数量 |
| change_amount | INT | **变动数量**（正数=增加，负数=减少） |
| remarks | TEXT | 备注说明 |
| operator_id | INT | 操作人ID |
| operator_name | VARCHAR(100) | 操作人名称 |
| reference_id | VARCHAR(100) | 关联业务ID（物流ID / 批次号） |
| created_at | TIMESTAMP | 变动时间 |

---

## 十一、模块数据流关系

### 11.1 数据流总览

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              数据来源                                      │
│                                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ 商品管理  │  │ 物流跟踪  │  │FBA库存   │  │FBA预留   │  │ 业务报告 │ │
│  │  上传    │  │  上传    │  │  上传    │  │  上传    │  │  上传    │ │
│  └───┬──────┘  └───┬──────┘  └───┬──────┘  └───┬──────┘  └───┬──────┘ │
│      │             │             │             │             │          │
│      ▼             ▼             ▼             ▼             ▼          │
│  product_master  logistics_   amazon_fba_   amazon_fba_  amazon_     │
│  (quantity)     tracking       inventory      reserved     business_    │
│                  (sku_list)   (available_   (total_       report      │
│                                 quantity)    reserved)                  │
│                     │                                                  │
│                     │  JOIN（查询时关联，不重复存储）                   │
│                     ▼                                                  │
│              product_master                                       │
│           (库存分布列: 物流+FBA库存+FBA预留)                          │
│                     │                                                  │
│                     ▼                                                  │
│         ┌───────────────────────┐                                    │
│         │  商品管理页面展示      │                                    │
│         │  可售库存 │ 库存分布  │                                    │
│         └───────────────────────┘                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

### 11.2 商品管理 → 店铺（单向）

```
商品管理上传 → product_master.shop_id = shops.id
```

商品表 `shop_id` 关联店铺，**店铺表是主数据**，商品引用店铺ID。

### 11.3 物流跟踪 → 商品主表（同步）

```
物流上传SKU
    │
    ├── 1. logistics_tracking.sku_list（JSON）存储SKU明细
    │
    └── 2. 点击"同步商品" → product_master
              │
              ├── 有同 SKU + 同批次（logistics_{FBA仓库编号）→ 覆盖更新
              ├── 有同 SKU 但不同批次（logistics_*）→ 覆盖更新
              └── 无该 SKU → 新建
              │
              └── product_master.upload_batch = `logistics_{FBA仓库编号}`
```

**关键字段**：`fba_warehouse_number` 作为批次标识，同一FBA仓库编号的物流数据覆盖更新同一批次商品。

### 11.4 商品管理页面库存展示（JOIN查询）

```
product_master（商品主档）
    │
    ├── LEFT JOIN amazon_fba_inventory（通过 seller_sku）
    │       → fba_inventory_quantity = available_quantity
    │
    ├── LEFT JOIN amazon_fba_reserved（通过 seller_sku）
    │       → fba_reserved_quantity = total_reserved
    │
    └── LEFT JOIN logistics_tracking.sku_list（通过 seller_sku，用 JSON_TABLE 解析）
            → logistics_quantity = SUM(sku_list 中该 SKU 的 quantity)
            → logistics_status = 最新一条物流记录的 status

商品管理页面展示：
    可售库存 = product_master.quantity（用户手动填写）
    库存分布 = 物流({logistics_quantity}) + FBA库存({fba_inventory_quantity}) + FBA预留({fba_reserved_quantity})
```

### 11.5 上传行为对各表的影响

| 操作 | product_master | amazon_fba_inventory | amazon_fba_reserved | logistics_tracking | sku_inventory_logs |
|------|----------------|---------------------|--------------------|--------------------|-------------------|
| 商品管理上传 | 全量覆盖（DELETE + INSERT） | 不影响 | 不影响 | 不影响 | 写日志 |
| 物流上传SKU | 新建（不存在则创建，quantity=0） | 不影响 | 不影响 | 更新 sku_list JSON | 写日志 |
| 同步商品 | 覆盖更新（按FBA仓库批次） | 不影响 | 不影响 | 不影响 | 写日志 |
| FBA库存上传 | 不影响 | 全量覆盖 | 不影响 | 不影响 | 写日志 |
| FBA预留上传 | 不影响 | 不影响 | 全量覆盖 | 不影响 | 写日志 |
| 订单上传 | 不影响 | 不影响 | 不影响 | 不影响 | 不写日志（订单不影响库存） |

### 11.6 upload_batch 批次标识规范

| 来源 | 格式示例 | 说明 |
|------|---------|------|
| 商品管理上传 | `PRD_{时间戳}_{随机数}` | 商品模块 |
| 物流上传SKU | `logistics_{FBA仓库编号}` | 物流模块，同一批次可多次同步 |
| FBA库存上传 | `FBA_INV_{时间戳}_{随机数}` | FBA库存模块 |
| FBA预留上传 | `FBA_RSV_{时间戳}_{随机数}` | FBA预留模块 |

### 11.7 库存数据的"可售"与"在途"区分

| 字段/来源 | 含义 | 存储位置 |
|---------|------|---------|
| `product_master.quantity` | **可售库存** | product_master |
| `amazon_fba_inventory.available_quantity` | FBA **可售**数量 | amazon_fba_inventory |
| `logistics_tracking.sku_list[].quantity` | 物流在**途**数量 | logistics_tracking |
| `amazon_fba_reserved.total_reserved` | FBA **预留**数量 | amazon_fba_reserved |

**原则**：物流数量不等于可售库存，因为货还在途中未入FBA仓。只有FBA仓库确认收货后，数量才转入FBA可售库存。
