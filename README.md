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
