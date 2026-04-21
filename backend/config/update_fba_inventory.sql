-- 更新 FBA 库存表结构以支持更详细的数据
ALTER TABLE `amazon_fba_inventory` 
ADD COLUMN `snapshot_date` DATE DEFAULT NULL AFTER `id`,
ADD COLUMN `condition_type` VARCHAR(50) DEFAULT NULL AFTER `asin`,
ADD COLUMN `inbound_working` INT DEFAULT 0 AFTER `inbound_quantity`,
ADD COLUMN `total_reserved_quantity` INT DEFAULT 0 AFTER `received_quantity`,
ADD COLUMN `unfulfillable_quantity` INT DEFAULT 0 AFTER `total_reserved_quantity`,
ADD COLUMN `fba_minimum_inventory_level` DECIMAL(10, 2) DEFAULT NULL AFTER `marketplace`,
ADD COLUMN `fba_inventory_level_health_status` VARCHAR(100) DEFAULT NULL AFTER `fba_minimum_inventory_level`,
ADD COLUMN `recommended_ship_in_quantity` INT DEFAULT NULL AFTER `fba_inventory_level_health_status`,
ADD COLUMN `recommended_ship_in_date` DATE DEFAULT NULL AFTER `recommended_ship_in_quantity`,
ADD COLUMN `inventory_supply_at_fba` INT DEFAULT NULL AFTER `recommended_ship_in_date`,
ADD COLUMN `reserved_fc_transfer` INT DEFAULT 0 AFTER `inventory_supply_at_fba`,
ADD COLUMN `reserved_fc_processing` INT DEFAULT 0 AFTER `reserved_fc_transfer`,
ADD COLUMN `reserved_customer_order` INT DEFAULT 0 AFTER `reserved_fc_processing`;

-- 添加单价和售出金额字段
ALTER TABLE `amazon_fba_inventory`
ADD COLUMN `your_price` DECIMAL(10, 2) DEFAULT NULL COMMENT '单价',
ADD COLUMN `sales_amount` DECIMAL(15, 2) DEFAULT 0 COMMENT '售出金额(30天)';

-- 确保 seller_sku 是唯一的 (如果已经是 UNIQUE 则可能报错，忽略它)
-- ALTER TABLE `amazon_fba_inventory` DROP INDEX `seller_sku`;
-- ALTER TABLE `amazon_fba_inventory` ADD UNIQUE INDEX `uk_seller_sku` (`seller_sku`);
