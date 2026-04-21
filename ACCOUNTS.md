# 亚马逊跨境电商ERP系统 - 账号管理文档

## 📋 概述
本文档记录了亚马逊跨境电商ERP系统的账号管理体系，包含：
1. **生产环境账号管理** - 公司实际员工账号配置指南
2. **开发测试账号** - 仅用于开发和测试环境的预置账号

> **⚠️ 重要安全警告**: 
> - **生产环境必须删除所有测试账号**
> - **必须修改默认密码和JWT密钥**
> - **根据实际业务需求配置角色权限**

**文档最后更新**: 2026-04-10  
**系统状态**: 支持多角色精细化权限管理  

---

## 🏢 生产环境账号配置

### **创建公司员工账号**
生产环境下，请为每位员工创建独立的账号，并分配相应的角色权限。

```sql
-- 示例：创建公司实际员工账号
INSERT INTO system_users (username, password, real_name, role, email, department, status, created_at)
VALUES 
  ('zhangsan', '$2b$10$加密后的密码', '张三', 'purchase', 'zhangsan@company.com', '采购部', 'active', NOW()),
  ('lisi', '$2b$10$加密后的密码', '李四', 'warehouse', 'lisi@company.com', '仓储部', 'active', NOW()),
  ('wangwu', '$2b$10$加密后的密码', '王五', 'finance', 'wangwu@company.com', '财务部', 'active', NOW()),
  ('company_admin', '$2b$10$加密后的密码', '系统管理员', 'admin', 'admin@company.com', 'IT部', 'active', NOW());
```

### **密码安全要求**
1. 密码长度至少12位
2. 包含大小写字母、数字和特殊字符
3. 定期更换密码（建议90天）
4. 禁止使用简单密码或默认密码

### **角色权限分配原则**
1. **最小权限原则**: 只授予完成工作所需的最小权限
2. **职责分离**: 关键业务流程需要多人协作完成
3. **定期审计**: 每季度检查一次权限分配是否合理
4. **离职清理**: 员工离职后立即禁用账号

### **账号生命周期管理**
1. **入职**: 创建账号，分配初始权限
2. **转岗**: 调整角色权限
3. **休假**: 临时禁用账号（如产假、长期病假）
4. **离职**: 永久禁用账号，归档操作记录

---

## 🧪 开发测试账号信息

> **注意**: 以下账号**仅用于开发和测试环境**，生产环境必须删除或禁用。

### **所有测试账号清单**

| 用户名 | 密码 | 角色 | 权限描述 | 邮箱 | 状态 |
|--------|------|------|----------|------|------|
| **admin** | `admin123` | admin | 系统管理员 - 所有权限 | null | 活动 |
| **boss** | `boss123` | boss | 公司老板 - 查看所有数据，部分管理权限 | boss@example.com | 活动 |
| **purchase** | `purchase123` | purchase | 采购经理 - 产品管理、采购相关 | purchase@example.com | 活动 |
| **warehouse** | `warehouse123` | warehouse | 仓库管理员 - 库存管理、出入库 | warehouse@example.com | 活动 |
| **finance** | `finance123` | finance | 财务专员 - 财务数据、报表 | finance@example.com | 活动 |
| **sales** | `sales123` | sales | 销售代表 - 订单管理、客户管理 | sales@example.com | 活动 |
| **viewer** | `viewer123` | sales | 只读查看员 - 仅查看权限 | viewer@example.com | 活动 |

> **注意**: 所有测试账号密码格式均为：**用户名 + 123**

| 用户名 | 密码 | 角色 | 权限描述 | 邮箱 | 状态 |
|--------|------|------|----------|------|------|
| **admin** | `admin123` | admin | 系统管理员 - 所有权限 | null | 活动 |
| **boss** | `boss123` | boss | 公司老板 - 查看所有数据，部分管理权限 | boss@example.com | 活动 |
| **purchase** | `purchase123` | purchase | 采购经理 - 产品管理、采购相关 | purchase@example.com | 活动 |
| **warehouse** | `warehouse123` | warehouse | 仓库管理员 - 库存管理、出入库 | warehouse@example.com | 活动 |
| **finance** | `finance123` | finance | 财务专员 - 财务数据、报表 | finance@example.com | 活动 |
| **sales** | `sales123` | sales | 销售代表 - 订单管理、客户管理 | sales@example.com | 活动 |
| **viewer** | `viewer123` | sales | 只读查看员 - 仅查看权限 | viewer@example.com | 活动 |

> **注意**: 所有测试账号密码格式均为：**用户名 + 123**

---

## 🔐 登录与认证

### 1. 系统登录页面
- **访问地址**: `http://您的域名或IP:3000/login.html`
- **生产环境特性**:
  - 专业企业级登录界面
  - 系统功能介绍展示
  - 安全的密码输入保护
  - 多语言支持（如需）
  - 企业品牌标识展示

### 2. API认证接口
```http
POST http://您的域名或IP:3000/api/auth/login
Content-Type: application/json

{
  "username": "员工用户名",
  "password": "员工密码"
}
```

