-- MySQL 数据库表结构
-- 亚马逊跨境电商 ERP 系统

-- 0. 店铺管理表
CREATE TABLE IF NOT EXISTS `shops` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `shop_id` VARCHAR(50) NOT NULL UNIQUE COMMENT '店铺标识ID（自动生成，可修改）',
  `shop_name` VARCHAR(100) NOT NULL COMMENT '店铺名称',
  `shop_code` VARCHAR(50) NOT NULL UNIQUE COMMENT '店铺代码',
  `shop_type` ENUM('Amazon', 'eBay', 'Walmart', 'Other') DEFAULT 'Amazon' COMMENT '平台类型',
  `region` VARCHAR(100) COMMENT '区域/国家',
  `marketplace` VARCHAR(100) COMMENT '市场/站点',
  `seller_id` VARCHAR(100) COMMENT '卖家ID',
  `status` ENUM('active', 'inactive') DEFAULT 'active' COMMENT '状态',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_shop_id` (`shop_id`),
  INDEX `idx_shop_code` (`shop_code`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1. 系统用户表
CREATE TABLE IF NOT EXISTS `system_users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'boss', 'purchase', 'warehouse', 'finance', 'sales') NOT NULL DEFAULT 'sales',
  `real_name` VARCHAR(100),
  `email` VARCHAR(100),
  `phone` VARCHAR(20),
  `status` TINYINT DEFAULT 1 COMMENT '1: 正常, 0: 禁用',
  `last_login` DATETIME,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. 商品库存表（所有商品报告）
CREATE TABLE IF NOT EXISTS `amazon_products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `seller_sku` VARCHAR(100) NOT NULL UNIQUE,
  `item_name` TEXT,
  `price` DECIMAL(10, 2),
  `quantity` INT DEFAULT 0 COMMENT '可售库存',
  `pending_quantity` INT DEFAULT 0 COMMENT '待处理库存',
  `image_url` TEXT,
  `asin1` VARCHAR(20),
  `fulfillment_channel` VARCHAR(50) COMMENT 'FBA / 自发货',
  `status` VARCHAR(50) COMMENT 'Active/Inactive',
  `open_date` DATETIME,
  `listing_id` VARCHAR(100),
  `shop_id` INT COMMENT '关联店铺ID',
  `upload_batch` VARCHAR(50) COMMENT '上传批次',
  `upload_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_sku` (`seller_sku`),
  INDEX `idx_asin` (`asin1`),
  INDEX `idx_status` (`status`),
  INDEX `idx_channel` (`fulfillment_channel`),
  INDEX `idx_shop` (`shop_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. 订单表（5个时间维度独立存储）
