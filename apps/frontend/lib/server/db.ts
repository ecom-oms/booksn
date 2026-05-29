import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; dbReady?: boolean };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export async function ensureDatabase() {
  if (globalForPrisma.dbReady) return;

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS publishers (
      id INT NOT NULL AUTO_INCREMENT,
      name VARCHAR(191) NOT NULL,
      email VARCHAR(191) NOT NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      UNIQUE INDEX publishers_email_key(email),
      INDEX publishers_email_idx(email),
      PRIMARY KEY (id)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS uploads (
      id INT NOT NULL AUTO_INCREMENT,
      publisher_id INT NOT NULL,
      filename VARCHAR(191) NOT NULL,
      total_rows INT NOT NULL DEFAULT 0,
      success_rows INT NOT NULL DEFAULT 0,
      failed_rows INT NOT NULL DEFAULT 0,
      status ENUM('PROCESSING','SUCCESS','PARTIAL','FAILED') NOT NULL DEFAULT 'PROCESSING',
      uploaded_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      error_message TEXT NULL,
      INDEX uploads_publisher_id_idx(publisher_id),
      INDEX uploads_status_idx(status),
      INDEX uploads_uploaded_at_idx(uploaded_at),
      PRIMARY KEY (id)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS inventory (
      id BIGINT NOT NULL AUTO_INCREMENT,
      isbn VARCHAR(32) NOT NULL,
      title VARCHAR(512) NULL,
      author VARCHAR(255) NULL,
      stock INT NOT NULL DEFAULT 0,
      price DECIMAL(10,2) NULL,
      currency VARCHAR(8) NULL,
      binding_type VARCHAR(80) NULL,
      subject VARCHAR(255) NULL,
      category VARCHAR(120) NULL,
      language VARCHAR(80) NULL,
      published_year INT NULL,
      product_code VARCHAR(80) NULL,
      attributes JSON NULL,
      publisher_id INT NOT NULL,
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      INDEX inventory_isbn_idx(isbn),
      INDEX inventory_title_idx(title(191)),
      INDEX inventory_author_idx(author),
      INDEX inventory_product_code_idx(product_code),
      INDEX inventory_publisher_id_idx(publisher_id),
      UNIQUE INDEX inventory_publisher_id_isbn_key(publisher_id, isbn),
      PRIMARY KEY (id)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS failed_import_rows (
      id BIGINT NOT NULL AUTO_INCREMENT,
      upload_id INT NOT NULL,
      row_number INT NOT NULL,
      reason VARCHAR(512) NOT NULL,
      raw_data JSON NOT NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      INDEX failed_import_rows_upload_id_idx(upload_id),
      PRIMARY KEY (id)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  await addColumnIfMissing("inventory", "attributes", "JSON NULL");
  globalForPrisma.dbReady = true;
}

async function addColumnIfMissing(table: string, column: string, definition: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*) as count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    table,
    column,
  );
  if (Number(rows[0]?.count ?? 0) === 0) {
    await prisma.$executeRawUnsafe(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