### 3. 认证响应
**成功响应** (HTTP 200):
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "zhangsan",
      "role": "purchase",
      "realName": "张三",
      "email": "zhangsan@company.com",
      "department": "采购部"
    }
  }
}
```

**失败响应** (HTTP 401):
```json
{
  "code": 401,
  "message": "用户名或密码错误",
  "data": null
}
```

### 4. Token使用
- **存储**: Token应安全存储在客户端（建议内存存储，不持久化）
- **传输**: 在请求头中添加 `Authorization: Bearer {token}`
- **有效期**: 默认24小时，过期后需要重新登录
- **安全**: Token包含用户角色信息，用于接口权限验证

**响应示例**:
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "admin",
      "role": "admin",
      "realName": "系统管理员"
    }
  }
}
```

### 3. 健康检查端点
- `GET http://localhost:3000/health` - 系统健康状态
- `GET http://localhost:3000/` - 根目录访问测试

---

## 🎯 角色权限详解

### admin (系统管理员)
- **权限级别**: 超级管理员
- **可访问模块**: 所有模块
- **特殊权限**:
  - 文件上传功能
  - 用户管理
  - 系统设置
  - 操作日志查看
  - 数据备份与恢复

### boss (公司老板)
- **权限级别**: 管理层
- **可访问模块**: 所有数据查看、部分管理
- **特殊权限**:
  - 查看所有数据报表
  - 审批重要操作
  - 系统设置查看
  - 财务报表分析

### purchase (采购经理)
- **权限级别**: 职能经理
- **可访问模块**: 产品管理、采购相关
- **核心功能**:
  - 产品CRUD操作
  - 批量导入/导出产品
  - 采购订单管理
  - 供应商管理
  - 产品成本分析

### warehouse (仓库管理员)
- **权限级别**: 职能经理
- **可访问模块**: 库存管理相关
- **核心功能**:
  - FBA库存查看与管理
  - 出入库记录
  - 库存预警设置
  - 仓库管理
  - 库存盘点

### finance (财务专员)
- **权限级别**: 职能专员
- **可访问模块**: 财务数据、报表
- **核心功能**:
  - 销售数据分析
  - 财务报表生成
  - 成本利润计算
  - 账款管理
  - 税务报表

### sales (销售代表)
- **权限级别**: 业务专员
- **可访问模块**: 订单管理、客户管理
- **核心功能**:
  - 订单处理（5个时间维度）
  - 客户信息管理
  - 销售数据分析
  - 客户服务跟进
  - 销售业绩跟踪

### viewer (只读查看员)
- **权限级别**: 只读权限
- **可访问模块**: 所有模块（仅查看）
- **限制**:
  - 不能进行任何编辑、删除操作
  - 不能上传文件
  - 不能修改系统设置
  - 适合审计、监控用途

---

## 🔧 账号管理与维护

### 数据库中的账号信息
所有账号存储在`system_users`表中，使用bcrypt加密存储密码：
```sql
SELECT username, role, email, status FROM system_users;
```

### 添加新账号的方法
1. **使用脚本添加**:
   ```bash
   cd backend
   node add_test_users.js
   ```

2. **通过API添加** (需要admin权限):
   ```http
   POST http://localhost:3000/api/users
   Content-Type: application/json
   Authorization: Bearer {token}
   
   {
     "username": "newuser",
     "password": "password123",
     "role": "sales",
     "email": "newuser@example.com"
   }
   ```

3. **数据库直接插入**:
   ```sql
   INSERT INTO system_users (username, password, role, email) 
   VALUES ('newuser', 'bcrypt_hashed_password', 'sales', 'newuser@example.com');
   ```

### 密码重置
1. **管理员重置**:
   ```bash
   cd backend
   node reset_password.js --username=admin --newpassword=newpass123
   ```

2. **数据库重置**:
   ```sql
   UPDATE system_users 
   SET password = 'bcrypt_hashed_new_password'
   WHERE username = 'admin';
   ```

---

## 🎮 测试建议与最佳实践

### 推荐测试流程
1. **首次测试**: 使用`admin/admin123`测试所有功能模块
2. **权限验证**: 使用`viewer/viewer123`验证只读权限限制
3. **角色测试**: 分别使用各职能账号测试对应模块功能
4. **集成测试**: 测试跨模块业务流程

### 安全注意事项
- **生产环境**: 必须修改所有默认密码
- **JWT密钥**: 生产环境必须修改`JWT_SECRET`
- **数据库密码**: 生产环境使用强密码
- **访问控制**: 根据实际业务需求调整角色权限

### 故障排除
- **登录失败**: 检查数据库连接，确认账号状态为'active'
- **权限不足**: 确认使用正确角色的账号
- **Token过期**: JWT Token有效期为24小时，需要重新登录
- **服务未启动**: 确认后端服务运行在`http://localhost:3000`

---

## 📁 相关文件
- `backend/add_test_users.js` - 测试账号添加脚本
- `backend/create_admin.js` - 管理员账号创建脚本
- `backend/public/login.html` - 登录页面
- `backend/models/UserModel.js` - 用户数据模型
- `backend/controllers/auth.controller.js` - 认证控制器

---

## 📞 支持与联系
如有账号相关问题，请联系系统管理员或开发团队。

**文档维护者**: 系统开发团队  
**最后验证时间**: 2026-04-10  
**验证状态**: ✅ 所有账号已验证可用