CREATE TABLE IF NOT EXISTS `amazon_orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_item_id` VARCHAR(100) NOT NULL,
  `dimension` ENUM('1day', '3days', '7days', '14days', '30days') NOT NULL COMMENT '时间维度',
  `seller_sku` VARCHAR(100),
  `item_name` TEXT,
  `order_id` VARCHAR(100),
  `merchant_order_id` VARCHAR(100) COMMENT '商家订单号',
  `order_status` VARCHAR(50) COMMENT '订单状态',
  `purchase_date` DATETIME,
  `last_updated_date` DATETIME COMMENT '最后更新时间',
  `fulfillment_channel` VARCHAR(50) COMMENT '配送渠道',
  `ship_service_level` VARCHAR(50) COMMENT '运输服务级别',
  `asin` VARCHAR(20) COMMENT 'ASIN',
  `item_status` VARCHAR(50) COMMENT '项目状态',
  `quantity_purchased` INT,
  `item_price` DECIMAL(10, 2),
  `item_tax` DECIMAL(10, 2) DEFAULT 0 COMMENT '商品税额',
  `shipping_price` DECIMAL(10, 2) DEFAULT 0 COMMENT '运费',
  `shipping_tax` DECIMAL(10, 2) DEFAULT 0 COMMENT '运费税额',
  `gift_wrap_price` DECIMAL(10, 2) DEFAULT 0 COMMENT '礼品包装费',
  `gift_wrap_tax` DECIMAL(10, 2) DEFAULT 0 COMMENT '礼品包装税额',
  `item_promotion_discount` DECIMAL(10, 2) DEFAULT 0 COMMENT '商品促销折扣',
  `ship_promotion_discount` DECIMAL(10, 2) DEFAULT 0 COMMENT '运费促销折扣',
  `total_amount` DECIMAL(10, 2) COMMENT '总金额',
  `currency` VARCHAR(10),
  `ship_city` VARCHAR(100) COMMENT '城市',
  `ship_state` VARCHAR(100) COMMENT '州/省',
  `ship_postal_code` VARCHAR(50) COMMENT '邮编',
  `ship_country` VARCHAR(100),
  `marketplace` VARCHAR(100) COMMENT '站点',
  `promotion_ids` TEXT COMMENT '促销ID',
  `is_business_order` VARCHAR(10) DEFAULT 'false' COMMENT '是否为企业订单',
  `purchase_order_number` VARCHAR(100) COMMENT '采购订单号',
  `price_designation` VARCHAR(50) COMMENT '价格指定',
  `buyer_name` VARCHAR(255),
  `buyer_phone` VARCHAR(50),
  `image_url` TEXT,
  `shop_id` INT COMMENT '关联店铺ID',
  `upload_batch` VARCHAR(50),
  `upload_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_order_dimension` (`order_item_id`, `dimension`),
  INDEX `idx_sku` (`seller_sku`),
  INDEX `idx_order_id` (`order_id`),
  INDEX `idx_dimension` (`dimension`),
  INDEX `idx_purchase_date` (`purchase_date`),
  INDEX `idx_shop` (`shop_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. FBA 库存表
CREATE TABLE IF NOT EXISTS `amazon_fba_inventory` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `snapshot_date` DATE DEFAULT NULL COMMENT '库存快照日期',
  `seller_sku` VARCHAR(100) NOT NULL UNIQUE COMMENT '卖家SKU',
  `item_name` TEXT COMMENT '商品名称/标题',
  `asin` VARCHAR(20) COMMENT 'ASIN',
  `condition_type` VARCHAR(50) DEFAULT NULL COMMENT '商品状况 (如 New)',
  `fnsku` VARCHAR(100) COMMENT 'FNSKU',
  `available_quantity` INT DEFAULT 0 COMMENT '可售库存数量',
  `unavailable_quantity` INT DEFAULT 0 COMMENT '不可售库存数量',
  `inbound_quantity` INT DEFAULT 0 COMMENT '入库总数',
  `inbound_working` INT DEFAULT 0 COMMENT '入库处理中',
  `shipped_quantity` INT DEFAULT 0 COMMENT '已发货在途',
  `received_quantity` INT DEFAULT 0 COMMENT '已接收数量',
  `total_reserved_quantity` INT DEFAULT 0 COMMENT '总预留数量',
  `unfulfillable_quantity` INT DEFAULT 0 COMMENT '无法配送数量',
  `sales_last_7_days` INT DEFAULT 0 COMMENT '近 7 天销量',
  `sales_last_30_days` INT DEFAULT 0 COMMENT '近 30 天销量',
  `days_of_supply` INT COMMENT '库存可供天数',
  `marketplace` VARCHAR(50) COMMENT '站点 (如 US)',
  `fba_minimum_inventory_level` DECIMAL(10, 2) DEFAULT NULL COMMENT 'FBA最低库存水平',
  `fba_inventory_level_health_status` VARCHAR(100) DEFAULT NULL COMMENT 'FBA库存健康状态',
  `recommended_ship_in_quantity` INT DEFAULT NULL COMMENT '建议补货量',
  `recommended_ship_in_date` DATE DEFAULT NULL COMMENT '建议发货日期',
  `inventory_supply_at_fba` INT DEFAULT NULL COMMENT 'FBA现有库存供应量',
  `reserved_fc_transfer` INT DEFAULT 0 COMMENT '预留-调仓中',
  `reserved_fc_processing` INT DEFAULT 0 COMMENT '预留-仓库处理中',
  `reserved_customer_order` INT DEFAULT 0 COMMENT '预留-买家订单',
  `shop_id` INT COMMENT '关联店铺ID',
  `amazon_suggestion` TEXT COMMENT '亚马逊建议',
  `suggested_replenishment` INT COMMENT '建议补货数量',
  `upload_batch` VARCHAR(50) COMMENT '上传批次号',
  `upload_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '上传时间',
  INDEX `idx_sku` (`seller_sku`),
  INDEX `idx_asin` (`asin`),
  INDEX `idx_marketplace` (`marketplace`),
  INDEX `idx_shop` (`shop_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. FBA 预留库存表
CREATE TABLE IF NOT EXISTS `amazon_fba_reserved` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `seller_sku` VARCHAR(100) NOT NULL UNIQUE,
  `item_name` TEXT,
  `asin` VARCHAR(20),
  `fnsku` VARCHAR(100),
  `total_reserved` INT DEFAULT 0 COMMENT '总预留数量',
  `customer_order_reserved` INT DEFAULT 0 COMMENT '买家订单预留',
  `transfer_reserved` INT DEFAULT 0 COMMENT '调仓预留',
  `warehouse_processing_reserved` INT DEFAULT 0 COMMENT '仓库处理预留',
  `project_type` VARCHAR(100) COMMENT '项目类型',
  `upload_batch` VARCHAR(50),
  `upload_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_sku` (`seller_sku`),
  INDEX `idx_asin` (`asin`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. 亚马逊业务报告表
CREATE TABLE IF NOT EXISTS `amazon_business_report` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `seller_sku` VARCHAR(100) NOT NULL COMMENT '店铺代码（SKU）',
  `report_month` DATE NOT NULL COMMENT '报告月份，格式 YYYY-MM-01',
  `item_title` TEXT COMMENT '商品标题',
  `parent_asin` VARCHAR(20) COMMENT '父ASIN',
  `child_asin` VARCHAR(20) COMMENT '子ASIN',
  `sessions` INT DEFAULT 0 COMMENT '会话数 - 总计',
  `sessions_b2b` INT DEFAULT 0 COMMENT '会话 - 总计 - B2B',
  `conversion_rate` DECIMAL(5, 2) COMMENT '转化率 - 总计',
  `session_percentage_b2b` DECIMAL(5, 2) COMMENT '会话百分比 - 总计 - B2B',
  `page_views` INT DEFAULT 0 COMMENT '页面浏览量 - 总计',
  `page_views_b2b` INT DEFAULT 0 COMMENT '页面浏览量 - 总计 - B2B',
  `page_views_percentage` DECIMAL(5, 2) COMMENT '页面浏览量百分比 - 总计',
  `page_views_percentage_b2b` DECIMAL(5, 2) COMMENT '页面浏览量百分比 - 总计 - B2B',
  `recommended_offer_percentage` DECIMAL(5, 2) COMMENT '推荐报价（推荐报价展示位）百分比',
  `recommended_offer_percentage_b2b` DECIMAL(5, 2) COMMENT '推荐报价（推荐报价展示位）百分比 - B2B',
  `ordered_quantity` INT DEFAULT 0 COMMENT '已订购商品数量',
  `ordered_quantity_b2b` INT DEFAULT 0 COMMENT '已订购商品数量 - B2B',
  `product_session_percentage` DECIMAL(5, 2) COMMENT '商品会话百分比',
  `product_session_percentage_b2b` DECIMAL(5, 2) COMMENT '商品会话百分比 - B2B',
  `sales_amount` DECIMAL(10, 2) COMMENT '已订购商品销售额',
  `sales_amount_b2b` DECIMAL(10, 2) COMMENT '已订购商品销售额 - B2B',
  `total_order_items` INT DEFAULT 0 COMMENT '订单商品总数',
  `total_order_items_b2b` INT DEFAULT 0 COMMENT '订单商品总数 - B2B',
  `upload_batch` VARCHAR(50) COMMENT '上传批次标识（用于追踪同一批上传的数据）',
  `upload_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_sku_month` (`seller_sku`, `report_month`),
  INDEX `idx_sku` (`seller_sku`),
  INDEX `idx_month` (`report_month`),
  INDEX `idx_parent_asin` (`parent_asin`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. 上传日志表
CREATE TABLE IF NOT EXISTS `system_upload_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `username` VARCHAR(50),
  `module` VARCHAR(50) COMMENT '模块名称: product/order/fba_inventory/fba_reserved/business',
  `dimension` VARCHAR(20) COMMENT '时间维度（仅订单模块）',
  `filename` VARCHAR(255),
  `total_records` INT DEFAULT 0,
  `success_count` INT DEFAULT 0,
  `update_count` INT DEFAULT 0,
  `fail_count` INT DEFAULT 0,
  `error_file` TEXT COMMENT '错误记录文件路径',
  `upload_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_user` (`user_id`),
  INDEX `idx_module` (`module`),
  INDEX `idx_time` (`upload_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. 操作日志表（可选）
CREATE TABLE IF NOT EXISTS `system_operation_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT,
  `username` VARCHAR(50),
  `action` VARCHAR(100),
  `module` VARCHAR(50),
  `details` TEXT,
  `ip_address` VARCHAR(45),
  `user_agent` TEXT,
  `operation_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_user` (`user_id`),
  INDEX `idx_action` (`action`),
  INDEX `idx_time` (`operation_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. SKU 库存变动日志表
CREATE TABLE IF NOT EXISTS `sku_inventory_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `sku_code` VARCHAR(100) NOT NULL COMMENT 'SKU编号',
  `module` VARCHAR(50) NOT NULL COMMENT '来源模块: logistics/fba_inventory/fba_reserved',
  `action` VARCHAR(50) NOT NULL COMMENT '操作类型: upload/delete/update/status_change',
  `before_quantity` INT DEFAULT 0 COMMENT '变动前数量',
  `after_quantity` INT DEFAULT 0 COMMENT '变动后数量',
  `change_amount` INT DEFAULT 0 COMMENT '变动数量（正数为增加，负数为减少）',
  `remarks` TEXT COMMENT '备注/说明',
  `operator_id` INT COMMENT '操作人ID',
  `operator_name` VARCHAR(100) COMMENT '操作人名称',
  `reference_id` VARCHAR(100) COMMENT '关联业务ID（如物流记录ID）',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_sku_code` (`sku_code`),
  INDEX `idx_module` (`module`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入初始管理员用户（admin/admin123）
INSERT INTO `system_users` (`username`, `password`, `role`, `real_name`, `status`) 
VALUES ('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrqK.3HKmK5vZR7zUOLN2t6V8Q2YJXW', 'admin', '系统管理员', 1)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

-- 密码为 admin123 的 bcrypt 哈希值