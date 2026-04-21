-- 更新 amazon_business_report 表结构，添加B2B相关字段
-- 注意：需要先备份数据，然后删除原表重新创建

-- 1. 备份现有数据
CREATE TABLE IF NOT EXISTS amazon_business_report_backup AS SELECT * FROM amazon_business_report;

-- 2. 删除原表
DROP TABLE IF EXISTS amazon_business_report;

-- 3. 创建新表结构
CREATE TABLE IF NOT EXISTS `amazon_business_report` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `seller_sku` VARCHAR(100) NOT NULL,
  `report_month` DATE NOT NULL COMMENT '报告月份，格式 YYYY-MM-01',
  `item_title` TEXT,
  `parent_asin` VARCHAR(20),
  `child_asin` VARCHAR(20),
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
  `upload_batch` VARCHAR(50),
  `upload_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_sku_month` (`seller_sku`, `report_month`),
  INDEX `idx_sku` (`seller_sku`),
  INDEX `idx_month` (`report_month`),
  INDEX `idx_parent_asin` (`parent_asin`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. 导入备份数据（仅原有字段）
INSERT INTO amazon_business_report (seller_sku, report_month, item_title, parent_asin, child_asin, sessions, page_views, conversion_rate, ordered_quantity, sales_amount, upload_batch, upload_time)
SELECT 
  seller_sku, 
  report_month, 
  item_title, 
  parent_asin, 
  child_asin, 
  sessions, 
  page_views, 
  conversion_rate, 
  ordered_quantity, 
  sales_amount, 
  upload_batch, 
  upload_time
FROM amazon_business_report_backup;

-- 5. 清理备份表
DROP TABLE IF EXISTS amazon_business_report_backup;

-- 6. 验证表结构
SELECT 
  COLUMN_NAME, 
  DATA_TYPE, 
  IS_NULLABLE, 
  COLUMN_DEFAULT, 
  COLUMN_KEY, 
  EXTRA,
  COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'amazon_business_report'
ORDER BY ORDINAL_POSITION;