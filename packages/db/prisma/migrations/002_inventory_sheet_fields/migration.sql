ALTER TABLE `inventory`
  ADD COLUMN `currency` VARCHAR(8) NULL,
  ADD COLUMN `binding_type` VARCHAR(80) NULL,
  ADD COLUMN `subject` VARCHAR(255) NULL,
  ADD COLUMN `category` VARCHAR(120) NULL,
  ADD COLUMN `language` VARCHAR(80) NULL,
  ADD COLUMN `published_year` INT NULL,
  ADD COLUMN `product_code` VARCHAR(80) NULL;

CREATE INDEX `inventory_author_idx` ON `inventory`(`author`);
CREATE INDEX `inventory_product_code_idx` ON `inventory`(`product_code`);
