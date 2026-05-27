CREATE TABLE `admin_users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(191) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `admin_users_email_key`(`email`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `publishers` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `publishers_email_key`(`email`),
  INDEX `publishers_email_idx`(`email`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `uploads` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `publisher_id` INT NOT NULL,
  `filename` VARCHAR(191) NOT NULL,
  `total_rows` INT NOT NULL DEFAULT 0,
  `success_rows` INT NOT NULL DEFAULT 0,
  `failed_rows` INT NOT NULL DEFAULT 0,
  `status` ENUM('PROCESSING', 'SUCCESS', 'PARTIAL', 'FAILED') NOT NULL DEFAULT 'PROCESSING',
  `uploaded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `error_message` TEXT NULL,
  INDEX `uploads_publisher_id_idx`(`publisher_id`),
  INDEX `uploads_status_idx`(`status`),
  INDEX `uploads_uploaded_at_idx`(`uploaded_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `inventory` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `isbn` VARCHAR(32) NOT NULL,
  `title` VARCHAR(512) NULL,
  `author` VARCHAR(255) NULL,
  `stock` INT NOT NULL DEFAULT 0,
  `price` DECIMAL(10, 2) NULL,
  `publisher_id` INT NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  INDEX `inventory_isbn_idx`(`isbn`),
  INDEX `inventory_title_idx`(`title`(191)),
  INDEX `inventory_publisher_id_idx`(`publisher_id`),
  UNIQUE INDEX `inventory_publisher_id_isbn_key`(`publisher_id`, `isbn`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `failed_import_rows` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `upload_id` INT NOT NULL,
  `row_number` INT NOT NULL,
  `reason` VARCHAR(512) NOT NULL,
  `raw_data` JSON NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `failed_import_rows_upload_id_idx`(`upload_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `uploads` ADD CONSTRAINT `uploads_publisher_id_fkey` FOREIGN KEY (`publisher_id`) REFERENCES `publishers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `inventory` ADD CONSTRAINT `inventory_publisher_id_fkey` FOREIGN KEY (`publisher_id`) REFERENCES `publishers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `failed_import_rows` ADD CONSTRAINT `failed_import_rows_upload_id_fkey` FOREIGN KEY (`upload_id`) REFERENCES `uploads`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
