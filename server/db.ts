// ============================================================
// server/db.ts  —  MySQL2 Database Layer
// Replaces the JSON-file in-memory database with real MySQL
// Host: xiadot.com | DB: chit_db | User: chit_db
// ============================================================

import 'dotenv/config';
import mysql from 'mysql2/promise';
import crypto from 'crypto';
import type {
  User,
  CompanySettings,
  Customer,
  ChitGroup,
  Membership,
  Installment,
  Payment,
  Auction,
  DividendDistribution,
  PrizePayment,
  Expense,
  NotificationItem,
  AuditLog,
  PaymentReceipt,
  DashboardStats,
  Route,
  DailyHandover,
  KuzhukkalDraw,
  KuzhukkalContext
} from '../fund/src/types';

// ---- Helpers ----
export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);
const today = () => new Date().toISOString().split('T')[0];

// ---- Pool ----
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'xiadot.com',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'chit_db',
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : (process.env.DB_PASS || 'chit_software'),
  database: process.env.DB_NAME || 'chit_db',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  timezone: '+00:00',
});

async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const [rows] = await pool.execute(sql, params);
  return rows as T[];
}

async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

async function execute(sql: string, params: any[] = []): Promise<mysql.ResultSetHeader> {
  const [result] = await pool.execute(sql, params);
  return result as mysql.ResultSetHeader;
}

// Auto-create database tables and seed default credentials
export async function initDb() {
  try {
    // 1. Users table
    await execute(`
      CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`username\` VARCHAR(50) NOT NULL UNIQUE,
        \`password_hash\` VARCHAR(255) NOT NULL,
        \`full_name\` VARCHAR(100) NOT NULL,
        \`email\` VARCHAR(100) NOT NULL UNIQUE,
        \`role\` ENUM('admin', 'staff', 'agent') NOT NULL DEFAULT 'staff',
        \`status\` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
        \`last_login\` DATETIME NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 2. Company Settings table
    await execute(`
      CREATE TABLE IF NOT EXISTS \`company_settings\` (
        \`id\` INT PRIMARY KEY DEFAULT 1,
        \`company_name\` VARCHAR(150) NOT NULL,
        \`address\` TEXT NOT NULL,
        \`phone\` VARCHAR(20) NOT NULL,
        \`email\` VARCHAR(100) NOT NULL,
        \`currency_symbol\` VARCHAR(5) NOT NULL DEFAULT '₹',
        \`financial_year\` VARCHAR(20) NOT NULL DEFAULT '2025-2026',
        \`default_commission_percent\` DECIMAL(5, 2) NOT NULL DEFAULT 5.00,
        \`receipt_prefix\` VARCHAR(10) NOT NULL DEFAULT 'REC',
        \`customer_id_prefix\` VARCHAR(10) NOT NULL DEFAULT 'CUST',
        \`membership_id_prefix\` VARCHAR(10) NOT NULL DEFAULT 'MEM',
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Insert initial company settings row if missing or update if old placeholders
    await execute(`
      INSERT INTO company_settings (id, company_name, address, phone, email, currency_symbol)
      VALUES (1, 'JIVAN CHITS SALEM (P) LTD.', 'No.463/8, Harish Tower, Ramasamy Nagar, East Thiruvagoundanur, Salem 636005.', '95855-57568', 'info@jivanchits.com', '₹')
      ON DUPLICATE KEY UPDATE
        company_name = IF(company_name LIKE '%Chit Fund%' OR company_name LIKE '%India%' OR company_name = 'Jivan Chit Funds', 'JIVAN CHITS SALEM (P) LTD.', company_name),
        address = IF(address LIKE '%123 Main%' OR address LIKE '%Registered Office%', 'No.463/8, Harish Tower, Ramasamy Nagar, East Thiruvagoundanur, Salem 636005.', address);
    `);

    // 3. Customers table
    await execute(`
      CREATE TABLE IF NOT EXISTS \`customers\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`customer_id\` VARCHAR(30) NOT NULL UNIQUE,
        \`full_name\` VARCHAR(120) NOT NULL,
        \`mobile_number\` VARCHAR(15) NOT NULL,
        \`alternate_mobile\` VARCHAR(15) NULL,
        \`email\` VARCHAR(100) NULL,
        \`dob\` DATE NULL,
        \`gender\` ENUM('Male', 'Female', 'Other') NOT NULL DEFAULT 'Male',
        \`address\` TEXT NOT NULL,
        \`city\` VARCHAR(60) NOT NULL,
        \`pincode\` VARCHAR(10) NOT NULL,
        \`id_proof_type\` ENUM('Aadhaar', 'PAN', 'Voter ID', 'Passport', 'Driving License') NOT NULL DEFAULT 'Aadhaar',
        \`id_proof_number\` VARCHAR(50) NOT NULL,
        \`nominee_name\` VARCHAR(100) NOT NULL,
        \`nominee_relationship\` VARCHAR(50) NOT NULL,
        \`nominee_mobile\` VARCHAR(15) NOT NULL,
        \`joining_date\` DATE NOT NULL,
        \`status\` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
        \`remarks\` TEXT NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 4. Chit Groups table
    await execute(`
      CREATE TABLE IF NOT EXISTS \`chit_groups\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`group_id\` VARCHAR(30) NOT NULL UNIQUE,
        \`group_name\` VARCHAR(100) NOT NULL,
        \`chit_value\` DECIMAL(12, 2) NOT NULL,
        \`num_members\` INT NOT NULL,
        \`monthly_installment\` DECIMAL(12, 2) NOT NULL,
        \`duration_months\` INT NOT NULL,
        \`start_date\` DATE NOT NULL,
        \`end_date\` DATE NOT NULL,
        \`auction_day_of_month\` INT NOT NULL DEFAULT 10,
        \`auction_frequency\` VARCHAR(30) NOT NULL DEFAULT 'Monthly',
        \`foreman_commission_percent\` DECIMAL(5, 2) NOT NULL DEFAULT 5.00,
        \`status\` ENUM('Upcoming', 'Active', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Upcoming',
        \`description\` TEXT NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 5. Memberships table
    await execute(`
      CREATE TABLE IF NOT EXISTS \`memberships\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`membership_id\` VARCHAR(30) NOT NULL UNIQUE,
        \`customer_id\` VARCHAR(30) NOT NULL,
        \`group_id\` VARCHAR(30) NOT NULL,
        \`ticket_number\` INT NOT NULL,
        \`joining_date\` DATE NOT NULL,
        \`installment_amount\` DECIMAL(12, 2) NOT NULL,
        \`total_installments\` INT NOT NULL,
        \`paid_installments\` INT NOT NULL DEFAULT 0,
        \`pending_installments\` INT NOT NULL,
        \`total_paid\` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        \`total_pending\` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        \`status\` ENUM('active', 'prized', 'completed', 'cancelled') NOT NULL DEFAULT 'active',
        \`is_duplicate_allowed\` TINYINT(1) NOT NULL DEFAULT 0,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY \`uniq_group_ticket\` (\`group_id\`, \`ticket_number\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 6. Installments table
    await execute(`
      CREATE TABLE IF NOT EXISTS \`installments\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`installment_id\` VARCHAR(40) NOT NULL UNIQUE,
        \`membership_id\` VARCHAR(30) NOT NULL,
        \`customer_id\` VARCHAR(30) NOT NULL,
        \`group_id\` VARCHAR(30) NOT NULL,
        \`month_number\` INT NOT NULL,
        \`due_date\` DATE NOT NULL,
        \`installment_amount\` DECIMAL(12, 2) NOT NULL,
        \`dividend_deduction\` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        \`net_due_amount\` DECIMAL(12, 2) NOT NULL,
        \`paid_amount\` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        \`payment_date\` DATE NULL,
        \`payment_mode\` ENUM('Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Other') NULL,
        \`receipt_number\` VARCHAR(50) NULL,
        \`status\` ENUM('Pending', 'Partially Paid', 'Paid', 'Overdue') NOT NULL DEFAULT 'Pending',
        \`remarks\` TEXT NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 7. Payments table
    await execute(`
      CREATE TABLE IF NOT EXISTS \`payments\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`receipt_number\` VARCHAR(50) NOT NULL UNIQUE,
        \`installment_id\` VARCHAR(40) NOT NULL,
        \`membership_id\` VARCHAR(30) NOT NULL,
        \`customer_id\` VARCHAR(30) NOT NULL,
        \`group_id\` VARCHAR(30) NOT NULL,
        \`amount_paid\` DECIMAL(12, 2) NOT NULL,
        \`previous_balance\` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        \`remaining_balance\` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        \`payment_mode\` ENUM('Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Other') NOT NULL DEFAULT 'Cash',
        \`transaction_reference\` VARCHAR(100) NULL,
        \`payment_date\` DATE NOT NULL,
        \`collected_by_user_id\` INT NOT NULL,
        \`status\` ENUM('active', 'reversed', 'cancelled') NOT NULL DEFAULT 'active',
        \`reversal_reason\` TEXT NULL,
        \`remarks\` TEXT NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 8. Auctions table
    await execute(`
      CREATE TABLE IF NOT EXISTS \`auctions\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`auction_id\` VARCHAR(40) NOT NULL UNIQUE,
        \`group_id\` VARCHAR(30) NOT NULL,
        \`auction_number\` INT NOT NULL,
        \`auction_date\` DATE NOT NULL,
        \`chit_value\` DECIMAL(12, 2) NOT NULL,
        \`bid_discount_amount\` DECIMAL(12, 2) NOT NULL,
        \`prize_amount\` DECIMAL(12, 2) NOT NULL,
        \`foreman_commission\` DECIMAL(12, 2) NOT NULL,
        \`dividend_amount\` DECIMAL(12, 2) NOT NULL,
        \`dividend_per_member\` DECIMAL(12, 2) NOT NULL,
        \`winner_membership_id\` VARCHAR(30) NOT NULL,
        \`winner_customer_id\` VARCHAR(30) NOT NULL,
        \`ticket_number\` INT NOT NULL,
        \`status\` ENUM('Scheduled', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Completed',
        \`remarks\` TEXT NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY \`uniq_group_auction_num\` (\`group_id\`, \`auction_number\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 9. Dividends table
    await execute(`
      CREATE TABLE IF NOT EXISTS \`dividends\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`dividend_id\` VARCHAR(40) NOT NULL UNIQUE,
        \`auction_id\` VARCHAR(40) NOT NULL,
        \`group_id\` VARCHAR(30) NOT NULL,
        \`total_discount\` DECIMAL(12, 2) NOT NULL,
        \`foreman_commission\` DECIMAL(12, 2) NOT NULL,
        \`distributable_dividend\` DECIMAL(12, 2) NOT NULL,
        \`num_eligible_members\` INT NOT NULL,
        \`dividend_per_member\` DECIMAL(12, 2) NOT NULL,
        \`month_number\` INT NOT NULL,
        \`status\` ENUM('Pending Review', 'Confirmed', 'Distributed') NOT NULL DEFAULT 'Confirmed',
        \`confirmed_by_user_id\` INT NOT NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 10. Prize Payments table
    await execute(`
      CREATE TABLE IF NOT EXISTS \`prize_payments\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`prize_payment_id\` VARCHAR(40) NOT NULL UNIQUE,
        \`auction_id\` VARCHAR(40) NOT NULL,
        \`group_id\` VARCHAR(30) NOT NULL,
        \`winner_customer_id\` VARCHAR(30) NOT NULL,
        \`winner_membership_id\` VARCHAR(30) NOT NULL,
        \`ticket_number\` INT NOT NULL,
        \`auction_number\` INT NOT NULL,
        \`chit_value\` DECIMAL(12, 2) NOT NULL,
        \`discount_amount\` DECIMAL(12, 2) NOT NULL,
        \`prize_amount\` DECIMAL(12, 2) NOT NULL,
        \`paid_amount\` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        \`disbursal_date\` DATE NULL,
        \`payment_status\` ENUM('Pending', 'Partially Paid', 'Paid') NOT NULL DEFAULT 'Pending',
        \`payment_mode\` ENUM('Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Other') NULL,
        \`transaction_reference\` VARCHAR(100) NULL,
        \`remarks\` TEXT NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 11. Expenses table
    await execute(`
      CREATE TABLE IF NOT EXISTS \`expenses\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`expense_id\` VARCHAR(40) NOT NULL UNIQUE,
        \`expense_date\` DATE NOT NULL,
        \`category\` ENUM('Office Expense', 'Salary', 'Rent', 'Travel', 'Marketing', 'Bank Charges', 'Other') NOT NULL,
        \`description\` TEXT NOT NULL,
        \`amount\` DECIMAL(12, 2) NOT NULL,
        \`payment_mode\` ENUM('Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Other') NOT NULL DEFAULT 'Cash',
        \`reference_number\` VARCHAR(100) NULL,
        \`remarks\` TEXT NULL,
        \`created_by_user_id\` INT NOT NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 12. Notifications table
    await execute(`
      CREATE TABLE IF NOT EXISTS \`notifications\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`notification_id\` VARCHAR(40) NOT NULL UNIQUE,
        \`type\` ENUM('upcoming_installment', 'overdue_installment', 'upcoming_auction', 'pending_prize_payment', 'general') NOT NULL,
        \`title\` VARCHAR(150) NOT NULL,
        \`message\` TEXT NOT NULL,
        \`related_id\` VARCHAR(50) NULL,
        \`due_date\` DATE NULL,
        \`is_read\` TINYINT(1) NOT NULL DEFAULT 0,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 13. Audit Logs table
    await execute(`
      CREATE TABLE IF NOT EXISTS \`audit_logs\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT NOT NULL,
        \`username\` VARCHAR(50) NOT NULL,
        \`action\` VARCHAR(50) NOT NULL,
        \`module\` VARCHAR(50) NOT NULL,
        \`record_id\` VARCHAR(50) NOT NULL,
        \`old_value\` JSON NULL,
        \`new_value\` JSON NULL,
        \`ip_address\` VARCHAR(45) NULL,
        \`timestamp\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 14. Routes table
    await execute(`
      CREATE TABLE IF NOT EXISTS \`routes\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`route_id\` VARCHAR(30) NOT NULL UNIQUE,
        \`route_name\` VARCHAR(100) NOT NULL,
        \`city\` VARCHAR(60) NOT NULL DEFAULT 'Salem',
        \`area\` VARCHAR(100) NOT NULL,
        \`sub_localities\` TEXT NULL,
        \`assigned_agent_id\` INT NULL,
        \`status\` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_assigned_agent\` (\`assigned_agent_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 15. Daily Handovers table
    await execute(`
      CREATE TABLE IF NOT EXISTS \`daily_handovers\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`handover_id\` VARCHAR(40) NOT NULL UNIQUE,
        \`agent_user_id\` INT NOT NULL,
        \`handover_date\` DATE NOT NULL,
        \`total_cash\` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        \`total_online\` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        \`receipts_count\` INT NOT NULL DEFAULT 0,
        \`declared_cash\` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        \`discrepancy\` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        \`commission_amount\` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        \`status\` ENUM('submitted', 'verified', 'rejected') NOT NULL DEFAULT 'submitted',
        \`verified_by_user_id\` INT NULL,
        \`verified_at\` DATETIME NULL,
        \`notes\` TEXT NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_agent_date\` (\`agent_user_id\`, \`handover_date\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 16. Kuzhukkal (Lucky Draw / Draw of Lots) table
    await execute(`
      CREATE TABLE IF NOT EXISTS \`kuzhukkal_draws\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`draw_id\` VARCHAR(40) NOT NULL UNIQUE,
        \`group_id\` VARCHAR(30) NOT NULL,
        \`draw_sequence\` INT NOT NULL,
        \`draw_date\` DATE NOT NULL,
        \`draw_method\` ENUM('physical', 'digital') NOT NULL DEFAULT 'digital',
        \`winner_membership_id\` VARCHAR(30) NOT NULL,
        \`winner_customer_id\` VARCHAR(30) NOT NULL,
        \`ticket_number\` INT NOT NULL,
        \`prize_title\` VARCHAR(150) NULL,
        \`prize_amount\` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        \`status\` ENUM('Draft', 'Confirmed', 'Cancelled') NOT NULL DEFAULT 'Confirmed',
        \`conducted_by_user_id\` INT NOT NULL,
        \`confirmed_by_user_id\` INT NOT NULL,
        \`confirmed_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`remarks\` TEXT NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_kuzhukkal_group\` (\`group_id\`),
        INDEX \`idx_kuzhukkal_seq\` (\`group_id\`, \`draw_sequence\`),
        INDEX \`idx_kuzhukkal_winner\` (\`group_id\`, \`winner_membership_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Column additions if missing
    const addColumnIfNotExists = async (table: string, column: string, definition: string) => {
      try {
        const cols = await query(
          'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
          [table, column]
        );
        if (cols.length === 0) {
          await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
          console.log(`[DB] Added column ${column} to ${table}`);
        }
      } catch (e) {
        console.warn(`[DB] Column check for ${table}.${column}:`, e);
      }
    };
    await addColumnIfNotExists('customers', 'route_id', 'VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL');
    await addColumnIfNotExists('customers', 'google_map_link', 'TEXT NULL');
    await addColumnIfNotExists('customers', 'co_applicant_name', 'VARCHAR(120) NULL');
    await addColumnIfNotExists('customers', 'co_applicant_mobile', 'VARCHAR(15) NULL');
    await addColumnIfNotExists('customers', 'co_applicant_address', 'TEXT NULL');
    await addColumnIfNotExists('customers', 'co_applicant_map_link', 'TEXT NULL');
    await addColumnIfNotExists('customers', 'security1_name', 'VARCHAR(120) NULL');
    await addColumnIfNotExists('customers', 'security1_mobile', 'VARCHAR(15) NULL');
    await addColumnIfNotExists('customers', 'security1_address', 'TEXT NULL');
    await addColumnIfNotExists('customers', 'security1_map_link', 'TEXT NULL');
    await addColumnIfNotExists('customers', 'security1_photo', 'LONGTEXT NULL');
    await addColumnIfNotExists('customers', 'security2_name', 'VARCHAR(120) NULL');
    await addColumnIfNotExists('customers', 'security2_mobile', 'VARCHAR(15) NULL');
    await addColumnIfNotExists('customers', 'security2_address', 'TEXT NULL');
    await addColumnIfNotExists('customers', 'security2_map_link', 'TEXT NULL');
    await addColumnIfNotExists('customers', 'security2_photo', 'LONGTEXT NULL');
    await addColumnIfNotExists('users', 'assigned_route_id', 'VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL');
    try {
      await pool.query('ALTER TABLE `routes` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
      await pool.query('ALTER TABLE `daily_handovers` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
      await pool.query('ALTER TABLE `kuzhukkal_draws` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
      await pool.query('ALTER TABLE `customers` MODIFY COLUMN `route_id` VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL');
      await pool.query('ALTER TABLE `users` MODIFY COLUMN `assigned_route_id` VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL');
    } catch {}

    // Seed default admin, staff, and agent credentials if missing
    const adminHash = crypto.createHash('sha256').update('admin123').digest('hex');
    const staffHash = crypto.createHash('sha256').update('staff123').digest('hex');
    const agentHash = crypto.createHash('sha256').update('agent123').digest('hex');

    await execute(`
      INSERT IGNORE INTO users (id, username, password_hash, full_name, email, role, status)
      VALUES
      (1, 'admin', ?, 'System Administrator', 'admin@jivanchitfunds.com', 'admin', 'active'),
      (2, 'staff', ?, 'Staff Cashier', 'staff@jivanchitfunds.com', 'staff', 'active'),
      (3, 'agent', ?, 'Ravi Kumar (Field Agent)', 'agent@jivanchitfunds.com', 'agent', 'active')
    `, [adminHash, staffHash, agentHash]);

    // Seed initial Salem collection routes if empty
    const routesCount = await queryOne<any>('SELECT COUNT(*) AS c FROM routes');
    if (!routesCount || Number(routesCount.c) === 0) {
      await execute(`
        INSERT IGNORE INTO routes (route_id, route_name, city, area, sub_localities, assigned_agent_id, status)
        VALUES
          ('RT-001', 'Fairlands & Meyyanur', 'Salem', 'Fairlands', 'Fairlands, Brindavan Road, Meyyanur, New Bus Stand', 3, 'active'),
          ('RT-002', 'Hasthampatti & Gorimedu', 'Salem', 'Hasthampatti', 'Hasthampatti, Gorimedu, Cherry Road, Vincent', NULL, 'active'),
          ('RT-003', 'Suramangalam & Junction', 'Salem', 'Suramangalam', 'Salem Junction, Suramangalam, Leigh Bazaar, Jagir Ammapalayam', NULL, 'active'),
          ('RT-004', 'Ammapet & Shevapet', 'Salem', 'Ammapet', 'Ammapet, Shevapet, Fort, Bazaar Street, Gugai', NULL, 'active')
      `);
      try {
        await execute(`UPDATE users SET assigned_route_id = 'RT-001' WHERE id = 3`);
      } catch {}
      console.log('[DB] Sample Salem collection routes seeded.');
    }

    console.log('[DB] Database tables initialized successfully.');
  } catch (err) {
    console.error('[DB] Database initialization notice:', err);
  }
}
initDb();

// ---- Row mappers ----
function mapUser(r: any): User & { passwordHash: string } {
  return {
    id: r.id, username: r.username, passwordHash: r.password_hash,
    fullName: r.full_name, email: r.email, role: r.role, status: r.status,
    assignedRouteId: r.assigned_route_id || undefined,
    assignedRouteName: r.assigned_route_name || undefined,
    lastLogin: r.last_login, lastLoginAt: r.last_login, createdAt: r.created_at,
  } as any;
}

function mapCustomer(r: any): Customer & { newGroupNo?: string; chitValue?: number; month?: number } {
  let groupCode = r.group_id || '';
  if (groupCode && !groupCode.includes('/')) {
    groupCode = `${groupCode}/001`;
  }
  const formattedTicket = r.ticket_number ? String(r.ticket_number).padStart(2, '0') : '';
  const newGroupNo = groupCode && formattedTicket ? `${groupCode}/${formattedTicket}` : (r.new_group_no || '-');
  const rawChitValue = Number(r.chit_value || 0);
  const chitValue = rawChitValue >= 100000 ? rawChitValue / 100000 : rawChitValue;

  return {
    id: r.id, customerId: r.customer_id, fullName: r.full_name,
    mobileNumber: r.mobile_number, alternateMobile: r.alternate_mobile,
    email: r.email, dob: r.dob, gender: r.gender, address: r.address,
    city: r.city, pincode: r.pincode, idProofType: r.id_proof_type,
    idProofNumber: r.id_proof_number, nomineeName: r.nominee_name,
    nomineeRelationship: r.nominee_relationship, nomineeMobile: r.nominee_mobile,
    joiningDate: r.joining_date, status: r.status, googleMapLink: r.google_map_link,
    coApplicantName: r.co_applicant_name, coApplicantMobile: r.co_applicant_mobile,
    coApplicantAddress: r.co_applicant_address, coApplicantMapLink: r.co_applicant_map_link,
    security1Name: r.security1_name, security1Mobile: r.security1_mobile,
    security1Address: r.security1_address, security1MapLink: r.security1_map_link, security1Photo: r.security1_photo,
    security2Name: r.security2_name, security2Mobile: r.security2_mobile,
    security2Address: r.security2_address, security2MapLink: r.security2_map_link, security2Photo: r.security2_photo,
    remarks: r.remarks,
    routeId: r.route_id || undefined,
    routeName: r.route_name || (r.route_id ? r.route_id : undefined),
    assignedAgentId: r.assigned_agent_id ? Number(r.assigned_agent_id) : undefined,
    assignedAgentName: r.assigned_agent_name || undefined,
    totalMemberships: +(r.total_memberships || (r.membership_id ? 1 : 0)),
    newGroupNo,
    chitValue: chitValue || 10,
    month: Number(r.duration_months || 20),
    createdAt: r.created_at, updatedAt: r.updated_at,
  } as any;
}

// ---- CUSTOMERS ----
export const customerDbMethods = {
  getCustomers(search?: string, status?: string, routeId?: string, agentUserId?: number | string): Promise<Customer[]> {
    let sql = `
      SELECT c.*,
        rt.route_name,
        rt.assigned_agent_id,
        ag.full_name AS assigned_agent_name,
        m.group_id,
        m.ticket_number,
        m.membership_id,
        cg.chit_value,
        cg.duration_months,
        (SELECT COUNT(*) FROM memberships m2 WHERE m2.customer_id=c.customer_id) AS total_memberships
      FROM customers c
      LEFT JOIN routes rt ON c.route_id = rt.route_id
      LEFT JOIN users ag ON rt.assigned_agent_id = ag.id
      LEFT JOIN memberships m ON m.id = (
        SELECT id FROM memberships m3 WHERE m3.customer_id = c.customer_id ORDER BY m3.created_at DESC LIMIT 1
      )
      LEFT JOIN chit_groups cg ON m.group_id = cg.group_id
      WHERE 1=1
    `;
    const p: any[] = [];
    if (search) {
      sql += ' AND (c.full_name LIKE ? OR c.mobile_number LIKE ? OR c.customer_id LIKE ? OR m.group_id LIKE ? OR rt.route_name LIKE ?)';
      const l = `%${search}%`;
      p.push(l, l, l, l, l);
    }
    if (status) { sql += ' AND c.status=?'; p.push(status); }
    if (routeId && routeId !== 'all') { sql += ' AND c.route_id=?'; p.push(routeId); }
    if (agentUserId) {
      sql += ` AND (
        (c.route_id IS NOT NULL AND c.route_id = (SELECT assigned_route_id FROM users WHERE id=?))
        OR EXISTS (SELECT 1 FROM payments p WHERE p.customer_id = c.customer_id AND p.collected_by_user_id = ?)
      )`;
      p.push(agentUserId, agentUserId);
    }
    sql += ' ORDER BY c.created_at DESC';
    return query<any>(sql, p).then(rows => rows.map(mapCustomer));
  },

  getCustomerById(id: string): Promise<Customer | null> {
    return queryOne<any>(`
      SELECT c.*,
        rt.route_name,
        rt.assigned_agent_id,
        ag.full_name AS assigned_agent_name,
        m.group_id,
        m.ticket_number,
        m.membership_id,
        cg.chit_value,
        cg.duration_months
      FROM customers c
      LEFT JOIN routes rt ON c.route_id = rt.route_id
      LEFT JOIN users ag ON rt.assigned_agent_id = ag.id
      LEFT JOIN memberships m ON m.id = (
        SELECT id FROM memberships m3 WHERE m3.customer_id = c.customer_id ORDER BY m3.created_at DESC LIMIT 1
      )
      LEFT JOIN chit_groups cg ON m.group_id = cg.group_id
      WHERE c.customer_id=?
    `, [id]).then(r => r ? mapCustomer(r) : null);
  },

  async createCustomer(data: any, actor: User): Promise<Customer> {
    const maxCust = await queryOne<any>(`
      SELECT customer_id FROM customers 
      WHERE customer_id REGEXP '^CUST-[0-9]+$' 
      ORDER BY CAST(SUBSTRING(customer_id, 6) AS UNSIGNED) DESC 
      LIMIT 1
    `);
    let nextNum = 1001;
    if (maxCust?.customer_id) {
      const parsed = parseInt(maxCust.customer_id.replace('CUST-', ''), 10);
      if (!isNaN(parsed) && parsed >= 1000) {
        nextNum = parsed + 1;
      }
    }
    let cid = `CUST-${nextNum}`;
    while (await queryOne('SELECT 1 FROM customers WHERE customer_id = ?', [cid])) {
      nextNum++;
      cid = `CUST-${nextNum}`;
    }
    await execute(`INSERT INTO customers
      (customer_id,full_name,mobile_number,alternate_mobile,email,dob,gender,
       address,city,pincode,id_proof_type,id_proof_number,
       nominee_name,nominee_relationship,nominee_mobile,joining_date,status,google_map_link,
       co_applicant_name,co_applicant_mobile,co_applicant_address,co_applicant_map_link,
       security1_name,security1_mobile,security1_address,security1_map_link,security1_photo,
       security2_name,security2_mobile,security2_address,security2_map_link,security2_photo,
       route_id,remarks)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [cid, data.fullName, data.mobileNumber, data.alternateMobile ?? null,
        data.email ?? null, data.dob ?? null, data.gender ?? 'Male',
        data.address, data.city, data.pincode,
        data.idProofType ?? 'Aadhaar', data.idProofNumber,
        data.nomineeName, data.nomineeRelationship ?? 'Spouse',
        data.nomineeMobile ?? data.mobileNumber,
        data.joiningDate ?? today(), data.status ?? 'active', data.googleMapLink ?? null,
        data.coApplicantName ?? null, data.coApplicantMobile ?? null, data.coApplicantAddress ?? null, data.coApplicantMapLink ?? null,
        data.security1Name ?? null, data.security1Mobile ?? null, data.security1Address ?? null, data.security1MapLink ?? null, data.security1Photo ?? null,
        data.security2Name ?? null, data.security2Mobile ?? null, data.security2Address ?? null, data.security2MapLink ?? null, data.security2Photo ?? null,
        data.routeId ?? null, data.remarks ?? null]
    );

    // Auto-enroll in group if groupId provided in same modal
    if (data.groupId) {
      try {
        await db.createMembership({
          customerId: cid,
          groupId: data.groupId,
          ticketNumber: data.ticketNumber ? Number(data.ticketNumber) : undefined
        }, actor);
      } catch (err) {
        console.error('[DB] Auto-enroll membership notice:', err);
      }
    }

    await db.logAudit(actor.id, actor.username, 'CREATE_CUSTOMER', 'CUSTOMERS', cid, null, data);
    const r = await db.getCustomerById(cid);
    return r!;
  },

  async updateCustomer(id: string, data: Partial<Customer>, actor?: User): Promise<Customer> {
    const old = await db.getCustomerById(id);
    if (!old) throw new Error('Customer not found');
    await execute(`UPDATE customers SET
      full_name=?,mobile_number=?,alternate_mobile=?,email=?,dob=?,gender=?,
      address=?,city=?,pincode=?,id_proof_type=?,id_proof_number=?,
      nominee_name=?,nominee_relationship=?,nominee_mobile=?,
      joining_date=?,status=?,google_map_link=?,
      co_applicant_name=?,co_applicant_mobile=?,co_applicant_address=?,co_applicant_map_link=?,
      security1_name=?,security1_mobile=?,security1_address=?,security1_map_link=?,security1_photo=?,
      security2_name=?,security2_mobile=?,security2_address=?,security2_map_link=?,security2_photo=?,
      route_id=?,remarks=?
      WHERE customer_id=?`,
      [
        data.fullName ?? old.fullName,
        data.mobileNumber ?? old.mobileNumber,
        data.alternateMobile ?? old.alternateMobile ?? null,
        data.email ?? old.email ?? null,
        data.dob ?? old.dob ?? null,
        data.gender ?? old.gender ?? 'Male',
        data.address ?? old.address,
        data.city ?? old.city,
        data.pincode ?? old.pincode,
        data.idProofType ?? old.idProofType ?? 'Aadhaar',
        data.idProofNumber ?? old.idProofNumber,
        data.nomineeName ?? old.nomineeName,
        data.nomineeRelationship ?? old.nomineeRelationship ?? 'Spouse',
        data.nomineeMobile ?? old.nomineeMobile,
        data.joiningDate ?? old.joiningDate ?? today(),
        data.status ?? old.status ?? 'active',
        data.googleMapLink !== undefined ? data.googleMapLink : (old.googleMapLink ?? null),
        data.coApplicantName !== undefined ? data.coApplicantName : (old.coApplicantName ?? null),
        data.coApplicantMobile !== undefined ? data.coApplicantMobile : (old.coApplicantMobile ?? null),
        data.coApplicantAddress !== undefined ? data.coApplicantAddress : (old.coApplicantAddress ?? null),
        data.coApplicantMapLink !== undefined ? data.coApplicantMapLink : (old.coApplicantMapLink ?? null),
        data.security1Name !== undefined ? data.security1Name : (old.security1Name ?? null),
        data.security1Mobile !== undefined ? data.security1Mobile : (old.security1Mobile ?? null),
        data.security1Address !== undefined ? data.security1Address : (old.security1Address ?? null),
        data.security1MapLink !== undefined ? data.security1MapLink : (old.security1MapLink ?? null),
        data.security1Photo !== undefined ? data.security1Photo : (old.security1Photo ?? null),
        data.security2Name !== undefined ? data.security2Name : (old.security2Name ?? null),
        data.security2Mobile !== undefined ? data.security2Mobile : (old.security2Mobile ?? null),
        data.security2Address !== undefined ? data.security2Address : (old.security2Address ?? null),
        data.security2MapLink !== undefined ? data.security2MapLink : (old.security2MapLink ?? null),
        data.security2Photo !== undefined ? data.security2Photo : (old.security2Photo ?? null),
        data.routeId !== undefined ? (data.routeId || null) : (old.routeId ?? null),
        data.remarks !== undefined ? (data.remarks || null) : (old.remarks ?? null),
        id
      ]
    );
    if (actor) {
      await db.logAudit(actor.id, actor.username, 'UPDATE_CUSTOMER', 'CUSTOMERS', id, old, data);
    }
    const r = await db.getCustomerById(id);
    return r!;
  }
};

function mapGroup(r: any): ChitGroup {
  return {
    id: r.id, groupId: r.group_id, groupName: r.group_name,
    chitValue: +r.chit_value, numMembers: +r.num_members,
    monthlyInstallment: +r.monthly_installment, durationMonths: +r.duration_months,
    startDate: r.start_date, endDate: r.end_date,
    auctionDayOfMonth: +r.auction_day_of_month, auctionFrequency: r.auction_frequency,
    foremanCommissionPercent: +r.foreman_commission_percent, status: r.status,
    description: r.description, currentMembersCount: +(r.current_members_count ?? 0),
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function mapMembership(r: any): Membership & Record<string, any> {
  return {
    id: r.id, membershipId: r.membership_id, customerId: r.customer_id,
    customerName: r.customer_name, customerMobile: r.customer_mobile,
    groupId: r.group_id, groupName: r.group_name, chitValue: +(r.chit_value ?? 0),
    ticketNumber: +r.ticket_number, joiningDate: r.joining_date,
    installmentAmount: +r.installment_amount, totalInstallments: +r.total_installments,
    paidInstallments: +r.paid_installments, pendingInstallments: +r.pending_installments,
    totalPaid: +r.total_paid, totalPending: +r.total_pending, status: r.status,
    isDuplicateAllowed: !!r.is_duplicate_allowed,
    groupNo: r.group_no || r.group_id,
    totalMembers: +(r.total_members ?? 0),
    durationMonths: +(r.duration_months ?? 0),
    monthlySubscription: +(r.monthly_subscription ?? r.installment_amount ?? 0),
    dob: r.dob,
    address: r.address,
    nomineeName: r.nominee_name,
    nomineeRelationship: r.nominee_relationship,
    pendingAmount: +r.total_pending,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function mapInstallment(r: any): Installment {
  return {
    id: r.id, installmentId: r.installment_id, membershipId: r.membership_id,
    customerId: r.customer_id, customerName: r.customer_name,
    groupId: r.group_id, groupName: r.group_name, ticketNumber: +(r.ticket_number ?? 0),
    monthNumber: +r.month_number, dueDate: r.due_date,
    installmentAmount: +r.installment_amount, dividendDeduction: +r.dividend_deduction,
    netDueAmount: +r.net_due_amount, paidAmount: +r.paid_amount,
    balanceAmount: round2(+r.net_due_amount - +r.paid_amount),
    paymentDate: r.payment_date, paymentMode: r.payment_mode,
    receiptNumber: r.receipt_number, status: r.status, remarks: r.remarks,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function mapPayment(r: any): Payment {
  return {
    id: r.id, receiptNumber: r.receipt_number, installmentId: r.installment_id,
    membershipId: r.membership_id, customerId: r.customer_id,
    customerName: r.customer_name, groupId: r.group_id, groupName: r.group_name,
    ticketNumber: +(r.ticket_number ?? 0), monthNumber: +(r.month_number ?? 0),
    amountPaid: +r.amount_paid, previousBalance: +r.previous_balance,
    remainingBalance: +r.remaining_balance, paymentMode: r.payment_mode,
    transactionReference: r.transaction_reference, paymentDate: r.payment_date,
    collectedByUserId: +r.collected_by_user_id, collectedByName: r.collected_by_name,
    status: r.status, reversalReason: r.reversal_reason, remarks: r.remarks,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function mapAuction(r: any): Auction {
  return {
    id: r.id, auctionId: r.auction_id, groupId: r.group_id, groupName: r.group_name,
    auctionNumber: +r.auction_number, auctionDate: r.auction_date,
    chitValue: +r.chit_value, bidDiscountAmount: +r.bid_discount_amount,
    prizeAmount: +r.prize_amount, foremanCommission: +r.foreman_commission,
    dividendAmount: +r.dividend_amount, dividendPerMember: +r.dividend_per_member,
    winnerMembershipId: r.winner_membership_id, winnerCustomerId: r.winner_customer_id,
    winnerCustomerName: r.winner_customer_name, ticketNumber: +r.ticket_number,
    winnerTicketNumber: +r.ticket_number,
    status: r.status, remarks: r.remarks,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function mapDividend(r: any): DividendDistribution {
  return {
    id: r.id, dividendId: r.dividend_id, auctionId: r.auction_id,
    groupId: r.group_id, groupName: r.group_name,
    totalDiscount: +r.total_discount, foremanCommission: +r.foreman_commission,
    distributableDividend: +r.distributable_dividend,
    numEligibleMembers: +r.num_eligible_members, dividendPerMember: +r.dividend_per_member,
    monthNumber: +r.month_number, status: r.status,
    confirmedByUserId: +r.confirmed_by_user_id, createdAt: r.created_at,
  };
}

function mapPrizePayment(r: any): PrizePayment {
  return {
    id: r.id, prizePaymentId: r.prize_payment_id, auctionId: r.auction_id,
    groupId: r.group_id, groupName: r.group_name,
    winnerCustomerId: r.winner_customer_id, winnerCustomerName: r.winner_customer_name,
    winnerMembershipId: r.winner_membership_id, ticketNumber: +r.ticket_number,
    auctionNumber: +r.auction_number, chitValue: +r.chit_value,
    discountAmount: +r.discount_amount, prizeAmount: +r.prize_amount,
    paidAmount: +r.paid_amount,
    remainingAmount: round2(+r.prize_amount - +r.paid_amount),
    disbursalDate: r.disbursal_date, paymentStatus: r.payment_status,
    paymentMode: r.payment_mode, transactionReference: r.transaction_reference,
    remarks: r.remarks, createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function mapExpense(r: any): Expense {
  return {
    id: r.id, expenseId: r.expense_id, expenseDate: r.expense_date,
    category: r.category, description: r.description, amount: +r.amount,
    paymentMode: r.payment_mode, referenceNumber: r.reference_number,
    remarks: r.remarks, createdByUserId: +r.created_by_user_id,
    createdByName: r.created_by_name, createdAt: r.created_at,
  };
}

function mapNotification(r: any): NotificationItem {
  return {
    id: r.id, notificationId: r.notification_id, type: r.type,
    title: r.title, message: r.message, relatedId: r.related_id,
    dueDate: r.due_date, isRead: !!r.is_read, createdAt: r.created_at,
  };
}

function mapAuditLog(r: any): AuditLog {
  return {
    id: r.id, userId: +r.user_id, username: r.username,
    action: r.action, module: r.module, recordId: r.record_id,
    oldValue: r.old_value, newValue: r.new_value, ipAddress: r.ip_address,
    timestamp: r.timestamp,
  };
}

function mapKuzhukkalDraw(r: any): KuzhukkalDraw {
  return {
    id: r.id,
    drawId: r.draw_id,
    groupId: r.group_id,
    groupName: r.group_name,
    drawSequence: Number(r.draw_sequence),
    drawDate: String(r.draw_date).slice(0, 10),
    drawMethod: r.draw_method,
    winnerMembershipId: r.winner_membership_id,
    winnerCustomerId: r.winner_customer_id,
    winnerCustomerName: r.winner_customer_name,
    winnerCustomerMobile: r.winner_customer_mobile,
    ticketNumber: Number(r.ticket_number),
    prizeTitle: r.prize_title,
    prizeAmount: Number(r.prize_amount || 0),
    status: r.status,
    conductedByUserId: Number(r.conducted_by_user_id),
    conductedByName: r.conducted_by_name,
    confirmedByUserId: Number(r.confirmed_by_user_id),
    confirmedByName: r.confirmed_by_name,
    confirmedAt: r.confirmed_at,
    remarks: r.remarks,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapSettings(r: any): CompanySettings {
  const companyName = (!r.company_name || r.company_name === 'Jivan Chit Funds' || r.company_name.toLowerCase().includes('chit fund') || r.company_name.toLowerCase().includes('india'))
    ? 'JIVAN CHITS SALEM (P) LTD.'
    : r.company_name;

  const address = (!r.address || r.address.includes('123 Main') || r.address.includes('Registered Office'))
    ? 'No.463/8, Harish Tower, Ramasamy Nagar, East Thiruvagoundanur, Salem 636005.'
    : r.address;

  return {
    id: r.id,
    companyName,
    address,
    phone: r.phone || '95855-57568',
    email: r.email || 'info@jivanchits.com',
    currencySymbol: r.currency_symbol || '₹',
    financialYear: r.financial_year,
    defaultCommissionPercent: +r.default_commission_percent,
    defaultForemanCommissionPercent: +r.default_commission_percent,
    receiptPrefix: r.receipt_prefix,
    customerIdPrefix: r.customer_id_prefix,
    membershipIdPrefix: r.membership_id_prefix,
    updatedAt: r.updated_at,
  };
}

// ============================================================
// DB OBJECT  — same interface the existing api.ts expects
// ============================================================
export const db = {

  // ---- USERS ----
  getUserByUsername(username: string) {
    return pool.execute(`
      SELECT u.*, r.route_name AS assigned_route_name
      FROM users u
      LEFT JOIN routes r ON u.assigned_route_id = r.route_id
      WHERE u.username=? LIMIT 1
    `, [username])
      .then(([rows]: any) => rows[0] ? mapUser(rows[0]) : null);
  },

  getUserById(id: number) {
    return pool.execute(`
      SELECT u.*, r.route_name AS assigned_route_name
      FROM users u
      LEFT JOIN routes r ON u.assigned_route_id = r.route_id
      WHERE u.id=? LIMIT 1
    `, [id])
      .then(([rows]: any) => rows[0] ? mapUser(rows[0]) : null);
  },

  getUsers(): Promise<User[]> {
    return query(`
      SELECT u.*, r.route_name AS assigned_route_name
      FROM users u
      LEFT JOIN routes r ON u.assigned_route_id = r.route_id
      ORDER BY u.created_at DESC
    `)
      .then(rows => rows.map(mapUser));
  },

  async createUser(data: any, actor: User) {
    const hash = crypto.createHash('sha256').update(data.password).digest('hex');
    const count = (await query<any>('SELECT COUNT(*) AS c FROM users'))[0].c;
    const id = count + 1;
    const assignedRouteId = (data.role === 'agent' && data.assignedRouteId) ? data.assignedRouteId : null;
    await execute(
      `INSERT INTO users (username,password_hash,full_name,email,role,status,assigned_route_id)
       VALUES (?,?,?,?,?,?,?)`,
      [data.username, hash, data.fullName, data.email, data.role || 'staff', data.status || 'active', assignedRouteId]
    );
    const r = await queryOne<any>('SELECT * FROM users WHERE username=?', [data.username]);
    if (r && assignedRouteId) {
      await execute('UPDATE routes SET assigned_agent_id=? WHERE route_id=?', [r.id, assignedRouteId]);
    }
    await db.logAudit(actor.id, actor.username, 'CREATE_USER', 'USERS', String(r ? r.id : id), null, data);
    return db.getUserById(r.id);
  },

  async updateUser(id: number | string, data: any, actor: User) {
    const fields: string[] = [];
    const params: any[] = [];
    if (data.fullName !== undefined) { fields.push('full_name=?'); params.push(data.fullName); }
    if (data.email !== undefined) { fields.push('email=?'); params.push(data.email); }
    if (data.role !== undefined) { fields.push('role=?'); params.push(data.role); }
    if (data.status !== undefined) { fields.push('status=?'); params.push(data.status); }
    if (data.assignedRouteId !== undefined) {
      fields.push('assigned_route_id=?');
      params.push(data.assignedRouteId || null);
    }
    if (data.password) {
      fields.push('password_hash=?');
      params.push(crypto.createHash('sha256').update(data.password).digest('hex'));
    }
    if (fields.length > 0) {
      params.push(id);
      await execute(`UPDATE users SET ${fields.join(',')} WHERE id=?`, params);
    }
    if (data.assignedRouteId !== undefined) {
      // Clear any route that was previously assigned to this agent
      await execute('UPDATE routes SET assigned_agent_id=NULL WHERE assigned_agent_id=?', [id]);
      if (data.assignedRouteId) {
        // Assign this agent to the new route
        await execute('UPDATE routes SET assigned_agent_id=? WHERE route_id=?', [id, data.assignedRouteId]);
      }
    }
    await db.logAudit(actor.id, actor.username, 'UPDATE_USER', 'USERS', String(id), null, data);
    const r = await db.getUserById(Number(id));
    return r!;
  },

  async updateLastLogin(userId: number) {
    await execute('UPDATE users SET last_login=NOW() WHERE id=?', [userId]);
  },

  // ---- SETTINGS ----
  getSettings(): Promise<CompanySettings> {
    return queryOne<any>('SELECT * FROM company_settings WHERE id=1').then(r => r ? mapSettings(r) : {} as CompanySettings);
  },

  async updateSettings(data: Partial<CompanySettings>) {
    await execute(`UPDATE company_settings SET
      company_name=?, address=?, phone=?, email=?,
      currency_symbol=?, financial_year=?,
      default_commission_percent=?, receipt_prefix=?,
      customer_id_prefix=?, membership_id_prefix=?
      WHERE id=1`,
      [data.companyName, data.address, data.phone, data.email,
      data.currencySymbol, data.financialYear,
      data.defaultCommissionPercent ?? data.defaultForemanCommissionPercent ?? 5,
      data.receiptPrefix, data.customerIdPrefix, data.membershipIdPrefix]
    );
    return db.getSettings();
  },

  // ---- CUSTOMERS ----
  getCustomers(search?: string, status?: string, routeId?: string, agentUserId?: number | string): Promise<Customer[]> {
    return customerDbMethods.getCustomers(search, status, routeId, agentUserId);
  },

  getCustomerById(id: string): Promise<Customer | null> {
    return customerDbMethods.getCustomerById(id);
  },

  createCustomer(data: any, actor: User): Promise<Customer> {
    return customerDbMethods.createCustomer(data, actor);
  },

  updateCustomer(id: string, data: Partial<Customer>, actor?: User): Promise<Customer> {
    return customerDbMethods.updateCustomer(id, data, actor);
  },

  // ---- CHIT GROUPS ----
  getChitGroups(status?: string): Promise<ChitGroup[]> {
    let sql = `SELECT cg.*,
      (SELECT COUNT(*) FROM memberships m WHERE m.group_id=cg.group_id AND m.status='active') AS current_members_count
      FROM chit_groups cg WHERE 1=1`;
    const p: any[] = [];
    if (status) { sql += ' AND cg.status=?'; p.push(status); }
    sql += ' ORDER BY cg.created_at DESC';
    return query<any>(sql, p).then(rows => rows.map(mapGroup));
  },

  getChitGroupById(id: string): Promise<ChitGroup | null> {
    return queryOne<any>(`SELECT cg.*,
      (SELECT COUNT(*) FROM memberships m WHERE m.group_id=cg.group_id AND m.status='active') AS current_members_count
      FROM chit_groups cg WHERE cg.group_id=?`, [id]).then(r => r ? mapGroup(r) : null);
  },

  async createChitGroup(data: Partial<ChitGroup>, actor: User): Promise<ChitGroup> {
    const gid = data.groupId?.trim().toUpperCase() ?? `GRP-${Date.now()}`;
    await execute(`INSERT INTO chit_groups
      (group_id,group_name,chit_value,num_members,monthly_installment,duration_months,
       start_date,end_date,auction_day_of_month,auction_frequency,
       foreman_commission_percent,status,description)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [gid, data.groupName, data.chitValue, data.numMembers,
        data.monthlyInstallment ?? round2((data.chitValue ?? 0) / (data.durationMonths ?? 1)),
        data.durationMonths, data.startDate, data.endDate ?? data.startDate,
        data.auctionDayOfMonth ?? 10, data.auctionFrequency ?? 'Monthly',
        data.foremanCommissionPercent ?? 5, data.status ?? 'Upcoming',
        data.description ?? null]
    );
    await db.logAudit(actor.id, actor.username, 'CREATE_GROUP', 'CHIT_GROUPS', gid, null, data);
    return (await db.getChitGroupById(gid))!;
  },

  async updateChitGroup(id: string, data: Partial<ChitGroup>, actor: User): Promise<ChitGroup> {
    const old = await db.getChitGroupById(id);
    await execute(`UPDATE chit_groups SET
      group_name=?,chit_value=?,num_members=?,monthly_installment=?,duration_months=?,
      start_date=?,end_date=?,auction_day_of_month=?,auction_frequency=?,
      foreman_commission_percent=?,status=?,description=?
      WHERE group_id=?`,
      [data.groupName, data.chitValue, data.numMembers,
      data.monthlyInstallment ?? round2((data.chitValue ?? 0) / (data.durationMonths ?? 1)),
      data.durationMonths, data.startDate, data.endDate,
      data.auctionDayOfMonth ?? 10, data.auctionFrequency ?? 'Monthly',
      data.foremanCommissionPercent ?? 5, data.status ?? 'Upcoming',
      data.description ?? null, id]
    );
    await db.logAudit(actor.id, actor.username, 'UPDATE_GROUP', 'CHIT_GROUPS', id, old, data);
    return (await db.getChitGroupById(id))!;
  },

  // ---- MEMBERSHIPS ----
  getMemberships(groupId?: string, customerId?: string, agentUserId?: number | string): Promise<Membership[]> {
    let sql = `SELECT m.*,
      c.full_name AS customer_name, c.mobile_number AS customer_mobile, c.dob, c.address, c.nominee_name, c.nominee_relationship,
      cg.group_name, cg.group_id AS group_no, cg.chit_value, cg.num_members AS total_members, cg.duration_months, cg.monthly_installment AS monthly_subscription
      FROM memberships m
      LEFT JOIN customers c ON m.customer_id=c.customer_id
      LEFT JOIN chit_groups cg ON m.group_id=cg.group_id
      WHERE 1=1`;
    const p: any[] = [];
    if (groupId && groupId !== 'ALL') { sql += ' AND m.group_id=?'; p.push(groupId); }
    if (customerId && customerId !== 'ALL') { sql += ' AND m.customer_id=?'; p.push(customerId); }
    if (agentUserId) {
      sql += ` AND (
        (c.route_id IS NOT NULL AND c.route_id = (SELECT assigned_route_id FROM users WHERE id=?))
        OR EXISTS (SELECT 1 FROM payments p WHERE p.customer_id = m.customer_id AND p.collected_by_user_id = ?)
      )`;
      p.push(agentUserId, agentUserId);
    }
    sql += ' ORDER BY m.created_at DESC';
    return query<any>(sql, p).then(rows => rows.map(mapMembership));
  },

  getMembershipById(id: string): Promise<Membership | null> {
    return queryOne<any>(`SELECT m.*,
      c.full_name AS customer_name, c.mobile_number AS customer_mobile, c.dob, c.address, c.nominee_name, c.nominee_relationship,
      cg.group_name, cg.group_id AS group_no, cg.chit_value, cg.num_members AS total_members, cg.duration_months, cg.monthly_installment AS monthly_subscription
      FROM memberships m
      LEFT JOIN customers c ON m.customer_id=c.customer_id
      LEFT JOIN chit_groups cg ON m.group_id=cg.group_id
      WHERE m.membership_id=?`, [id]).then(r => r ? mapMembership(r) : null);
  },

  async createMembership(data: any, actor: User): Promise<Membership> {
    const { customerId, groupId, ticketNumber, joiningDate, isDuplicateAllowed } = data;
    const customer = await db.getCustomerById(customerId);
    const group = await db.getChitGroupById(groupId);
    if (!customer) throw new Error('Customer not found');
    if (!group) throw new Error('Chit group not found');

    const maxMem = await queryOne<any>(`
      SELECT membership_id FROM memberships 
      WHERE membership_id REGEXP '^MEM-[0-9]+$' 
      ORDER BY CAST(SUBSTRING(membership_id, 5) AS UNSIGNED) DESC 
      LIMIT 1
    `);
    let nextMemNum = 1;
    if (maxMem?.membership_id) {
      const parsed = parseInt(maxMem.membership_id.replace('MEM-', ''), 10);
      if (!isNaN(parsed) && parsed >= 1) {
        nextMemNum = parsed + 1;
      }
    }
    let mid = `MEM-${String(nextMemNum).padStart(3, '0')}`;
    while (await queryOne('SELECT 1 FROM memberships WHERE membership_id = ?', [mid])) {
      nextMemNum++;
      mid = `MEM-${String(nextMemNum).padStart(3, '0')}`;
    }

    // Duplicate membership check unless explicitly allowed
    if (!isDuplicateAllowed) {
      const existing = await queryOne<any>(
        'SELECT membership_id, ticket_number FROM memberships WHERE customer_id = ? AND group_id = ? AND status = "active"',
        [customerId, groupId]
      );
      if (existing) {
        throw new Error(`Subscriber already has active ticket #${existing.ticket_number} (${existing.membership_id}) in this chit scheme.`);
      }
    }

    // Auto-assign next available ticket
    let ticket = ticketNumber;
    if (!ticket) {
      const usedRows = await query<any>('SELECT ticket_number FROM memberships WHERE group_id=?', [groupId]);
      const used = new Set(usedRows.map((r: any) => r.ticket_number));
      for (let t = 1; t <= group.numMembers; t++) {
        if (!used.has(t)) { ticket = t; break; }
      }
      if (!ticket) throw new Error('No available ticket slots in this chit group');
    }

    const totalPending = round2(group.monthlyInstallment * group.durationMonths);
    await execute(`INSERT INTO memberships
      (membership_id,customer_id,group_id,ticket_number,joining_date,
       installment_amount,total_installments,paid_installments,pending_installments,
       total_paid,total_pending,status,is_duplicate_allowed)
      VALUES (?,?,?,?,?,?,?,0,?,0.00,?,?,?)`,
      [mid, customerId, groupId, ticket,
        joiningDate ?? today(),
        group.monthlyInstallment, group.durationMonths,
        group.durationMonths, totalPending, 'active',
        isDuplicateAllowed ? 1 : 0]
    );

    // Generate installment records for all months
    for (let m = 1; m <= group.durationMonths; m++) {
      const due = new Date(joiningDate ?? today());
      due.setMonth(due.getMonth() + (m - 1));
      due.setDate(group.auctionDayOfMonth);
      const iid = `INST-${mid}-${String(m).padStart(2, '0')}`;
      await execute(`INSERT IGNORE INTO installments
        (installment_id,membership_id,customer_id,group_id,month_number,
         due_date,installment_amount,dividend_deduction,net_due_amount,status)
        VALUES (?,?,?,?,?,?,?,0,?,'Pending')`,
        [iid, mid, customerId, groupId, m,
          due.toISOString().split('T')[0],
          group.monthlyInstallment, group.monthlyInstallment]
      );
    }

    await db.logAudit(actor.id, actor.username, 'CREATE_MEMBERSHIP', 'MEMBERSHIPS', mid, null, data);
    return (await db.getMembershipById(mid))!;
  },

  // ---- INSTALLMENTS ----
  getInstallments(filters?: { customerId?: string; groupId?: string; membershipId?: string; status?: string }): Promise<Installment[]> {
    let sql = `SELECT i.*, c.full_name AS customer_name, cg.group_name, m.ticket_number
      FROM installments i
      LEFT JOIN customers c ON i.customer_id=c.customer_id
      LEFT JOIN chit_groups cg ON i.group_id=cg.group_id
      LEFT JOIN memberships m ON i.membership_id=m.membership_id
      WHERE 1=1`;
    const p: any[] = [];
    if (filters?.customerId) { sql += ' AND i.customer_id=?'; p.push(filters.customerId); }
    if (filters?.groupId) { sql += ' AND i.group_id=?'; p.push(filters.groupId); }
    if (filters?.membershipId) { sql += ' AND i.membership_id=?'; p.push(filters.membershipId); }
    if (filters?.status) { sql += ' AND i.status=?'; p.push(filters.status); }
    sql += ' ORDER BY i.due_date ASC';
    return query<any>(sql, p).then(rows => rows.map(mapInstallment));
  },

  getInstallmentById(id: string): Promise<Installment | null> {
    return queryOne<any>(`SELECT i.*, c.full_name AS customer_name, cg.group_name, m.ticket_number
      FROM installments i
      LEFT JOIN customers c ON i.customer_id=c.customer_id
      LEFT JOIN chit_groups cg ON i.group_id=cg.group_id
      LEFT JOIN memberships m ON i.membership_id=m.membership_id
      WHERE i.installment_id=?`, [id]).then(r => r ? mapInstallment(r) : null);
  },

  // ---- PAYMENTS ----
  getPayments(filters?: { customerId?: string; groupId?: string; membershipId?: string; status?: string }): Promise<Payment[]> {
    let sql = `SELECT p.*,
      c.full_name AS customer_name, cg.group_name,
      u.full_name AS collected_by_name, m.ticket_number,
      i.month_number
      FROM payments p
      LEFT JOIN customers c ON p.customer_id=c.customer_id
      LEFT JOIN chit_groups cg ON p.group_id=cg.group_id
      LEFT JOIN users u ON p.collected_by_user_id=u.id
      LEFT JOIN memberships m ON p.membership_id=m.membership_id
      LEFT JOIN installments i ON p.installment_id=i.installment_id
      WHERE 1=1`;
    const p: any[] = [];
    if (filters?.customerId) { sql += ' AND p.customer_id=?'; p.push(filters.customerId); }
    if (filters?.groupId) { sql += ' AND p.group_id=?'; p.push(filters.groupId); }
    if (filters?.membershipId) { sql += ' AND p.membership_id=?'; p.push(filters.membershipId); }
    if (filters?.status) { sql += ' AND p.status=?'; p.push(filters.status); }
    sql += ' ORDER BY p.payment_date DESC, p.created_at DESC';
    return query<any>(sql, p).then(rows => rows.map(mapPayment));
  },

  getPaymentById(receiptOrId: string): Promise<Payment | null> {
    return queryOne<any>(`SELECT p.*, c.full_name AS customer_name, cg.group_name,
      u.full_name AS collected_by_name, m.ticket_number, i.month_number
      FROM payments p
      LEFT JOIN customers c ON p.customer_id=c.customer_id
      LEFT JOIN chit_groups cg ON p.group_id=cg.group_id
      LEFT JOIN users u ON p.collected_by_user_id=u.id
      LEFT JOIN memberships m ON p.membership_id=m.membership_id
      LEFT JOIN installments i ON p.installment_id=i.installment_id
      WHERE p.receipt_number=? OR p.id=?`, [receiptOrId, receiptOrId])
      .then(r => r ? mapPayment(r) : null);
  },

  async recordPayment(data: any, actor: User): Promise<{ payment: Payment; receipt: PaymentReceipt }> {
    const inst = await db.getInstallmentById(data.installmentId);
    if (!inst) throw new Error('Installment not found');

    const mem = await db.getMembershipById(inst.membershipId);
    if (!mem) throw new Error('Membership not found');

    const group = await db.getChitGroupById(inst.groupId);
    const customer = await db.getCustomerById(inst.customerId);
    const settings = await db.getSettings();

    const prevBal = round2(inst.netDueAmount - inst.paidAmount);
    const paid = round2(Number(data.amountPaid));
    const remaining = round2(prevBal - paid);
    const newStatus = remaining <= 0 ? 'Paid' : paid > 0 ? 'Partially Paid' : inst.status;

    const countRow = await queryOne<any>('SELECT COUNT(*) AS c FROM payments');
    const rec = `${settings.receiptPrefix ?? 'REC'}-${new Date().getFullYear()}-${String((countRow?.c ?? 0) + 1).padStart(4, '0')}`;

    await execute(`INSERT INTO payments
      (receipt_number,installment_id,membership_id,customer_id,group_id,
       amount_paid,previous_balance,remaining_balance,payment_mode,
       transaction_reference,payment_date,collected_by_user_id,status,remarks)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [rec, inst.installmentId, inst.membershipId, inst.customerId, inst.groupId,
        paid, prevBal, Math.max(0, remaining),
        data.paymentMode ?? 'Cash', data.transactionReference ?? null,
        data.paymentDate ?? today(), actor.id, 'active', data.remarks ?? null]
    );

    // Update installment
    await execute(`UPDATE installments SET
      paid_amount=paid_amount+?, status=?, payment_date=?, payment_mode=?, receipt_number=?
      WHERE installment_id=?`,
      [paid, newStatus, data.paymentDate ?? today(), data.paymentMode ?? 'Cash', rec, inst.installmentId]
    );

    // Update membership totals
    await execute(`UPDATE memberships SET
      total_paid=total_paid+?,
      paid_installments=paid_installments+(CASE WHEN ?='Paid' THEN 1 ELSE 0 END),
      pending_installments=GREATEST(0,pending_installments-(CASE WHEN ?='Paid' THEN 1 ELSE 0 END)),
      total_pending=GREATEST(0,total_pending-?)
      WHERE membership_id=?`,
      [paid, newStatus, newStatus, paid, inst.membershipId]
    );

    await db.logAudit(actor.id, actor.username, 'RECORD_PAYMENT', 'PAYMENTS', rec, null, data);
    const payment = (await db.getPaymentById(rec))!;

    const receipt: PaymentReceipt = {
      receiptNumber: rec,
      paymentDate: data.paymentDate ?? today(),
      companyName: settings.companyName, companyAddress: settings.address,
      companyPhone: settings.phone, companyEmail: settings.email,
      currencySymbol: settings.currencySymbol ?? '₹',
      customerId: inst.customerId, customerName: customer?.fullName ?? '',
      customerMobile: customer?.mobileNumber ?? '',
      groupId: inst.groupId, groupName: group?.groupName ?? '',
      membershipId: inst.membershipId, ticketNumber: mem.ticketNumber,
      monthNumber: inst.monthNumber, installmentAmount: inst.installmentAmount,
      dividendDeduction: inst.dividendDeduction, netDueAmount: inst.netDueAmount,
      amountPaid: paid, previousBalance: prevBal,
      remainingBalance: Math.max(0, remaining),
      paymentMode: data.paymentMode ?? 'Cash',
      transactionReference: data.transactionReference,
      collectedByName: actor.fullName ?? actor.username,
      remarks: data.remarks,
    };

    return { payment, receipt };
  },

  async reversePayment(receiptNumber: string, reason: string, actor: User): Promise<{ message: string; payment: Payment }> {
    const pay = await db.getPaymentById(receiptNumber);
    if (!pay) throw new Error('Payment not found');
    await execute(`UPDATE payments SET status='reversed', reversal_reason=? WHERE receipt_number=?`, [reason, receiptNumber]);
    await execute(`UPDATE installments SET paid_amount=GREATEST(0,paid_amount-?), status='Pending' WHERE installment_id=?`,
      [pay.amountPaid, pay.installmentId]);
    await execute(`UPDATE memberships SET total_paid=GREATEST(0,total_paid-?), total_pending=total_pending+? WHERE membership_id=?`,
      [pay.amountPaid, pay.amountPaid, pay.membershipId]);
    await db.logAudit(actor.id, actor.username, 'REVERSE_PAYMENT', 'PAYMENTS', receiptNumber, pay, { reason });
    return { message: 'Payment reversed', payment: (await db.getPaymentById(receiptNumber))! };
  },

  // ---- AUCTIONS ----
  getAuctions(groupId?: string): Promise<Auction[]> {
    let sql = `SELECT a.*, cg.group_name, c.full_name AS winner_customer_name
      FROM auctions a
      LEFT JOIN chit_groups cg ON a.group_id=cg.group_id
      LEFT JOIN customers c ON a.winner_customer_id=c.customer_id
      WHERE 1=1`;
    const p: any[] = [];
    if (groupId) { sql += ' AND a.group_id=?'; p.push(groupId); }
    sql += ' ORDER BY a.auction_date DESC';
    return query<any>(sql, p).then(rows => rows.map(mapAuction));
  },

  async calculateAuction(data: { chitValue: number; bidDiscountAmount: number; numMembers: number; commissionPercent?: number }) {
    const { chitValue, bidDiscountAmount, numMembers, commissionPercent = 5 } = data;
    const prizeAmount = round2(chitValue - bidDiscountAmount);
    const foremanCommission = round2(bidDiscountAmount * (commissionPercent / 100));
    const distributable = round2(bidDiscountAmount - foremanCommission);
    const dividendPerMember = round2(distributable / numMembers);
    return { chitValue, bidDiscountAmount, prizeAmount, foremanCommission, distributableDividend: distributable, numMembers, dividendPerMember };
  },

  async recordAuction(data: any, actor: User) {
    const group = await db.getChitGroupById(data.groupId);
    if (!group) throw new Error('Chit group not found');
    const mem = await db.getMembershipById(data.winnerMembershipId);
    if (!mem) throw new Error('Winner membership not found');

    const calc = await db.calculateAuction({
      chitValue: group.chitValue, bidDiscountAmount: data.bidDiscountAmount,
      numMembers: group.numMembers, commissionPercent: data.commissionPercent ?? group.foremanCommissionPercent,
    });

    const countRow = await queryOne<any>('SELECT COUNT(*) AS c FROM auctions');
    const aid = `AUC-${new Date().getFullYear()}-${String((countRow?.c ?? 0) + 1).padStart(3, '0')}`;

    await execute(`INSERT INTO auctions
      (auction_id,group_id,auction_number,auction_date,chit_value,
       bid_discount_amount,prize_amount,foreman_commission,dividend_amount,
       dividend_per_member,winner_membership_id,winner_customer_id,ticket_number,status,remarks)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [aid, data.groupId, data.auctionNumber, data.auctionDate, group.chitValue,
        data.bidDiscountAmount, calc.prizeAmount, calc.foremanCommission,
        calc.distributableDividend, calc.dividendPerMember,
        data.winnerMembershipId, mem.customerId, mem.ticketNumber,
        'Completed', data.remarks ?? null]
    );

    // Dividend record
    const dcountRow = await queryOne<any>('SELECT COUNT(*) AS c FROM dividends');
    const did = `DIV-${new Date().getFullYear()}-${String((dcountRow?.c ?? 0) + 1).padStart(3, '0')}`;
    await execute(`INSERT INTO dividends
      (dividend_id,auction_id,group_id,total_discount,foreman_commission,
       distributable_dividend,num_eligible_members,dividend_per_member,month_number,status,confirmed_by_user_id)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [did, aid, data.groupId, data.bidDiscountAmount, calc.foremanCommission,
        calc.distributableDividend, group.numMembers, calc.dividendPerMember,
        data.auctionNumber, 'Confirmed', actor.id]
    );

    // Prize payment record
    const pcountRow = await queryOne<any>('SELECT COUNT(*) AS c FROM prize_payments');
    const pid = `PPY-${new Date().getFullYear()}-${String((pcountRow?.c ?? 0) + 1).padStart(3, '0')}`;
    await execute(`INSERT INTO prize_payments
      (prize_payment_id,auction_id,group_id,winner_customer_id,winner_membership_id,
       ticket_number,auction_number,chit_value,discount_amount,prize_amount,payment_status)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [pid, aid, data.groupId, mem.customerId, data.winnerMembershipId,
        mem.ticketNumber, data.auctionNumber, group.chitValue,
        data.bidDiscountAmount, calc.prizeAmount, 'Pending']
    );

    // Mark winner membership as prized
    await execute(`UPDATE memberships SET status='prized' WHERE membership_id=?`, [data.winnerMembershipId]);

    // Apply dividend deduction to next month's installments
    if (data.applyDividendToNextMonth) {
      await execute(`UPDATE installments SET
        dividend_deduction=?, net_due_amount=GREATEST(0,installment_amount-?)
        WHERE group_id=? AND month_number=? AND status='Pending'`,
        [calc.dividendPerMember, calc.dividendPerMember, data.groupId, data.auctionNumber + 1]
      );
    }

    await db.logAudit(actor.id, actor.username, 'RECORD_AUCTION', 'AUCTIONS', aid, null, data);

    const auction = (await db.getAuctions(data.groupId)).find(a => a.auctionId === aid)!;
    const dividendRec = (await db.getDividends(data.groupId)).find(d => d.dividendId === did)!;
    const prizePayment = (await db.getPrizePayments()).find(p => p.prizePaymentId === pid)!;

    return { auction, dividend: dividendRec, prizePayment };
  },

  // ---- DIVIDENDS ----
  getDividends(groupId?: string): Promise<DividendDistribution[]> {
    let sql = `SELECT d.*, cg.group_name
      FROM dividends d LEFT JOIN chit_groups cg ON d.group_id=cg.group_id WHERE 1=1`;
    const p: any[] = [];
    if (groupId) { sql += ' AND d.group_id=?'; p.push(groupId); }
    sql += ' ORDER BY d.created_at DESC';
    return query<any>(sql, p).then(rows => rows.map(mapDividend));
  },

  // ---- PRIZE PAYMENTS ----
  getPrizePayments(status?: string): Promise<PrizePayment[]> {
    let sql = `SELECT pp.*, cg.group_name, c.full_name AS winner_customer_name
      FROM prize_payments pp
      LEFT JOIN chit_groups cg ON pp.group_id=cg.group_id
      LEFT JOIN customers c ON pp.winner_customer_id=c.customer_id
      WHERE 1=1`;
    const p: any[] = [];
    if (status) { sql += ' AND pp.payment_status=?'; p.push(status); }
    sql += ' ORDER BY pp.created_at DESC';
    return query<any>(sql, p).then(rows => rows.map(mapPrizePayment));
  },

  async disbursePrize(prizePaymentId: string, data: any, actor: User): Promise<PrizePayment> {
    await execute(`UPDATE prize_payments SET
      paid_amount=paid_amount+?,disbursal_date=?,
      payment_mode=?,transaction_reference=?,remarks=?,
      payment_status=CASE WHEN paid_amount+?>= prize_amount THEN 'Paid' ELSE 'Partially Paid' END
      WHERE prize_payment_id=?`,
      [data.amountToDisburse, data.disbursalDate ?? today(),
      data.paymentMode, data.transactionReference ?? null, data.remarks ?? null,
      data.amountToDisburse, prizePaymentId]
    );
    await db.logAudit(actor.id, actor.username, 'DISBURSE_PRIZE', 'PRIZE_PAYMENTS', prizePaymentId, null, data);
    const r = await queryOne<any>(`SELECT pp.*, cg.group_name, c.full_name AS winner_customer_name
      FROM prize_payments pp
      LEFT JOIN chit_groups cg ON pp.group_id=cg.group_id
      LEFT JOIN customers c ON pp.winner_customer_id=c.customer_id
      WHERE pp.prize_payment_id=?`, [prizePaymentId]);
    return mapPrizePayment(r!);
  },

  // ---- EXPENSES ----
  getExpenses(category?: string, startDate?: string, endDate?: string): Promise<Expense[]> {
    let sql = `SELECT e.*, u.full_name AS created_by_name
      FROM expenses e LEFT JOIN users u ON e.created_by_user_id=u.id WHERE 1=1`;
    const p: any[] = [];
    if (category) { sql += ' AND e.category=?'; p.push(category); }
    if (startDate) { sql += ' AND e.expense_date>=?'; p.push(startDate); }
    if (endDate) { sql += ' AND e.expense_date<=?'; p.push(endDate); }
    sql += ' ORDER BY e.expense_date DESC';
    return query<any>(sql, p).then(rows => rows.map(mapExpense));
  },

  async createExpense(data: Partial<Expense>, actor: User): Promise<Expense> {
    const countRow = await queryOne<any>('SELECT COUNT(*) AS c FROM expenses');
    const eid = `EXP-${new Date().getFullYear()}-${String((countRow?.c ?? 0) + 1).padStart(4, '0')}`;
    await execute(`INSERT INTO expenses
      (expense_id,expense_date,category,description,amount,payment_mode,reference_number,remarks,created_by_user_id)
      VALUES (?,?,?,?,?,?,?,?,?)`,
      [eid, data.expenseDate ?? today(), data.category, data.description,
        data.amount, data.paymentMode ?? 'Cash', data.referenceNumber ?? null,
        data.remarks ?? null, actor.id]
    );
    await db.logAudit(actor.id, actor.username, 'CREATE_EXPENSE', 'EXPENSES', eid, null, data);
    const r = await queryOne<any>(`SELECT e.*, u.full_name AS created_by_name
      FROM expenses e LEFT JOIN users u ON e.created_by_user_id=u.id WHERE e.expense_id=?`, [eid]);
    return mapExpense(r!);
  },

  // ---- REPORTS ----
  async getCollectionReport(filters: any) {
    let sql = `SELECT p.*, c.full_name AS customer_name, cg.group_name,
      u.full_name AS collected_by_name, m.ticket_number, i.month_number
      FROM payments p
      LEFT JOIN customers c ON p.customer_id=c.customer_id
      LEFT JOIN chit_groups cg ON p.group_id=cg.group_id
      LEFT JOIN users u ON p.collected_by_user_id=u.id
      LEFT JOIN memberships m ON p.membership_id=m.membership_id
      LEFT JOIN installments i ON p.installment_id=i.installment_id
      WHERE p.status='active'`;
    const p: any[] = [];
    if (filters.startDate) { sql += ' AND p.payment_date>=?'; p.push(filters.startDate); }
    if (filters.endDate) { sql += ' AND p.payment_date<=?'; p.push(filters.endDate); }
    if (filters.paymentMode) { sql += ' AND p.payment_mode=?'; p.push(filters.paymentMode); }
    if (filters.groupId) { sql += ' AND p.group_id=?'; p.push(filters.groupId); }
    sql += ' ORDER BY p.payment_date DESC';
    const rows = await query<any>(sql, p);
    const payments = rows.map(mapPayment);
    const totalCollected = payments.reduce((s, r) => s + r.amountPaid, 0);
    const byMode: Record<string, number> = {};
    payments.forEach(py => { byMode[py.paymentMode] = (byMode[py.paymentMode] ?? 0) + py.amountPaid; });
    return { totalCount: payments.length, totalCollected: round2(totalCollected), byMode, payments };
  },

  async getOutstandingReport(groupId?: string) {
    let sql = `SELECT i.*, c.full_name AS customer_name, c.mobile_number, cg.group_name, m.ticket_number
      FROM installments i
      LEFT JOIN customers c ON i.customer_id=c.customer_id
      LEFT JOIN chit_groups cg ON i.group_id=cg.group_id
      LEFT JOIN memberships m ON i.membership_id=m.membership_id
      WHERE i.status IN ('Pending','Partially Paid','Overdue') AND (i.net_due_amount - i.paid_amount) > 0`;
    const p: any[] = [];
    if (groupId && groupId !== 'all') { sql += ' AND i.group_id=?'; p.push(groupId); }
    sql += ' ORDER BY i.due_date ASC';
    const rows = await query<any>(sql, p);

    const todayStr = today();
    const defaulters = rows.map((r: any) => {
      const isOverdue = String(r.due_date).slice(0, 10) < todayStr;
      const balanceAmount = round2(Number(r.net_due_amount || 0) - Number(r.paid_amount || 0));
      return {
        installmentId: r.installment_id,
        id: r.installment_id,
        customerId: r.customer_id,
        customerName: r.customer_name || 'Subscriber',
        mobileNumber: r.mobile_number || '',
        groupName: r.group_name || r.group_id,
        ticketNumber: r.ticket_number || 1,
        monthNumber: r.month_number || 1,
        dueDate: r.due_date ? String(r.due_date).slice(0, 10) : todayStr,
        netDueAmount: Number(r.net_due_amount || 0),
        balanceAmount,
        status: isOverdue ? 'Overdue' : (r.status || 'Pending')
      };
    });

    const totalOutstanding = round2(defaulters.reduce((s, d) => s + d.balanceAmount, 0));
    const overdueList = defaulters.filter(d => d.status === 'Overdue');
    const overdueAmount = round2(overdueList.reduce((s, d) => s + d.balanceAmount, 0));

    return {
      totalOutstanding,
      installmentsCount: defaulters.length,
      overdueCount: overdueList.length,
      overdueAmount,
      defaulters,
      records: defaulters
    };
  },

  async getChitGroupsReport() {
    const groups = await db.getChitGroups();
    return Promise.all(groups.map(async g => {
      const expected = await queryOne<any>('SELECT COALESCE(SUM(net_due_amount),0) AS v FROM installments WHERE group_id=?', [g.groupId]);
      const collected = await queryOne<any>("SELECT COALESCE(SUM(amount_paid),0) AS v FROM payments WHERE group_id=? AND status='active'", [g.groupId]);
      return { ...g, totalExpected: +(expected?.v ?? 0), totalCollected: +(collected?.v ?? 0), totalPending: round2(+(expected?.v ?? 0) - +(collected?.v ?? 0)) };
    }));
  },

  async getAuctionsReport(groupId?: string) {
    const auctions = await db.getAuctions(groupId);
    return {
      auctions,
      totalPrizeDisbursed: round2(auctions.reduce((s, a) => s + a.prizeAmount, 0)),
      totalForemanCommission: round2(auctions.reduce((s, a) => s + a.foremanCommission, 0)),
      totalDividendDistributed: round2(auctions.reduce((s, a) => s + a.dividendAmount, 0)),
    };
  },

  // ---- DASHBOARD ----
  async getDashboardStats(): Promise<DashboardStats> {
    const [
      custRow, groupRow, chitValRow, collectedRow, pendingRow, auctionRow,
      recentPays, recentCusts, trendRows, groupSummary,
    ] = await Promise.all([
      queryOne<any>("SELECT COUNT(*) AS c FROM customers WHERE status='active'"),
      queryOne<any>("SELECT COUNT(*) AS c FROM chit_groups WHERE status='Active'"),
      queryOne<any>("SELECT COALESCE(SUM(chit_value),0) AS v FROM chit_groups WHERE status='Active'"),
      queryOne<any>("SELECT COALESCE(SUM(amount_paid),0) AS v FROM payments WHERE status='active'"),
      queryOne<any>("SELECT COALESCE(SUM(net_due_amount-paid_amount),0) AS v FROM installments WHERE status IN ('Pending','Partially Paid','Overdue')"),
      queryOne<any>("SELECT COUNT(*) AS c FROM auctions WHERE status='Scheduled'"),
      query<any>(`SELECT p.receipt_number,p.amount_paid,p.payment_date,p.payment_mode,
        c.full_name AS customer_name, cg.group_name,
        u.full_name AS collected_by_name, m.ticket_number, i.month_number
        FROM payments p
        LEFT JOIN customers c ON p.customer_id=c.customer_id
        LEFT JOIN chit_groups cg ON p.group_id=cg.group_id
        LEFT JOIN users u ON p.collected_by_user_id=u.id
        LEFT JOIN memberships m ON p.membership_id=m.membership_id
        LEFT JOIN installments i ON p.installment_id=i.installment_id
        WHERE p.status='active' ORDER BY p.created_at DESC LIMIT 5`),
      query<any>('SELECT * FROM customers ORDER BY created_at DESC LIMIT 5'),
      query<any>(`SELECT DATE_FORMAT(payment_date,'%b %Y') AS month,
        SUM(amount_paid) AS collected
        FROM payments WHERE status='active' AND payment_date>=DATE_SUB(CURDATE(),INTERVAL 6 MONTH)
        GROUP BY DATE_FORMAT(payment_date,'%Y-%m') ORDER BY MIN(payment_date)`),
      query<any>(`SELECT cg.group_name,
        COALESCE(SUM(CASE WHEN i.status='Paid' THEN i.paid_amount ELSE 0 END),0) AS collected,
        COALESCE(SUM(CASE WHEN i.status IN ('Pending','Overdue','Partially Paid') THEN (i.net_due_amount-i.paid_amount) ELSE 0 END),0) AS pending
        FROM chit_groups cg
        LEFT JOIN installments i ON cg.group_id=i.group_id
        WHERE cg.status='Active'
        GROUP BY cg.group_id,cg.group_name LIMIT 5`),
    ]);

    return {
      totalCustomers: +(custRow?.c ?? 0),
      activeChitGroups: +(groupRow?.c ?? 0),
      totalChitValue: +(chitValRow?.v ?? 0),
      monthlyCollectionExpected: 0,
      totalCollectedAmount: +(collectedRow?.v ?? 0),
      pendingAmount: +(pendingRow?.v ?? 0),
      upcomingAuctionsCount: +(auctionRow?.c ?? 0),
      recentPayments: recentPays.map(mapPayment),
      recentCustomers: recentCusts.map(mapCustomer),
      monthlyCollectionTrend: trendRows.map((r: any) => ({ month: r.month, collected: +(r.collected ?? 0), target: 0 })),
      pendingCollectionByGroup: groupSummary.map((r: any) => ({ groupName: r.group_name, pending: +(r.pending ?? 0), collected: +(r.collected ?? 0) })),
      groupPerformance: [],
    };
  },

  // ---- NOTIFICATIONS ----
  // Auto-generate smart notifications from live DB data, then return all unread
  async generateNotifications() {
    const todayStr = today();
    const in3Days = new Date(); in3Days.setDate(in3Days.getDate() + 3);
    const in3DaysStr = in3Days.toISOString().split('T')[0];

    // Helper: insert notification only if not already present for this related_id + type
    const upsertNotif = async (
      type: string, title: string, message: string,
      relatedId: string, dueDate?: string
    ) => {
      const existing = await queryOne<any>(
        'SELECT id FROM notifications WHERE type=? AND related_id=? AND is_read=0',
        [type, relatedId]
      );
      if (!existing) {
        const nid = `NOTIF-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        await execute(
          `INSERT IGNORE INTO notifications (notification_id,type,title,message,related_id,due_date,is_read)
           VALUES (?,?,?,?,?,?,0)`,
          [nid, type, title, message, relatedId, dueDate ?? null]
        );
      }
    };

    // 1. Overdue installments — past due date and still unpaid
    const overdueRows = await query<any>(`
      SELECT i.installment_id, i.due_date, i.net_due_amount, i.paid_amount,
             c.full_name AS customer_name, c.mobile_number,
             cg.group_name, m.ticket_number, i.month_number
      FROM installments i
      LEFT JOIN customers c ON i.customer_id = c.customer_id
      LEFT JOIN chit_groups cg ON i.group_id = cg.group_id
      LEFT JOIN memberships m ON i.membership_id = m.membership_id
      WHERE i.status IN ('Pending','Partially Paid')
        AND i.due_date < ?
      ORDER BY i.due_date ASC
      LIMIT 30`, [todayStr]);

    for (const r of overdueRows) {
      const balance = round2(+(r.net_due_amount ?? 0) - +(r.paid_amount ?? 0));
      await upsertNotif(
        'overdue_installment',
        `Overdue: ${r.customer_name}`,
        `${r.customer_name} (${r.group_name} | Ticket #${r.ticket_number}) has overdue installment for Month #${r.month_number}. Balance ₹${balance.toLocaleString()} due since ${r.due_date}.`,
        r.installment_id,
        r.due_date
      );
    }

    // 2. Installments due in next 3 days (upcoming reminders)
    const upcomingRows = await query<any>(`
      SELECT i.installment_id, i.due_date, i.net_due_amount,
             c.full_name AS customer_name, c.mobile_number,
             cg.group_name, m.ticket_number, i.month_number
      FROM installments i
      LEFT JOIN customers c ON i.customer_id = c.customer_id
      LEFT JOIN chit_groups cg ON i.group_id = cg.group_id
      LEFT JOIN memberships m ON i.membership_id = m.membership_id
      WHERE i.status = 'Pending'
        AND i.due_date BETWEEN ? AND ?
      ORDER BY i.due_date ASC
      LIMIT 20`, [todayStr, in3DaysStr]);

    for (const r of upcomingRows) {
      await upsertNotif(
        'upcoming_installment',
        `Due Soon: ${r.customer_name}`,
        `${r.customer_name} (${r.group_name} | Ticket #${r.ticket_number}) has installment of ₹${(+(r.net_due_amount ?? 0)).toLocaleString()} due on ${r.due_date} for Month #${r.month_number}.`,
        `upcoming-${r.installment_id}`,
        r.due_date
      );
    }

    // 3. Pending prize payments (winner not yet paid)
    const prizeRows = await query<any>(`
      SELECT pp.prize_payment_id, pp.prize_amount, pp.auction_number,
             c.full_name AS winner_name, cg.group_name
      FROM prize_payments pp
      LEFT JOIN customers c ON pp.winner_customer_id = c.customer_id
      LEFT JOIN chit_groups cg ON pp.group_id = cg.group_id
      WHERE pp.payment_status IN ('Pending','Partially Paid')
      LIMIT 10`);

    for (const r of prizeRows) {
      await upsertNotif(
        'pending_prize',
        `Prize Pending: ${r.winner_name}`,
        `${r.winner_name} won ₹${(+(r.prize_amount ?? 0)).toLocaleString()} in Auction #${r.auction_number} (${r.group_name}). Prize disbursement is pending.`,
        r.prize_payment_id
      );
    }

    // 4. Upcoming auctions scheduled in next 7 days
    const in7Days = new Date(); in7Days.setDate(in7Days.getDate() + 7);
    const auctionRows = await query<any>(`
      SELECT cg.group_id, cg.group_name, cg.auction_day_of_month, cg.chit_value
      FROM chit_groups cg
      WHERE cg.status = 'Active'
        AND DAY(?) >= cg.auction_day_of_month - 3
      LIMIT 10`, [in7Days.toISOString().split('T')[0]]);

    for (const r of auctionRows) {
      const auctionDate = new Date();
      auctionDate.setDate(r.auction_day_of_month);
      const aDateStr = auctionDate.toISOString().split('T')[0];
      await upsertNotif(
        'upcoming_auction',
        `Auction Due: ${r.group_name}`,
        `${r.group_name} has an auction scheduled around ${aDateStr} for chit value ₹${(+(r.chit_value ?? 0)).toLocaleString()}.`,
        `auction-${r.group_id}-${aDateStr}`,
        aDateStr
      );
    }
  },

  async getNotifications(): Promise<NotificationItem[]> {
    // Auto-generate fresh notifications before returning
    try { await db.generateNotifications(); } catch { /* non-blocking */ }
    return query<any>('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50')
      .then(rows => rows.map(mapNotification));
  },

  async markNotificationRead(id: string | number): Promise<NotificationItem> {
    await execute('UPDATE notifications SET is_read=1 WHERE id=?', [id]);
    const r = await queryOne<any>('SELECT * FROM notifications WHERE id=?', [id]);
    return mapNotification(r!);
  },

  // ---- AUDIT LOGS ----
  getAuditLogs(): Promise<AuditLog[]> {
    return query<any>('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 200')
      .then(rows => rows.map(mapAuditLog));
  },

  async logAudit(userId: number, username: string, action: string, module: string, recordId: string, oldVal: any, newVal: any) {
    try {
      await execute(`INSERT INTO audit_logs (user_id,username,action,module,record_id,old_value,new_value)
        VALUES (?,?,?,?,?,?,?)`,
        [userId, username, action, module, recordId,
          oldVal ? JSON.stringify(oldVal) : null,
          newVal ? JSON.stringify(newVal) : null]
      );
    } catch { /* non-blocking */ }
  },

  // ---- SEARCH ----
  async search(q: string) {
    const like = `%${q}%`;
    const [customers, groups, memberships, payments] = await Promise.all([
      query<any>('SELECT * FROM customers WHERE full_name LIKE ? OR mobile_number LIKE ? OR customer_id LIKE ? LIMIT 10', [like, like, like]),
      query<any>('SELECT * FROM chit_groups WHERE group_name LIKE ? OR group_id LIKE ? LIMIT 10', [like, like]),
      query<any>(`SELECT m.*, c.full_name AS customer_name, cg.group_name FROM memberships m
        LEFT JOIN customers c ON m.customer_id=c.customer_id
        LEFT JOIN chit_groups cg ON m.group_id=cg.group_id
        WHERE m.membership_id LIKE ? LIMIT 10`, [like]),
      query<any>(`SELECT p.*, c.full_name AS customer_name, cg.group_name FROM payments p
        LEFT JOIN customers c ON p.customer_id=c.customer_id
        LEFT JOIN chit_groups cg ON p.group_id=cg.group_id
        WHERE p.receipt_number LIKE ? LIMIT 10`, [like]),
    ]);
    return {
      customers: customers.map(mapCustomer),
      groups: groups.map(mapGroup),
      memberships: memberships.map(mapMembership),
      payments: payments.map(mapPayment),
    };
  },

  // ---- ROUTES (COLLECTION MANAGEMENT) ----
  async getRoutes(search?: string, status?: string): Promise<Route[]> {
    let sql = `
      SELECT r.*,
        u.full_name AS assigned_agent_name,
        u.username AS assigned_agent_username,
        (SELECT COUNT(*) FROM customers c WHERE c.route_id = r.route_id) AS customer_count
      FROM routes r
      LEFT JOIN users u ON r.assigned_agent_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (status && status !== 'all') {
      sql += ' AND r.status = ?';
      params.push(status);
    }
    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      sql += ' AND (r.route_name LIKE ? OR r.route_id LIKE ? OR r.area LIKE ? OR r.sub_localities LIKE ? OR u.full_name LIKE ?)';
      params.push(q, q, q, q, q);
    }
    sql += ' ORDER BY r.route_id ASC';
    const rows = await query<any>(sql, params);
    return rows.map((r: any) => ({
      id: r.id,
      routeId: r.route_id,
      routeName: r.route_name,
      city: r.city || 'Salem',
      area: r.area,
      subLocalities: r.sub_localities || '',
      assignedAgentId: r.assigned_agent_id || null,
      assignedAgentName: r.assigned_agent_name || null,
      assignedAgentUsername: r.assigned_agent_username || null,
      status: r.status,
      customerCount: Number(r.customer_count || 0),
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  },

  async getRouteById(idOrRouteId: string | number): Promise<Route | null> {
    const row = await queryOne<any>(`
      SELECT r.*,
        u.full_name AS assigned_agent_name,
        u.username AS assigned_agent_username,
        (SELECT COUNT(*) FROM customers c WHERE c.route_id = r.route_id) AS customer_count
      FROM routes r
      LEFT JOIN users u ON r.assigned_agent_id = u.id
      WHERE r.id = ? OR r.route_id = ?
      LIMIT 1
    `, [idOrRouteId, idOrRouteId]);
    if (!row) return null;
    return {
      id: row.id,
      routeId: row.route_id,
      routeName: row.route_name,
      city: row.city || 'Salem',
      area: row.area,
      subLocalities: row.sub_localities || '',
      assignedAgentId: row.assigned_agent_id || null,
      assignedAgentName: row.assigned_agent_name || null,
      assignedAgentUsername: row.assigned_agent_username || null,
      status: row.status,
      customerCount: Number(row.customer_count || 0),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  },

  async createRoute(data: any, actor?: User): Promise<Route> {
    let routeId = data.routeId;
    if (!routeId) {
      const countRow = await queryOne<any>('SELECT COUNT(*) AS c FROM routes');
      routeId = `RT-${String((countRow?.c || 0) + 1).padStart(3, '0')}`;
    }
    const agentId = data.assignedAgentId ? Number(data.assignedAgentId) : null;
    await execute(`
      INSERT INTO routes (route_id, route_name, city, area, sub_localities, assigned_agent_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      routeId,
      data.routeName,
      data.city || 'Salem',
      data.area || '',
      data.subLocalities || null,
      agentId,
      data.status || 'active'
    ]);

    if (agentId) {
      await execute('UPDATE users SET assigned_route_id = ? WHERE id = ?', [routeId, agentId]);
    }

    if (actor) {
      await db.logAudit(actor.id, actor.username, 'CREATE_ROUTE', 'ROUTES', routeId, null, data);
    }
    const created = await db.getRouteById(routeId);
    return created!;
  },

  async updateRoute(idOrRouteId: string | number, data: any, actor?: User): Promise<Route> {
    const existing = await db.getRouteById(idOrRouteId);
    if (!existing) throw new Error('Route not found');

    const fields: string[] = [];
    const params: any[] = [];
    if (data.routeName !== undefined) { fields.push('route_name = ?'); params.push(data.routeName); }
    if (data.city !== undefined) { fields.push('city = ?'); params.push(data.city); }
    if (data.area !== undefined) { fields.push('area = ?'); params.push(data.area); }
    if (data.subLocalities !== undefined) { fields.push('sub_localities = ?'); params.push(data.subLocalities); }
    if (data.status !== undefined) { fields.push('status = ?'); params.push(data.status); }

    const newAgentId = data.assignedAgentId !== undefined
      ? (data.assignedAgentId ? Number(data.assignedAgentId) : null)
      : undefined;

    if (newAgentId !== undefined) {
      fields.push('assigned_agent_id = ?');
      params.push(newAgentId);
    }

    if (fields.length > 0) {
      params.push(idOrRouteId, idOrRouteId);
      await execute(`UPDATE routes SET ${fields.join(', ')} WHERE id = ? OR route_id = ?`, params);
    }

    if (newAgentId !== undefined) {
      if (existing.assignedAgentId && existing.assignedAgentId !== newAgentId) {
        await execute('UPDATE users SET assigned_route_id = NULL WHERE id = ? AND assigned_route_id = ?', [existing.assignedAgentId, existing.routeId]);
      }
      if (newAgentId) {
        await execute('UPDATE users SET assigned_route_id = ? WHERE id = ?', [existing.routeId, newAgentId]);
      }
    }

    if (actor) {
      await db.logAudit(actor.id, actor.username, 'UPDATE_ROUTE', 'ROUTES', String(idOrRouteId), existing, data);
    }
    const updated = await db.getRouteById(idOrRouteId);
    return updated!;
  },

  async deleteRoute(idOrRouteId: string | number, actor?: User) {
    const existing = await db.getRouteById(idOrRouteId);
    if (!existing) throw new Error('Route not found');

    // Unassign customers and agents from this route
    await execute('UPDATE customers SET route_id = NULL WHERE route_id = ?', [existing.routeId]);
    await execute('UPDATE users SET assigned_route_id = NULL WHERE assigned_route_id = ?', [existing.routeId]);

    await execute('DELETE FROM routes WHERE id = ? OR route_id = ?', [idOrRouteId, idOrRouteId]);
    if (actor) {
      await db.logAudit(actor.id, actor.username, 'DELETE_ROUTE', 'ROUTES', String(idOrRouteId), existing, null);
    }
    return { message: 'Route deleted successfully' };
  },

  async getRouteCustomers(routeId: string): Promise<Customer[]> {
    return db.getCustomers(undefined, undefined, routeId);
  },

  // ---- DAILY HANDOVERS ----
  async createDailyHandover(data: any, actor?: User): Promise<DailyHandover> {
    const handoverId = `HO-${Date.now()}`;
    const agentUserId = (actor && actor.role === 'agent') ? actor.id : Number(data.agentUserId || (actor ? actor.id : 1));
    const handoverDate = data.handoverDate || today();
    const totalCash = round2(Number(data.totalCash || 0));
    const totalOnline = round2(Number(data.totalOnline || 0));
    const receiptsCount = Number(data.receiptsCount || 0);
    const declaredCash = round2(Number(data.declaredCash !== undefined ? data.declaredCash : totalCash));
    const discrepancy = round2(declaredCash - totalCash);
    const commissionAmount = round2(Number(data.commissionAmount !== undefined ? data.commissionAmount : (totalCash + totalOnline) * 0.05));

    await execute(`
      INSERT INTO daily_handovers
        (handover_id, agent_user_id, handover_date, total_cash, total_online,
         receipts_count, declared_cash, discrepancy, commission_amount,
         status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', ?)
    `, [
      handoverId, agentUserId, handoverDate, totalCash, totalOnline,
      receiptsCount, declaredCash, discrepancy, commissionAmount,
      data.notes || null
    ]);

    if (actor) {
      await db.logAudit(actor.id, actor.username, 'SUBMIT_HANDOVER', 'HANDOVERS', handoverId, null, data);
    }
    const r = await queryOne<any>(`
      SELECT dh.*, u.full_name AS agent_name
      FROM daily_handovers dh
      LEFT JOIN users u ON dh.agent_user_id = u.id
      WHERE dh.handover_id = ?
    `, [handoverId]);
    return {
      id: r.id,
      handoverId: r.handover_id,
      agentUserId: r.agent_user_id,
      agentName: r.agent_name,
      handoverDate: String(r.handover_date).slice(0, 10),
      totalCash: Number(r.total_cash),
      totalOnline: Number(r.total_online),
      receiptsCount: Number(r.receipts_count),
      declaredCash: Number(r.declared_cash),
      discrepancy: Number(r.discrepancy),
      commissionAmount: Number(r.commission_amount),
      status: r.status,
      verifiedByUserId: r.verified_by_user_id,
      verifiedByName: null,
      verifiedAt: r.verified_at,
      notes: r.notes,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  },

  async getDailyHandovers(filters?: { agentUserId?: number | string; status?: string; date?: string }): Promise<DailyHandover[]> {
    let sql = `
      SELECT dh.*,
        u.full_name AS agent_name,
        v.full_name AS verified_by_name
      FROM daily_handovers dh
      LEFT JOIN users u ON dh.agent_user_id = u.id
      LEFT JOIN users v ON dh.verified_by_user_id = v.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (filters?.agentUserId && filters.agentUserId !== 'ALL') {
      sql += ' AND dh.agent_user_id = ?';
      params.push(filters.agentUserId);
    }
    if (filters?.status && filters.status !== 'all') {
      sql += ' AND dh.status = ?';
      params.push(filters.status);
    }
    if (filters?.date) {
      sql += ' AND dh.handover_date = ?';
      params.push(filters.date);
    }
    sql += ' ORDER BY dh.handover_date DESC, dh.created_at DESC';
    const rows = await query<any>(sql, params);
    return rows.map((r: any) => ({
      id: r.id,
      handoverId: r.handover_id,
      agentUserId: r.agent_user_id,
      agentName: r.agent_name || 'Agent',
      handoverDate: String(r.handover_date).slice(0, 10),
      totalCash: Number(r.total_cash),
      totalOnline: Number(r.total_online),
      receiptsCount: Number(r.receipts_count),
      declaredCash: Number(r.declared_cash),
      discrepancy: Number(r.discrepancy),
      commissionAmount: Number(r.commission_amount),
      status: r.status,
      verifiedByUserId: r.verified_by_user_id,
      verifiedByName: r.verified_by_name || null,
      verifiedAt: r.verified_at ? String(r.verified_at) : null,
      notes: r.notes,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  },

  async verifyDailyHandover(idOrHandoverId: string | number, status: 'verified' | 'rejected', notes?: string, verifier?: User): Promise<DailyHandover> {
    const verifierId = verifier ? verifier.id : 1;
    await execute(`
      UPDATE daily_handovers
      SET status = ?, verified_by_user_id = ?, verified_at = NOW(), notes = COALESCE(?, notes)
      WHERE id = ? OR handover_id = ?
    `, [status, verifierId, notes || null, idOrHandoverId, idOrHandoverId]);

    if (verifier) {
      await db.logAudit(verifier.id, verifier.username, 'VERIFY_HANDOVER', 'HANDOVERS', String(idOrHandoverId), null, { status, notes });
    }
    const handovers = await db.getDailyHandovers();
    return handovers.find(h => String(h.id) === String(idOrHandoverId) || h.handoverId === String(idOrHandoverId))!;
  },

  // ---- AGENT PANEL (LIVE ROUTE-SCOPED) ----
  async getAgentProfile(userId?: number | string) {
    let user: any = null;
    if (userId) {
      user = await queryOne<any>(`
        SELECT u.*, r.route_id, r.route_name, r.area, r.city
        FROM users u
        LEFT JOIN routes r ON u.assigned_route_id = r.route_id
        WHERE u.id=? OR u.username=?
      `, [userId, userId]);
    }
    if (!user) {
      user = await queryOne<any>(`
        SELECT u.*, r.route_id, r.route_name, r.area, r.city
        FROM users u
        LEFT JOIN routes r ON u.assigned_route_id = r.route_id
        WHERE u.role='agent'
        ORDER BY u.id ASC LIMIT 1
      `);
    }

    let assignedCount = 0;
    if (user?.assigned_route_id) {
      const cRow = await queryOne<any>('SELECT COUNT(*) as c FROM customers WHERE route_id=?', [user.assigned_route_id]);
      assignedCount = Number(cRow?.c || 0);
    }

    return {
      id: user ? `agent-${user.id}` : 'agent-001',
      name: user?.full_name || user?.username || 'Field Agent',
      phone: user?.email || '',
      area: user?.route_name ? `${user.route_name} (${user.area || 'Salem'})` : 'No Route Assigned',
      routeId: user?.assigned_route_id || '',
      routeName: user?.route_name || '',
      assignedCustomers: assignedCount
    };
  },

  async getAgentSummary(monthStr?: string, userId?: number | string, role?: string) {
    const curDate = today();
    const curMonth = monthStr || curDate.slice(0, 7);

    // If agent role, verify assigned route
    let assignedRouteId: string | null = null;
    if (role === 'agent' && userId) {
      const u = await queryOne<any>('SELECT assigned_route_id FROM users WHERE id=? OR username=?', [userId, userId]);
      assignedRouteId = u?.assigned_route_id || null;
      if (!assignedRouteId) {
        // Agent has no route assigned -> return clean 0s!
        return {
          todayCashCollection: 0,
          todayOnlineCollection: 0,
          todayTotalCollection: 0,
          todayCustomersCollected: 0,
          todayPendingCollections: 0,
          todayOverdueCollections: 0,
          monthlyCollection: 0,
          monthlyTarget: 0,
          pendingBalance: 0,
          pendingCustomersCount: 0,
          commissionEarned: 0,
          commissionRate: 0.05,
          collectedInstallments: 0,
          pendingInstallments: 0,
          overdueInstallments: 0,
          remainingTargetAmount: 0,
          targetAchievedPercent: 0,
          month: curMonth
        };
      }
    }

    // Today's collections by this agent
    let todayPaySql = `
      SELECT
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'cash' THEN amount_paid ELSE 0 END), 0) AS cash,
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) != 'cash' THEN amount_paid ELSE 0 END), 0) AS online,
        COALESCE(SUM(amount_paid), 0) AS total,
        COUNT(DISTINCT customer_id) AS customers_collected
      FROM payments
      WHERE (LEFT(payment_date, 10) = CURDATE() OR DATE(payment_date) = CURDATE()) AND status = 'active'
    `;
    const todayPayParams: any[] = [];
    if (role === 'agent' && userId) {
      todayPaySql += ' AND collected_by_user_id = ?';
      todayPayParams.push(userId);
    }
    const todayPay = await queryOne<any>(todayPaySql, todayPayParams);

    // Dues for customers on this agent's route (or all if admin/staff)
    let todayInstSql = `
      SELECT
        COUNT(CASE WHEN DATE(i.due_date) = CURDATE() AND i.status != 'Paid' THEN 1 END) AS pending_today,
        COUNT(CASE WHEN DATE(i.due_date) < CURDATE() AND i.status != 'Paid' THEN 1 END) AS overdue_today
      FROM installments i
      ${assignedRouteId ? 'JOIN customers c ON i.customer_id = c.customer_id AND c.route_id = ?' : ''}
    `;
    const todayInstParams = assignedRouteId ? [assignedRouteId] : [];
    const todayInst = await queryOne<any>(todayInstSql, todayInstParams);

    // Monthly collection by this agent
    let monthPaySql = `
      SELECT COALESCE(SUM(amount_paid), 0) AS collected
      FROM payments
      WHERE (LEFT(payment_date, 7) = ? OR DATE_FORMAT(payment_date, '%Y-%m') = ?) AND status = 'active'
    `;
    const monthPayParams: any[] = [curMonth, curMonth];
    if (role === 'agent' && userId) {
      monthPaySql += ' AND collected_by_user_id = ?';
      monthPayParams.push(userId);
    }
    const monthPay = await queryOne<any>(monthPaySql, monthPayParams);

    // Monthly target and installments for route
    let monthInstSql = `
      SELECT
        COALESCE(SUM(i.net_due_amount), 0) AS target,
        COALESCE(SUM(CASE WHEN i.status != 'Paid' THEN (i.net_due_amount - i.paid_amount) ELSE 0 END), 0) AS pending_balance,
        COUNT(DISTINCT CASE WHEN i.status != 'Paid' THEN i.customer_id END) AS pending_customers,
        COUNT(CASE WHEN i.status = 'Paid' THEN 1 END) AS collected_inst,
        COUNT(CASE WHEN i.status = 'Pending' AND i.due_date >= CURDATE() THEN 1 END) AS pending_inst,
        COUNT(CASE WHEN i.status = 'Overdue' OR (i.status != 'Paid' AND i.due_date < CURDATE()) THEN 1 END) AS overdue_inst
      FROM installments i
      ${assignedRouteId ? 'JOIN customers c ON i.customer_id = c.customer_id AND c.route_id = ?' : ''}
      WHERE (LEFT(i.due_date, 7) = ? OR DATE_FORMAT(i.due_date, '%Y-%m') = ?)
    `;
    const monthInstParams = assignedRouteId ? [assignedRouteId, curMonth, curMonth] : [curMonth, curMonth];
    const monthInst = await queryOne<any>(monthInstSql, monthInstParams);

    const collected = Number(monthPay?.collected || 0);
    const target = Number(monthInst?.target || 0);
    const targetAchievedPercent = target > 0 ? Math.min(100, Math.round((collected / target) * 100)) : (collected > 0 ? 100 : 0);
    const remainingTargetAmount = Math.max(0, target - collected);
    const commissionRate = 0.05;
    const commissionEarned = round2(collected * commissionRate);

    return {
      todayCashCollection: Number(todayPay?.cash || 0),
      todayOnlineCollection: Number(todayPay?.online || 0),
      todayTotalCollection: Number(todayPay?.total || 0),
      todayCustomersCollected: Number(todayPay?.customers_collected || 0),
      todayPendingCollections: Number(todayInst?.pending_today || 0),
      todayOverdueCollections: Number(todayInst?.overdue_today || 0),
      monthlyCollection: collected,
      monthlyTarget: target,
      pendingBalance: Number(monthInst?.pending_balance || 0),
      pendingCustomersCount: Number(monthInst?.pending_customers || 0),
      commissionEarned,
      commissionRate,
      collectedInstallments: Number(monthInst?.collected_inst || 0),
      pendingInstallments: Number(monthInst?.pending_inst || 0),
      overdueInstallments: Number(monthInst?.overdue_inst || 0),
      remainingTargetAmount,
      targetAchievedPercent,
      month: curMonth
    };
  },

  async getAgentMonthlyTrend(userId?: number | string, role?: string) {
    const months: Array<{ key: string; label: string }> = [];
    const nowD = new Date();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(nowD.getFullYear(), nowD.getMonth() - i, 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ key: k, label: monthNames[d.getMonth()] });
    }

    let assignedRouteId: string | null = null;
    if (role === 'agent' && userId) {
      const u = await queryOne<any>('SELECT assigned_route_id FROM users WHERE id=? OR username=?', [userId, userId]);
      assignedRouteId = u?.assigned_route_id || null;
    }

    const trend = await Promise.all(
      months.map(async (m) => {
        let pSql = `
          SELECT COALESCE(SUM(amount_paid), 0) AS collected
          FROM payments
          WHERE (LEFT(payment_date, 7) = ? OR DATE_FORMAT(payment_date, '%Y-%m') = ?) AND status = 'active'
        `;
        const pParams: any[] = [m.key, m.key];
        if (role === 'agent' && userId) {
          pSql += ' AND collected_by_user_id = ?';
          pParams.push(userId);
        }
        const payRow = await queryOne<any>(pSql, pParams);

        let iSql = `
          SELECT COALESCE(SUM(i.net_due_amount), 0) AS target
          FROM installments i
          ${assignedRouteId ? 'JOIN customers c ON i.customer_id = c.customer_id AND c.route_id = ?' : ''}
          WHERE (LEFT(i.due_date, 7) = ? OR DATE_FORMAT(i.due_date, '%Y-%m') = ?)
        `;
        const iParams = assignedRouteId ? [assignedRouteId, m.key, m.key] : [m.key, m.key];
        const instRow = await queryOne<any>(iSql, iParams);

        const coll = Number(payRow?.collected || 0);
        const tgt = Number(instRow?.target || 0);
        return {
          month: m.key,
          label: m.label,
          collected: coll,
          target: tgt
        };
      })
    );
    return trend;
  },

  async getAgentCollectionSheet(filters?: { dateType?: string; customDate?: string; status?: string; search?: string }, userId?: number | string, role?: string) {
    let assignedRouteId: string | null = null;
    if (role === 'agent' && userId) {
      const u = await queryOne<any>('SELECT assigned_route_id FROM users WHERE id=? OR username=?', [userId, userId]);
      assignedRouteId = u?.assigned_route_id || null;
      if (!assignedRouteId) {
        return [];
      }
    }

    let sql = `
      SELECT
        i.installment_id,
        i.customer_id,
        c.full_name AS customer_name,
        COALESCE(c.mobile_number, '') AS phone,
        COALESCE(c.address, '') AS address,
        COALESCE(c.city, 'Salem') AS city,
        COALESCE(c.google_map_link, '') AS google_map_link,
        COALESCE(cg.group_name, i.group_id) AS chit_group_code,
        COALESCE(m.ticket_number, 1) AS ticket_number,
        i.due_date,
        i.net_due_amount AS due_installment_amount,
        i.paid_amount,
        GREATEST(0, (i.net_due_amount - i.paid_amount)) AS pending_balance,
        i.status AS raw_status,
        i.month_number AS current_installment
      FROM installments i
      JOIN customers c ON i.customer_id = c.customer_id
      LEFT JOIN memberships m ON i.membership_id = m.membership_id
      LEFT JOIN chit_groups cg ON i.group_id = cg.group_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (assignedRouteId) {
      sql += ' AND c.route_id = ?';
      params.push(assignedRouteId);
    }

    if (filters?.dateType === 'today') {
      sql += ' AND (i.due_date = CURDATE() OR (i.due_date < CURDATE() AND i.status != "Paid"))';
    } else if (filters?.dateType === 'custom' && filters.customDate) {
      sql += ' AND i.due_date = ?';
      params.push(filters.customDate);
    }

    if (filters?.status === 'paid') {
      sql += ' AND (i.status = "Paid" OR i.paid_amount >= i.net_due_amount)';
    } else if (filters?.status === 'pending') {
      sql += ' AND i.status != "Paid" AND i.paid_amount < i.net_due_amount AND i.due_date >= CURDATE()';
    } else if (filters?.status === 'overdue') {
      sql += ' AND i.status != "Paid" AND i.paid_amount < i.net_due_amount AND i.due_date < CURDATE()';
    }

    if (filters?.search?.trim()) {
      const q = `%${filters.search.trim()}%`;
      sql += ' AND (c.full_name LIKE ? OR c.mobile_number LIKE ? OR cg.group_name LIKE ? OR i.customer_id LIKE ? OR c.address LIKE ?)';
      params.push(q, q, q, q, q);
    }

    sql += ' ORDER BY i.due_date DESC, i.month_number ASC LIMIT 200';
    const rows = await query<any>(sql, params);

    const todayStr = today();
    return rows.map((r: any) => {
      const isPaid = r.raw_status === 'Paid' || Number(r.pending_balance) <= 0;
      const isOverdue = !isPaid && String(r.due_date) < todayStr;
      const status = isPaid ? 'paid' : isOverdue ? 'overdue' : 'pending';
      return {
        id: r.installment_id,
        customerId: r.customer_id,
        customerName: r.customer_name || 'Customer',
        phone: r.phone || '',
        address: r.address || '',
        city: r.city || 'Salem',
        googleMapLink: r.google_map_link || '',
        chitGroupCode: r.chit_group_code,
        ticketNumber: String(r.ticket_number),
        dueDate: r.due_date ? String(r.due_date).slice(0, 10) : todayStr,
        dueInstallmentAmount: Number(r.due_installment_amount || 0),
        paidAmount: Number(r.paid_amount || 0),
        pendingBalance: round2(Number(r.pending_balance || 0)),
        status,
        currentInstallment: Number(r.current_installment || 1)
      };
    });
  },

  async getAgentDueBills(userId?: number | string, role?: string) {
    let assignedRouteId: string | null = null;
    if (role === 'agent' && userId) {
      const u = await queryOne<any>('SELECT assigned_route_id FROM users WHERE id=? OR username=?', [userId, userId]);
      assignedRouteId = u?.assigned_route_id || null;
      if (!assignedRouteId) {
        return [];
      }
    }

    let sql = `
      SELECT
        i.installment_id,
        i.customer_id,
        c.full_name AS customer_name,
        COALESCE(c.mobile_number, '') AS phone,
        COALESCE(c.address, '') AS address,
        COALESCE(cg.group_name, i.group_id) AS chit_group_code,
        COALESCE(m.ticket_number, 1) AS ticket_number,
        i.month_number AS current_installment,
        i.net_due_amount AS due_amount,
        i.paid_amount,
        GREATEST(0, (i.net_due_amount - i.paid_amount)) AS outstanding_balance,
        i.due_date,
        i.status AS raw_status
      FROM installments i
      JOIN customers c ON i.customer_id = c.customer_id
      LEFT JOIN memberships m ON i.membership_id = m.membership_id
      LEFT JOIN chit_groups cg ON i.group_id = cg.group_id
      WHERE i.status != 'Paid' AND (i.net_due_amount - i.paid_amount) > 0
    `;
    const params: any[] = [];
    if (assignedRouteId) {
      sql += ' AND c.route_id = ?';
      params.push(assignedRouteId);
    }
    sql += ' ORDER BY i.due_date ASC, i.month_number ASC LIMIT 150';

    const rows = await query<any>(sql, params);
    const todayStr = today();

    return rows.map((r: any) => {
      const isOverdue = String(r.due_date) < todayStr;
      const status = isOverdue ? 'overdue' : 'pending';
      const arrears = isOverdue ? round2(Number(r.outstanding_balance)) : 0;
      return {
        id: r.installment_id,
        customerId: r.customer_id,
        customerName: r.customer_name || 'Customer',
        phone: r.phone || '',
        address: r.address || '',
        chitGroupCode: r.chit_group_code,
        ticketNumber: String(r.ticket_number),
        currentInstallment: Number(r.current_installment || 1),
        dueAmount: Number(r.due_amount || 0),
        paidAmount: Number(r.paid_amount || 0),
        outstandingBalance: round2(Number(r.outstanding_balance || 0)),
        arrears,
        dueDate: r.due_date ? String(r.due_date).slice(0, 10) : todayStr,
        status
      };
    });
  },

  async getAgentReceipts(userId?: number | string, role?: string) {
    let sql = `
      SELECT
        p.receipt_number,
        p.customer_id,
        c.full_name AS customer_name,
        COALESCE(c.mobile_number, '') AS phone,
        COALESCE(cg.group_name, p.group_id) AS chit_group_code,
        COALESCE(m.ticket_number, 1) AS ticket_number,
        p.amount_paid,
        p.payment_mode,
        p.payment_date,
        p.created_at,
        u.full_name AS agent_name,
        p.remaining_balance,
        p.remarks
      FROM payments p
      LEFT JOIN customers c ON p.customer_id = c.customer_id
      LEFT JOIN chit_groups cg ON p.group_id = cg.group_id
      LEFT JOIN memberships m ON p.membership_id = m.membership_id
      LEFT JOIN users u ON p.collected_by_user_id = u.id
      WHERE p.status = 'active'
    `;
    const params: any[] = [];
    if (role === 'agent' && userId) {
      sql += ' AND p.collected_by_user_id = ?';
      params.push(userId);
    }
    sql += ' ORDER BY p.payment_date DESC, p.created_at DESC LIMIT 150';

    const rows = await query<any>(sql, params);
    return rows.map((r: any) => ({
      receiptNumber: r.receipt_number,
      customerId: r.customer_id,
      customerName: r.customer_name || 'Customer',
      phone: r.phone || '',
      chitGroupCode: r.chit_group_code,
      ticketNumber: String(r.ticket_number),
      amountCollected: Number(r.amount_paid),
      paymentMethod: String(r.payment_mode || '').toLowerCase() === 'cash' ? 'cash' : 'online',
      collectedAt: r.created_at ? new Date(r.created_at).toISOString() : `${r.payment_date}T12:00:00`,
      agentName: r.agent_name || 'Field Agent',
      remainingBalance: Number(r.remaining_balance || 0),
      notes: r.remarks || undefined
    }));
  },

  async collectAgentPayment(
    data: { customerId: string; installmentId?: string; amount: number; paymentMethod: string; notes?: string },
    actor: User
  ) {
    const customer = await db.getCustomerById(data.customerId);
    if (!customer) {
      throw new Error(`Customer ${data.customerId} not found.`);
    }

    // Role-based security check: agent can only collect for customers on their assigned route
    if (actor.role === 'agent') {
      const u = await queryOne<any>('SELECT assigned_route_id FROM users WHERE id=?', [actor.id]);
      if (!u?.assigned_route_id || customer.routeId !== u.assigned_route_id) {
        throw new Error('Unauthorized: This customer is not assigned to your collection route.');
      }
    }

    let installment: any = null;
    if (data.installmentId) {
      installment = await db.getInstallmentById(data.installmentId);
    }
    if (!installment) {
      const row = await queryOne<any>(`
        SELECT installment_id FROM installments
        WHERE customer_id = ? AND (status != 'Paid' OR paid_amount < net_due_amount)
        ORDER BY due_date ASC, month_number ASC
        LIMIT 1
      `, [data.customerId]);
      if (row?.installment_id) {
        installment = await db.getInstallmentById(row.installment_id);
      }
    }

    if (!installment) {
      const row = await queryOne<any>(`
        SELECT installment_id FROM installments WHERE customer_id = ? ORDER BY due_date DESC LIMIT 1
      `, [data.customerId]);
      if (row?.installment_id) {
        installment = await db.getInstallmentById(row.installment_id);
      }
    }

    if (!installment) {
      throw new Error('No active membership or installment found for customer.');
    }

    const paymentResult = await db.recordPayment(
      {
        installmentId: installment.installmentId,
        amountPaid: data.amount,
        paymentMode: data.paymentMethod === 'online' ? 'Online' : 'Cash',
        paymentDate: today(),
        remarks: data.notes || 'Field collection by agent'
      },
      actor
    );

    const agentReceipt = {
      receiptNumber: paymentResult.payment.receiptNumber,
      customerId: data.customerId,
      customerName: paymentResult.payment.customerName || customer?.fullName || 'Customer',
      phone: customer?.mobileNumber || '',
      chitGroupCode: paymentResult.payment.groupName || paymentResult.payment.groupId,
      ticketNumber: String(paymentResult.payment.ticketNumber || 1),
      amountCollected: Number(paymentResult.payment.amountPaid),
      paymentMethod: (paymentResult.payment.paymentMode?.toLowerCase() === 'cash' ? 'cash' : 'online') as 'cash' | 'online',
      collectedAt: new Date().toISOString(),
      agentName: actor.fullName || actor.username || 'Field Agent',
      remainingBalance: Number(paymentResult.payment.remainingBalance || 0),
      notes: data.notes || undefined
    };

    return {
      payment: {
        id: paymentResult.payment.receiptNumber,
        customerId: data.customerId,
        amount: Number(paymentResult.payment.amountPaid),
        paymentMethod: agentReceipt.paymentMethod,
        collectedAt: agentReceipt.collectedAt,
        receiptNumber: agentReceipt.receiptNumber,
        notes: data.notes
      },
      receipt: agentReceipt
    };
  },

  // ---- NEW MODULES: DAILY, MONTHLY, BALANCE SHEET ----
  async getDailyCollection(dateStr: string, userId?: number | string, role?: string) {
    const targetDate = dateStr || today();

    let sql = `
      SELECT 
        p.receipt_number,
        p.amount_paid,
        p.payment_mode,
        p.payment_date,
        p.created_at,
        c.customer_id,
        c.full_name AS customer_name,
        cg.group_name,
        u.full_name AS agent_name,
        u.id AS agent_id
      FROM payments p
      LEFT JOIN customers c ON p.customer_id = c.customer_id
      LEFT JOIN chit_groups cg ON p.group_id = cg.group_id
      LEFT JOIN users u ON p.collected_by_user_id = u.id
      WHERE (LEFT(p.payment_date, 10) = ? OR LEFT(p.created_at, 10) = ? OR DATE(p.payment_date) = ?) AND p.status = 'active'
    `;
    const params: any[] = [targetDate, targetDate, targetDate];

    if (role === 'agent' && userId) {
      sql += ` AND p.collected_by_user_id = ?`;
      params.push(userId);
    }
    sql += ` ORDER BY p.created_at DESC`;

    const rows = await query<any>(sql, params);

    let totalCash = 0;
    let totalOnline = 0;

    const transactions = rows.map((r: any) => {
      const amt = Number(r.amount_paid || 0);
      const isCash = String(r.payment_mode || '').toLowerCase() === 'cash';
      if (isCash) totalCash += amt;
      else totalOnline += amt;

      const dateObj = new Date(r.created_at || r.payment_date);
      const commission = round2(amt * 0.05); // 5% standard commission

      return {
        id: r.receipt_number,
        customerId: r.customer_id,
        customerName: r.customer_name || 'Unknown',
        groupName: r.group_name || 'Unknown',
        amount: amt,
        paymentMode: r.payment_mode,
        date: dateObj.toISOString().split('T')[0],
        time: dateObj.toTimeString().split(' ')[0],
        day: dateObj.toLocaleDateString('en-US', { weekday: 'long' }),
        agentName: r.agent_name || 'N/A',
        commission
      };
    });

    return {
      date: targetDate,
      totalCollected: totalCash + totalOnline,
      totalCash,
      totalOnline,
      transactions,
      commissionEarned: round2((totalCash + totalOnline) * 0.05)
    };
  },

  async getAgents(search?: string, status?: string) {
    let sql = `
      SELECT id, username, full_name, email, role, status, created_at
      FROM users
      WHERE role = 'agent'
    `;
    const params: any[] = [];
    if (status && status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      sql += ' AND (full_name LIKE ? OR username LIKE ? OR id = ?)';
      params.push(q, q, search.trim());
    }
    sql += ' ORDER BY full_name ASC, username ASC';
    const rows = await query<any>(sql, params);
    return rows.map((r: any) => ({
      id: r.id,
      agentId: `AGT-${String(r.id).padStart(3, '0')}`,
      fullName: r.full_name || r.username,
      username: r.username,
      email: r.email,
      role: r.role,
      status: r.status,
      createdAt: r.created_at
    }));
  },

  async getSubscriberStatement(customerId: string, groupId?: string) {
    const customer = await queryOne<any>(`SELECT * FROM customers WHERE customer_id = ?`, [customerId]);
    if (!customer) {
      throw new Error(`Customer with ID ${customerId} not found`);
    }

    let membershipSql = `
      SELECT m.*, cg.group_name, cg.chit_value, cg.start_date, cg.end_date, cg.monthly_installment, cg.duration_months
      FROM memberships m
      JOIN chit_groups cg ON m.group_id = cg.group_id
      WHERE m.customer_id = ?
    `;
    const mParams: any[] = [customerId];
    if (groupId && groupId !== 'ALL') {
      membershipSql += ' AND m.group_id = ?';
      mParams.push(groupId);
    }
    membershipSql += ' ORDER BY m.created_at DESC LIMIT 1';
    const membership = await queryOne<any>(membershipSql, mParams);

    const groupCode = membership?.group_id ? (membership.group_id.includes('/') ? membership.group_id : `${membership.group_id}/001`) : '-';
    const formattedTicket = membership?.ticket_number ? String(membership.ticket_number).padStart(2, '0') : '01';
    const groupNo = `${groupCode}/${formattedTicket}`;

    let paySql = `
      SELECT 
        p.receipt_number,
        p.payment_date,
        p.amount_paid,
        p.payment_mode,
        p.created_at,
        p.remaining_balance,
        i.month_number,
        i.installment_amount,
        COALESCE(i.dividend_deduction, 0) AS dividend,
        u.full_name AS agent_name
      FROM payments p
      LEFT JOIN installments i ON p.installment_id = i.installment_id
      LEFT JOIN users u ON p.collected_by_user_id = u.id
      WHERE p.customer_id = ? AND p.status = 'active'
    `;
    const payParams: any[] = [customerId];
    if (membership?.group_id) {
      paySql += ' AND p.group_id = ?';
      payParams.push(membership.group_id);
    }
    paySql += ' ORDER BY p.payment_date ASC, p.created_at ASC';
    const payRows = await query<any>(paySql, payParams);

    let cumulativeCollection = 0;
    let cumulativeDividend = 0;
    const transactions = payRows.map((p: any, idx: number) => {
      const amt = Number(p.amount_paid || 0);
      const div = Number(p.dividend || 0);
      cumulativeCollection += amt;
      cumulativeDividend += div;

      const pDate = p.payment_date ? new Date(p.payment_date) : new Date(p.created_at);
      const formattedDate = !isNaN(pDate.getTime())
        ? `${String(pDate.getDate()).padStart(2, '0')}-${String(pDate.getMonth() + 1).padStart(2, '0')}-${pDate.getFullYear()}`
        : String(p.payment_date || '-');

      return {
        sNo: idx + 1,
        date: formattedDate,
        modeOfPayment: p.payment_mode || 'Cash',
        billNo: p.receipt_number || String(idx + 1),
        collectionAmount: amt,
        totalCollection: cumulativeCollection,
        dividend: div,
        netTotal: cumulativeCollection + cumulativeDividend,
        agentName: p.agent_name || 'Sundar Raj'
      };
    });

    const primaryAgent = payRows.find((p: any) => p.agent_name)?.agent_name || 'Sundar Raj';

    return {
      subscriber: {
        name: customer.full_name,
        address: customer.address || '140, Periyar Nagar, Salem.',
        city: customer.city || 'Salem',
        pincode: customer.pincode || '636 - 003',
        phone: customer.mobile_number || '95855-57568',
        groupNo,
        customerId: customer.customer_id
      },
      chitDetails: {
        groupId: membership?.group_id || 'J2E/001',
        groupName: membership?.group_name || 'Monthly Chit',
        agentName: primaryAgent,
        commencementDate: membership?.start_date ? String(membership.start_date).slice(0, 10) : '25-08-2026',
        terminationDate: membership?.end_date ? String(membership.end_date).slice(0, 10) : '25-03-2028',
        chitValue: Number(membership?.chit_value || 0),
        monthlyInstallment: Number(membership?.monthly_installment || 0)
      },
      transactions,
      totals: {
        totalCollection: cumulativeCollection,
        totalDividend: cumulativeDividend,
        netTotal: cumulativeCollection + cumulativeDividend,
        transactionCount: transactions.length
      }
    };
  },

  async isAgentAuthorizedForCustomer(agentUserId: number | string, customerId: string | number): Promise<boolean> {
    const row = await queryOne<any>(`
      SELECT c.customer_id
      FROM customers c
      LEFT JOIN users u ON u.id = ?
      WHERE (c.customer_id = ? OR CAST(c.id AS CHAR) = ?)
        AND (
          (u.assigned_route_id IS NOT NULL AND c.route_id = u.assigned_route_id)
          OR EXISTS (SELECT 1 FROM routes r WHERE r.assigned_agent_id = ? AND r.route_id = c.route_id)
          OR EXISTS (SELECT 1 FROM payments p WHERE p.customer_id = c.customer_id AND p.collected_by_user_id = ?)
        )
      LIMIT 1
    `, [agentUserId, String(customerId), String(customerId), agentUserId, agentUserId]);
    return !!row;
  },

  async getMonthlyCollection(
    monthStr: string,
    userId?: number | string,
    role?: string,
    filterAgentId?: number | string,
    filterGroupId?: string,
    filterCustomerId?: string,
    filterPaymentMode?: string,
    startDate?: string,
    endDate?: string,
    filterStatus?: string
  ) {
    const targetMonth = monthStr || today().slice(0, 7);

    let sql = `
      SELECT 
        p.receipt_number,
        p.amount_paid,
        p.payment_mode,
        p.payment_date,
        p.status,
        p.created_at,
        p.collected_by_user_id,
        c.customer_id,
        c.full_name AS customer_name,
        c.mobile_number AS customer_phone,
        c.address AS customer_address,
        c.city AS customer_city,
        c.pincode AS customer_pincode,
        c.route_id,
        rt.route_name,
        cg.group_id,
        cg.group_name,
        COALESCE(m.ticket_number, 0) AS ticket_number,
        u.id AS agent_user_id,
        u.full_name AS agent_name,
        u.username AS agent_username,
        i.month_number,
        i.net_due_amount,
        COALESCE(i.dividend_deduction, 0) AS dividend_deduction,
        (i.net_due_amount - i.paid_amount) AS outstanding
      FROM payments p
      LEFT JOIN customers c ON p.customer_id = c.customer_id
      LEFT JOIN routes rt ON c.route_id = rt.route_id
      LEFT JOIN chit_groups cg ON p.group_id = cg.group_id
      LEFT JOIN memberships m ON p.membership_id = m.membership_id
      LEFT JOIN users u ON p.collected_by_user_id = u.id
      LEFT JOIN installments i ON p.installment_id = i.installment_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filterStatus && filterStatus !== 'ALL') {
      sql += ` AND p.status = ?`;
      params.push(filterStatus);
    } else if (!filterStatus) {
      sql += ` AND p.status = 'active'`;
    }

    if (startDate && endDate) {
      sql += ` AND (p.payment_date BETWEEN ? AND ?)`;
      params.push(startDate, endDate);
    } else {
      sql += ` AND (LEFT(p.payment_date, 7) = ? OR LEFT(p.created_at, 7) = ? OR DATE_FORMAT(p.payment_date, '%Y-%m') = ?)`;
      params.push(targetMonth, targetMonth, targetMonth);
    }

    // STRICT ROLE SECURITY: If caller is an agent, MUST constrain to their own user id
    if (role === 'agent' && userId) {
      sql += ` AND p.collected_by_user_id = ?`;
      params.push(userId);
    } else if (filterAgentId && filterAgentId !== 'ALL') {
      sql += ` AND (p.collected_by_user_id = ? OR u.username = ? OR u.full_name = ?)`;
      params.push(filterAgentId, filterAgentId, filterAgentId);
    }

    if (filterGroupId && filterGroupId !== 'ALL') {
      sql += ` AND (p.group_id = ? OR cg.group_name = ?)`;
      params.push(filterGroupId, filterGroupId);
    }

    if (filterCustomerId && filterCustomerId !== 'ALL') {
      sql += ` AND (p.customer_id = ? OR c.full_name LIKE ?)`;
      params.push(filterCustomerId, `%${filterCustomerId}%`);
    }

    if (filterPaymentMode && filterPaymentMode !== 'ALL') {
      sql += ` AND p.payment_mode = ?`;
      params.push(filterPaymentMode);
    }

    sql += ` ORDER BY p.payment_date DESC, p.created_at DESC`;

    const rows = await query<any>(sql, params);

    let totalCollected = 0;
    const transactions = rows.map((r: any) => {
      const amt = Number(r.amount_paid || 0);
      totalCollected += amt;
      const payDateObj = r.payment_date ? new Date(r.payment_date) : (r.created_at ? new Date(r.created_at) : new Date());
      const createdObj = r.created_at ? new Date(r.created_at) : payDateObj;
      const formattedDate = typeof r.payment_date === 'string' && r.payment_date.length >= 10
        ? r.payment_date.slice(0, 10)
        : payDateObj.toISOString().split('T')[0];

      const groupCode = r.group_id ? (r.group_id.includes('/') ? r.group_id : `${r.group_id}/001`) : '-';
      const ticketStr = r.ticket_number ? String(r.ticket_number).padStart(2, '0') : '01';
      const formattedGroupNo = `${groupCode}/${ticketStr}`;

      return {
        id: r.receipt_number,
        receiptNumber: r.receipt_number,
        customerId: r.customer_id,
        customerName: r.customer_name || 'Unknown',
        customerPhone: r.customer_phone || '',
        customerAddress: r.customer_address || '',
        customerCity: r.customer_city || '',
        customerPincode: r.customer_pincode || '',
        routeId: r.route_id || null,
        routeName: r.route_name || (r.route_id ? r.route_id : 'Direct'),
        groupId: r.group_id || 'Unknown',
        groupName: r.group_name || 'Unknown',
        ticketNumber: r.ticket_number || 1,
        groupNo: formattedGroupNo,
        amountPaid: amt,
        paymentMode: r.payment_mode || 'Cash',
        status: r.status || 'active',
        date: formattedDate,
        time: createdObj.toTimeString().split(' ')[0],
        day: payDateObj.toLocaleDateString('en-US', { weekday: 'long' }),
        agentId: r.agent_user_id ? `AGT-${String(r.agent_user_id).padStart(3, '0')}` : 'N/A',
        agentUserId: r.agent_user_id || null,
        agentName: r.agent_name || r.agent_username || 'Default Staff',
        dueAmount: Number(r.net_due_amount || 0),
        dividendDeduction: Number(r.dividend_deduction || 0),
        outstandingBalance: Math.max(0, Number(r.outstanding || 0)),
        commission: round2(amt * 0.05)
      };
    });

    let agentDetails: any = null;
    const effectiveAgentId = (role === 'agent' && userId) ? userId : filterAgentId;
    if (effectiveAgentId && effectiveAgentId !== 'ALL') {
      const agRow = await queryOne<any>(`
        SELECT u.id, u.username, u.full_name, u.email, u.role, u.status, u.assigned_route_id, r.route_name
        FROM users u
        LEFT JOIN routes r ON u.assigned_route_id = r.route_id
        WHERE u.id = ? OR u.username = ? OR u.full_name = ?
        LIMIT 1
      `, [effectiveAgentId, effectiveAgentId, effectiveAgentId]);
      if (agRow) {
        agentDetails = {
          id: agRow.id,
          agentId: `AGT-${String(agRow.id).padStart(3, '0')}`,
          fullName: agRow.full_name || agRow.username,
          username: agRow.username,
          status: agRow.status,
          assignedRouteId: agRow.assigned_route_id || null,
          assignedRouteName: agRow.route_name || (agRow.assigned_route_id ? agRow.assigned_route_id : null)
        };
      }
    }

    return {
      month: targetMonth,
      totalCollected,
      totalTransactions: transactions.length,
      commissionEarned: round2(totalCollected * 0.05),
      transactions,
      agentDetails
    };
  },

  async getBalanceSheet(
    userId?: number | string,
    role?: string,
    statusFilter?: string,
    search?: string,
    groupId?: string,
    customerId?: string
  ) {
    let sql = `
      SELECT 
        i.installment_id,
        i.customer_id,
        c.full_name AS customer_name,
        c.mobile_number AS customer_phone,
        c.address AS customer_address,
        c.city AS customer_city,
        c.pincode AS customer_pincode,
        c.google_map_link,
        c.route_id,
        rt.route_name,
        i.group_id,
        cg.group_name,
        i.installment_amount,
        COALESCE(i.dividend_deduction, 0) AS dividend_deduction,
        i.net_due_amount,
        i.paid_amount,
        DATE_FORMAT(i.due_date, '%Y-%m-%d') AS due_date,
        i.status,
        (
          SELECT p.receipt_number 
          FROM payments p 
          WHERE p.installment_id = i.installment_id AND p.status = 'active' 
          ORDER BY p.id DESC 
          LIMIT 1
        ) AS latest_receipt_number
      FROM installments i
      LEFT JOIN customers c ON i.customer_id = c.customer_id
      LEFT JOIN routes rt ON c.route_id = rt.route_id
      LEFT JOIN chit_groups cg ON i.group_id = cg.group_id
      WHERE 1=1
    `;
    const params: any[] = [];

    // STRICT ROUTE-BASED SECURITY: If caller is an agent, MUST constrain to agent's authorized route
    if (role === 'agent' && userId) {
      sql += ` AND (
        (c.route_id IS NOT NULL AND c.route_id = (SELECT assigned_route_id FROM users WHERE id = ?))
        OR EXISTS (SELECT 1 FROM routes r WHERE r.assigned_agent_id = ? AND r.route_id = c.route_id)
      )`;
      params.push(userId, userId);
    }

    if (groupId && groupId !== 'ALL') {
      sql += ` AND i.group_id = ?`;
      params.push(groupId);
    }

    if (customerId && customerId !== 'ALL') {
      sql += ` AND i.customer_id = ?`;
      params.push(customerId);
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      sql += ` AND (
        c.full_name LIKE ? OR 
        i.customer_id LIKE ? OR 
        c.mobile_number LIKE ? OR 
        cg.group_name LIKE ? OR 
        i.group_id LIKE ? OR 
        i.installment_id LIKE ?
      )`;
      params.push(term, term, term, term, term, term);
    }

    sql += ` ORDER BY i.due_date ASC, i.installment_id ASC`;

    const rows = await query<any>(sql, params);

    let totalOutstanding = 0;
    let totalOutstandingCount = 0;
    let dueTodayAmount = 0;
    let dueTodayCount = 0;
    let overdueAmount = 0;
    let overdueCount = 0;
    let upcomingAmount = 0;
    let upcomingCount = 0;
    let partiallyPaidAmount = 0;
    let partiallyPaidCount = 0;
    let paidCount = 0;

    const todayStr = today();

    const allMappedRecords = rows.map((r: any) => {
      const due = Number(r.net_due_amount || 0);
      const paid = Number(r.paid_amount || 0);
      const outstanding = Math.max(0, round2(due - paid));
      const dueDateStr = r.due_date ? String(r.due_date).slice(0, 10) : '';

      const isPaid = r.status === 'Paid' || outstanding <= 0;
      const isOverdue = !isPaid && dueDateStr < todayStr;
      const isDueToday = !isPaid && dueDateStr === todayStr;
      const isUpcoming = !isPaid && dueDateStr > todayStr;
      const isPartiallyPaid = !isPaid && paid > 0;

      if (!isPaid) {
        totalOutstanding += outstanding;
        totalOutstandingCount++;
      }

      if (isOverdue) {
        overdueAmount += outstanding;
        overdueCount++;
      } else if (isDueToday) {
        dueTodayAmount += outstanding;
        dueTodayCount++;
      } else if (isUpcoming) {
        upcomingAmount += outstanding;
        upcomingCount++;
      }

      if (isPartiallyPaid) {
        partiallyPaidAmount += paid;
        partiallyPaidCount++;
      }

      if (isPaid) {
        paidCount++;
      }

      let paymentStatus: string;
      if (isPaid) {
        paymentStatus = 'Paid';
      } else if (isPartiallyPaid) {
        if (isOverdue) paymentStatus = 'Partially Paid (Overdue)';
        else if (isDueToday) paymentStatus = 'Partially Paid (Due Today)';
        else paymentStatus = 'Partially Paid';
      } else if (isOverdue) {
        paymentStatus = 'Overdue';
      } else if (isDueToday) {
        paymentStatus = 'Due Today';
      } else {
        paymentStatus = 'Upcoming';
      }

      const d = dueDateStr ? new Date(`${dueDateStr}T00:00:00`) : new Date();
      const dayName = !isNaN(d.getTime()) ? d.toLocaleDateString('en-US', { weekday: 'long' }) : '';

      return {
        id: r.installment_id,
        customerId: r.customer_id,
        customerName: r.customer_name || 'Unknown',
        phone: r.customer_phone || '',
        customerPhone: r.customer_phone || '',
        address: r.customer_address || '',
        customerAddress: r.customer_address || '',
        city: r.customer_city || '',
        pincode: r.customer_pincode || '',
        googleMapLink: r.google_map_link || '',
        routeId: r.route_id || '',
        routeName: r.route_name || '',
        groupId: r.group_id,
        groupName: r.group_name || 'Unknown',
        installmentAmount: Number(r.installment_amount || 0),
        dividendDeduction: Number(r.dividend_deduction || 0),
        dueAmount: due,
        targetAmount: due,
        paidAmount: paid,
        outstandingBalance: outstanding,
        dueDate: dueDateStr,
        day: dayName,
        isOverdue,
        isDueToday,
        isUpcoming,
        isPartiallyPaid,
        isPaid,
        overdueStatus: isOverdue ? 'Overdue' : (isDueToday ? 'Due Today' : (isPaid ? 'Paid' : 'Pending')),
        paymentStatus,
        arrears: isOverdue ? outstanding : 0,
        latestReceiptNumber: r.latest_receipt_number || null,
        status: r.status
      };
    });

    let filteredRecords = allMappedRecords;
    const filterKey = (statusFilter || '').toLowerCase().trim();

    if (filterKey === 'due-today' || filterKey === 'due_today') {
      filteredRecords = allMappedRecords.filter((r: any) => r.isDueToday);
    } else if (filterKey === 'overdue') {
      filteredRecords = allMappedRecords.filter((r: any) => r.isOverdue);
    } else if (filterKey === 'upcoming') {
      filteredRecords = allMappedRecords.filter((r: any) => r.isUpcoming);
    } else if (filterKey === 'partially-paid' || filterKey === 'partially_paid') {
      filteredRecords = allMappedRecords.filter((r: any) => r.isPartiallyPaid);
    } else if (filterKey === 'paid') {
      filteredRecords = allMappedRecords.filter((r: any) => r.isPaid);
    } else if (filterKey === 'all') {
      // Return all pending records by default if 'all' is chosen
      filteredRecords = allMappedRecords.filter((r: any) => !r.isPaid);
    } else {
      // Default: all pending records
      filteredRecords = allMappedRecords.filter((r: any) => !r.isPaid);
    }

    return {
      totalOutstanding: round2(totalOutstanding),
      totalOutstandingCount,
      totalArrears: round2(overdueAmount),
      dueTodayAmount: round2(dueTodayAmount),
      dueTodayCount,
      overdueAmount: round2(overdueAmount),
      overdueCount,
      upcomingAmount: round2(upcomingAmount),
      upcomingCount,
      partiallyPaidAmount: round2(partiallyPaidAmount),
      partiallyPaidCount,
      paidCount,
      totalRecordsCount: allMappedRecords.length,
      records: filteredRecords
    };
  },

  async getArrearsReport(
    userId?: number | string,
    role?: string,
    asOnDate?: string,
    agentId?: string,
    groupId?: string,
    search?: string
  ) {
    const targetDate = asOnDate && asOnDate.trim() ? asOnDate.trim() : today();

    let sql = `
      SELECT 
        m.membership_id,
        m.customer_id,
        m.group_id,
        m.ticket_number,
        c.full_name AS customer_name,
        c.mobile_number AS customer_phone,
        cg.group_name,
        cg.chit_value,
        cg.start_date,
        cg.end_date,
        DATE_FORMAT(cg.start_date, '%d-%m-%Y') AS cd,
        DATE_FORMAT(cg.end_date, '%d-%m-%Y') AS td,
        (m.installment_amount * m.total_installments) AS contract_payable,
        COALESCE((
          SELECT SUM(p.amount_paid)
          FROM payments p
          WHERE p.membership_id = m.membership_id
            AND p.status = 'active'
            AND p.payment_date <= ?
        ), 0) AS total_collection_amount,
        (
          SELECT DATE_FORMAT(MAX(p.payment_date), '%d-%m-%Y')
          FROM payments p
          WHERE p.membership_id = m.membership_id
            AND p.status = 'active'
            AND p.payment_date <= ?
        ) AS last_collection_date,
        COALESCE((
          SELECT p2.amount_paid
          FROM payments p2
          WHERE p2.membership_id = m.membership_id
            AND p2.status = 'active'
            AND p2.payment_date <= ?
          ORDER BY p2.payment_date DESC, p2.id DESC
          LIMIT 1
        ), 0) AS last_collection_amount,
        COALESCE(ag.id, rt.assigned_agent_id) AS agent_id,
        COALESCE(ag.full_name, (SELECT u2.full_name FROM users u2 WHERE u2.assigned_route_id = c.route_id LIMIT 1), 'Unassigned') AS agent_name
      FROM memberships m
      JOIN customers c ON m.customer_id = c.customer_id
      JOIN chit_groups cg ON m.group_id = cg.group_id
      LEFT JOIN routes rt ON c.route_id = rt.route_id
      LEFT JOIN users ag ON rt.assigned_agent_id = ag.id
      WHERE 1=1
    `;
    const params: any[] = [targetDate, targetDate, targetDate];

    // Field Agent authorization: strictly constrain to authorized route / agent
    if (role === 'agent' && userId) {
      sql += ` AND (
        (c.route_id IS NOT NULL AND c.route_id = (SELECT assigned_route_id FROM users WHERE id = ?))
        OR EXISTS (SELECT 1 FROM routes r WHERE r.assigned_agent_id = ? AND r.route_id = c.route_id)
      )`;
      params.push(userId, userId);
    } else if (agentId && agentId !== 'ALL') {
      // Admin filter by specific agent
      sql += ` AND (
        rt.assigned_agent_id = ?
        OR EXISTS (SELECT 1 FROM users u WHERE u.id = ? AND u.assigned_route_id = c.route_id)
      )`;
      params.push(agentId, agentId);
    }

    if (groupId && groupId !== 'ALL') {
      sql += ` AND m.group_id = ?`;
      params.push(groupId);
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      sql += ` AND (
        c.full_name LIKE ? OR 
        c.customer_id LIKE ? OR 
        c.mobile_number LIKE ? OR 
        cg.group_name LIKE ? OR 
        m.group_id LIKE ? OR 
        m.membership_id LIKE ?
      )`;
      params.push(term, term, term, term, term, term);
    }

    sql += ` ORDER BY cg.group_id ASC, m.ticket_number ASC, m.membership_id ASC`;

    const rows = await query<any>(sql, params);

    let totalPayableSum = 0;
    let totalCollectionSum = 0;
    let totalBalanceSum = 0;
    let totalLastCollectionSum = 0;

    const records = rows.map((r: any, idx: number) => {
      const totalPayable = round2(Number(r.contract_payable || r.chit_value || 0));
      const totalCollection = round2(Number(r.total_collection_amount || 0));
      const balance = round2(Math.max(0, totalPayable - totalCollection));
      const lastCollectionAmount = round2(Number(r.last_collection_amount || 0));

      totalPayableSum += totalPayable;
      totalCollectionSum += totalCollection;
      totalBalanceSum += balance;
      totalLastCollectionSum += lastCollectionAmount;

      // Group No formatting: if ticket number present, format as e.g. "J2E/001/01"
      let groupNoDisplay = r.group_id;
      if (r.ticket_number) {
        const ticketFormatted = String(r.ticket_number).padStart(2, '0');
        if (r.group_id && !r.group_id.endsWith(`/${ticketFormatted}`)) {
          groupNoDisplay = `${r.group_id}/${ticketFormatted}`;
        }
      }

      return {
        sNo: idx + 1,
        membershipId: r.membership_id,
        customerId: r.customer_id,
        groupId: r.group_id,
        groupNo: groupNoDisplay,
        groupName: r.group_name,
        ticketNumber: r.ticket_number,
        name: r.customer_name || 'Unknown',
        cd: r.cd || '-',
        td: r.td || '-',
        totalPayableAmount: totalPayable,
        totalCollectionAmount: totalCollection,
        balanceAmount: balance,
        lastCollectionDate: r.last_collection_date || '-',
        lastCollectionAmount: lastCollectionAmount,
        phone: r.customer_phone || '-',
        agentId: r.agent_id,
        agentName: r.agent_name || 'Unassigned'
      };
    });

    return {
      asOnDate: targetDate,
      summary: {
        totalSubscribers: records.length,
        totalPayableAmount: round2(totalPayableSum),
        totalCollectionAmount: round2(totalCollectionSum),
        totalBalanceAmount: round2(totalBalanceSum),
        totalLastCollectionAmount: round2(totalLastCollectionSum)
      },
      records
    };
  },

  // ---- DELETE & UPDATE HELPERS ----
  async deleteCustomer(id: string, operator?: User) {
    const cust = await queryOne<any>('SELECT customer_id FROM customers WHERE customer_id = ? OR id = ?', [id, id]);
    const cid = cust?.customer_id || id;

    const conn = await pool.getConnection();
    try {
      await conn.query('SET FOREIGN_KEY_CHECKS = 0');
      await conn.query('DELETE FROM prize_payments WHERE winner_customer_id = ?', [cid]);
      await conn.query('UPDATE auctions SET winner_customer_id = NULL, winner_membership_id = NULL WHERE winner_customer_id = ?', [cid]);
      await conn.query('DELETE FROM payments WHERE customer_id = ?', [cid]);
      await conn.query('DELETE FROM installments WHERE customer_id = ?', [cid]);
      await conn.query('DELETE FROM memberships WHERE customer_id = ?', [cid]);
      await conn.query('DELETE FROM customers WHERE customer_id = ? OR id = ?', [cid, id]);
    } finally {
      await conn.query('SET FOREIGN_KEY_CHECKS = 1');
      conn.release();
    }

    if (operator) {
      await this.logAudit(operator.id, operator.username, 'DELETE_CUSTOMER', 'CUSTOMERS', cid, null, { customerId: cid });
    }
    return { message: 'Customer and related records deleted successfully' };
  },

  async deleteChitGroup(id: string, operator?: User) {
    const group = await queryOne<any>('SELECT group_id FROM chit_groups WHERE group_id = ? OR id = ?', [id, id]);
    const gid = group?.group_id || id;

    // Safely remove related child records across auctions, prize payments, installments, memberships
    const conn = await pool.getConnection();
    try {
      await conn.query('SET FOREIGN_KEY_CHECKS = 0');
      await conn.query('DELETE FROM prize_payments WHERE group_id = ?', [gid]);
      await conn.query('DELETE FROM dividends WHERE group_id = ?', [gid]);
      await conn.query('DELETE FROM auctions WHERE group_id = ?', [gid]);
      await conn.query('DELETE FROM payments WHERE group_id = ?', [gid]);
      await conn.query('DELETE FROM installments WHERE group_id = ?', [gid]);
      await conn.query('DELETE FROM memberships WHERE group_id = ?', [gid]);
      await conn.query('DELETE FROM chit_groups WHERE group_id = ? OR id = ?', [gid, id]);
    } finally {
      await conn.query('SET FOREIGN_KEY_CHECKS = 1');
      conn.release();
    }

    if (operator) {
      await this.logAudit(operator.id, operator.username, 'DELETE_CHIT_GROUP', 'CHIT_GROUPS', gid, null, { groupId: gid });
    }
    return { message: 'Chit group and related records deleted successfully' };
  },

  async updateMembership(id: string, data: any, operator?: User) {
    if (data.ticketNumber !== undefined) {
      await execute(`UPDATE memberships SET ticket_number = ? WHERE membership_id = ? OR id = ?`, [data.ticketNumber, id, id]);
    }
    if (data.status !== undefined) {
      await execute(`UPDATE memberships SET status = ? WHERE membership_id = ? OR id = ?`, [data.status, id, id]);
    }
    if (operator) {
      await this.logAudit(operator.id, operator.username, 'UPDATE_MEMBERSHIP', 'MEMBERSHIPS', id, null, data);
    }
    return { message: 'Membership updated successfully' };
  },

  async deleteMembership(id: string, operator?: User) {
    const mem = await queryOne<any>('SELECT membership_id FROM memberships WHERE membership_id = ? OR id = ?', [id, id]);
    const mid = mem?.membership_id || id;

    const conn = await pool.getConnection();
    try {
      await conn.query('SET FOREIGN_KEY_CHECKS = 0');
      await conn.query('DELETE FROM prize_payments WHERE winner_membership_id = ?', [mid]);
      await conn.query('UPDATE auctions SET winner_membership_id = NULL, winner_customer_id = NULL WHERE winner_membership_id = ?', [mid]);
      await conn.query('DELETE FROM payments WHERE membership_id = ?', [mid]);
      await conn.query('DELETE FROM installments WHERE membership_id = ?', [mid]);
      await conn.query('DELETE FROM memberships WHERE membership_id = ? OR id = ?', [mid, id]);
    } finally {
      await conn.query('SET FOREIGN_KEY_CHECKS = 1');
      conn.release();
    }

    if (operator) {
      await this.logAudit(operator.id, operator.username, 'DELETE_MEMBERSHIP', 'MEMBERSHIPS', mid, null, { membershipId: mid });
    }
    return { message: 'Membership deleted successfully' };
  },

  async updateInstallment(id: string, data: any, operator?: User) {
    const fields: string[] = [];
    const params: any[] = [];
    if (data.installmentAmount !== undefined) { fields.push('installment_amount = ?'); params.push(data.installmentAmount); }
    if (data.dividendDeduction !== undefined) { fields.push('dividend_deduction = ?'); params.push(data.dividendDeduction); }
    if (data.netDueAmount !== undefined) { fields.push('net_due_amount = ?'); params.push(data.netDueAmount); }
    if (data.paidAmount !== undefined) { fields.push('paid_amount = ?'); params.push(data.paidAmount); }
    if (data.dueDate !== undefined) { fields.push('due_date = ?'); params.push(data.dueDate); }
    if (data.status !== undefined) { fields.push('status = ?'); params.push(data.status); }
    if (data.remarks !== undefined) { fields.push('remarks = ?'); params.push(data.remarks); }

    if (fields.length > 0) {
      params.push(id, id);
      await execute(`UPDATE installments SET ${fields.join(', ')} WHERE installment_id = ? OR id = ?`, params);
    }
    if (operator) {
      await this.logAudit(operator.id, operator.username, 'UPDATE_INSTALLMENT', 'INSTALLMENTS', id, null, data);
    }
    return { message: 'Installment updated successfully' };
  },

  async deleteInstallment(id: string, operator?: User) {
    const conn = await pool.getConnection();
    try {
      await conn.query('SET FOREIGN_KEY_CHECKS = 0');
      await conn.query(`DELETE FROM installments WHERE installment_id = ? OR id = ?`, [id, id]);
    } finally {
      await conn.query('SET FOREIGN_KEY_CHECKS = 1');
      conn.release();
    }
    if (operator) {
      await this.logAudit(operator.id, operator.username, 'DELETE_INSTALLMENT', 'INSTALLMENTS', id, null, { installmentId: id });
    }
    return { message: 'Installment deleted successfully' };
  },

  async updatePayment(id: string, data: any, operator?: User) {
    const fields: string[] = [];
    const params: any[] = [];
    if (data.amountPaid !== undefined) { fields.push('amount_paid = ?'); params.push(data.amountPaid); }
    if (data.paymentMode !== undefined) { fields.push('payment_mode = ?'); params.push(data.paymentMode); }
    if (data.transactionReference !== undefined) { fields.push('transaction_reference = ?'); params.push(data.transactionReference); }
    if (data.paymentDate !== undefined) { fields.push('payment_date = ?'); params.push(data.paymentDate); }
    if (data.remarks !== undefined) { fields.push('remarks = ?'); params.push(data.remarks); }
    if (data.status !== undefined) { fields.push('status = ?'); params.push(data.status); }

    if (fields.length > 0) {
      params.push(id, id);
      await execute(`UPDATE payments SET ${fields.join(', ')} WHERE receipt_number = ? OR id = ?`, params);
    }
    if (operator) {
      await this.logAudit(operator.id, operator.username, 'UPDATE_PAYMENT', 'PAYMENTS', id, null, data);
    }
    return { message: 'Payment updated successfully' };
  },

  async deletePayment(id: string, operator?: User) {
    const conn = await pool.getConnection();
    try {
      await conn.query('SET FOREIGN_KEY_CHECKS = 0');
      await conn.query(`DELETE FROM payments WHERE receipt_number = ? OR id = ?`, [id, id]);
    } finally {
      await conn.query('SET FOREIGN_KEY_CHECKS = 1');
      conn.release();
    }
    if (operator) {
      await this.logAudit(operator.id, operator.username, 'DELETE_PAYMENT', 'PAYMENTS', id, null, { receiptNumber: id });
    }
    return { message: 'Payment deleted successfully' };
  },

  async updateAuction(id: string, data: any, operator?: User) {
    const fields: string[] = [];
    const params: any[] = [];
    if (data.auctionDate !== undefined) { fields.push('auction_date = ?'); params.push(data.auctionDate); }
    if (data.bidDiscountAmount !== undefined) { fields.push('bid_discount_amount = ?'); params.push(data.bidDiscountAmount); }
    if (data.prizeAmount !== undefined) { fields.push('prize_amount = ?'); params.push(data.prizeAmount); }
    if (data.foremanCommission !== undefined) { fields.push('foreman_commission = ?'); params.push(data.foremanCommission); }
    if (data.winnerMembershipId !== undefined) { fields.push('winner_membership_id = ?'); params.push(data.winnerMembershipId); }
    if (data.remarks !== undefined) { fields.push('remarks = ?'); params.push(data.remarks); }

    if (fields.length > 0) {
      params.push(id, id);
      await execute(`UPDATE auctions SET ${fields.join(', ')} WHERE auction_id = ? OR id = ?`, params);
    }
    if (operator) {
      await this.logAudit(operator.id, operator.username, 'UPDATE_AUCTION', 'AUCTIONS', id, null, data);
    }
    return { message: 'Auction updated successfully' };
  },

  async deleteAuction(id: string, operator?: User) {
    const auc = await queryOne<any>('SELECT auction_id FROM auctions WHERE auction_id = ? OR id = ?', [id, id]);
    const aid = auc?.auction_id || id;

    const conn = await pool.getConnection();
    try {
      await conn.query('SET FOREIGN_KEY_CHECKS = 0');
      await conn.query('DELETE FROM prize_payments WHERE auction_id = ?', [aid]);
      await conn.query('DELETE FROM dividends WHERE auction_id = ?', [aid]);
      await conn.query('DELETE FROM auctions WHERE auction_id = ? OR id = ?', [aid, id]);
    } finally {
      await conn.query('SET FOREIGN_KEY_CHECKS = 1');
      conn.release();
    }

    if (operator) {
      await this.logAudit(operator.id, operator.username, 'DELETE_AUCTION', 'AUCTIONS', aid, null, { auctionId: aid });
    }
    return { message: 'Auction deleted successfully' };
  },

  async updateDividend(id: string, data: any, operator?: User) {
    const fields: string[] = [];
    const params: any[] = [];
    if (data.totalDiscount !== undefined) { fields.push('total_discount = ?'); params.push(data.totalDiscount); }
    if (data.foremanCommission !== undefined) { fields.push('foreman_commission = ?'); params.push(data.foremanCommission); }
    if (data.distributableDividend !== undefined) { fields.push('distributable_dividend = ?'); params.push(data.distributableDividend); }
    if (data.dividendPerMember !== undefined) { fields.push('dividend_per_member = ?'); params.push(data.dividendPerMember); }

    if (fields.length > 0) {
      params.push(id, id);
      await execute(`UPDATE dividends SET ${fields.join(', ')} WHERE dividend_id = ? OR id = ?`, params);
    }
    if (operator) {
      await this.logAudit(operator.id, operator.username, 'UPDATE_DIVIDEND', 'DIVIDENDS', id, null, data);
    }
    return { message: 'Dividend updated successfully' };
  },

  async deleteDividend(id: string, operator?: User) {
    await execute(`DELETE FROM dividends WHERE dividend_id = ? OR id = ?`, [id, id]);
    if (operator) {
      await this.logAudit(operator.id, operator.username, 'DELETE_DIVIDEND', 'DIVIDENDS', id, null, { dividendId: id });
    }
    return { message: 'Dividend deleted successfully' };
  },

  async updatePrizePayment(id: string, data: any, operator?: User) {
    const fields: string[] = [];
    const params: any[] = [];
    if (data.prizeAmount !== undefined) { fields.push('prize_amount = ?'); params.push(data.prizeAmount); }
    if (data.paidAmount !== undefined) { fields.push('paid_amount = ?'); params.push(data.paidAmount); }
    if (data.paymentStatus !== undefined) { fields.push('payment_status = ?'); params.push(data.paymentStatus); }
    if (data.remarks !== undefined) { fields.push('remarks = ?'); params.push(data.remarks); }

    if (fields.length > 0) {
      params.push(id, id);
      await execute(`UPDATE prize_payments SET ${fields.join(', ')} WHERE prize_payment_id = ? OR id = ?`, params);
    }
    if (operator) {
      await this.logAudit(operator.id, operator.username, 'UPDATE_PRIZE_PAYMENT', 'PRIZE_PAYMENTS', id, null, data);
    }
    return { message: 'Prize payment updated successfully' };
  },

  async deletePrizePayment(id: string, operator?: User) {
    await execute(`DELETE FROM prize_payments WHERE prize_payment_id = ? OR id = ?`, [id, id]);
    if (operator) {
      await this.logAudit(operator.id, operator.username, 'DELETE_PRIZE_PAYMENT', 'PRIZE_PAYMENTS', id, null, { prizePaymentId: id });
    }
    return { message: 'Prize payment deleted successfully' };
  },

  async updateExpense(id: string, data: any, operator?: User) {
    const fields: string[] = [];
    const params: any[] = [];
    if (data.expenseDate !== undefined) { fields.push('expense_date = ?'); params.push(data.expenseDate); }
    if (data.category !== undefined) { fields.push('category = ?'); params.push(data.category); }
    if (data.description !== undefined) { fields.push('description = ?'); params.push(data.description); }
    if (data.amount !== undefined) { fields.push('amount = ?'); params.push(data.amount); }
    if (data.paymentMode !== undefined) { fields.push('payment_mode = ?'); params.push(data.paymentMode); }
    if (data.referenceNumber !== undefined) { fields.push('reference_number = ?'); params.push(data.referenceNumber); }
    if (data.remarks !== undefined) { fields.push('remarks = ?'); params.push(data.remarks); }

    if (fields.length > 0) {
      params.push(id, id);
      await execute(`UPDATE expenses SET ${fields.join(', ')} WHERE expense_id = ? OR id = ?`, params);
    }
    if (operator) {
      await this.logAudit(operator.id, operator.username, 'UPDATE_EXPENSE', 'EXPENSES', id, null, data);
    }
    return { message: 'Expense updated successfully' };
  },

  async deleteExpense(id: string, operator?: User) {
    await execute(`DELETE FROM expenses WHERE expense_id = ? OR id = ?`, [id, id]);
    if (operator) {
      await this.logAudit(operator.id, operator.username, 'DELETE_EXPENSE', 'EXPENSES', id, null, { expenseId: id });
    }
    return { message: 'Expense deleted successfully' };
  },

  async deleteUser(id: number | string, operator?: User) {
    await execute(`DELETE FROM users WHERE id = ?`, [id]);
    if (operator) {
      await this.logAudit(operator.id, operator.username, 'DELETE_USER', 'USERS', String(id), null, { targetUserId: id });
    }
    return { message: 'User deleted successfully' };
  },

  async updateAuditLog(id: number | string, data: any, operator?: User) {
    if (data.action !== undefined || data.details !== undefined) {
      await execute(`UPDATE audit_logs SET action = COALESCE(?, action), details = COALESCE(?, details) WHERE id = ?`, [data.action || null, data.details || null, id]);
    }
    return { message: 'Audit log updated successfully' };
  },

  async deleteAuditLog(id: number | string, operator?: User) {
    await execute(`DELETE FROM audit_logs WHERE id = ?`, [id]);
    return { message: 'Audit log deleted successfully' };
  },

  async getChitBookingList() {
    const sql = `
      SELECT 
        m.membership_id,
        m.customer_id,
        m.group_id,
        m.ticket_number,
        m.joining_date,
        m.installment_amount,
        m.total_installments,
        m.paid_installments,
        m.pending_installments,
        m.total_paid,
        m.total_pending,
        m.status,
        c.full_name AS name,
        c.mobile_number AS phone_number,
        cg.group_name,
        cg.chit_value,
        cg.duration_months AS month,
        cg.start_date
      FROM memberships m
      JOIN customers c ON m.customer_id = c.customer_id
      JOIN chit_groups cg ON m.group_id = cg.group_id
      ORDER BY m.group_id ASC, m.ticket_number ASC, m.created_at ASC
    `;
    const rows = await query<any>(sql);
    return rows.map((r, index) => {
      let groupCode = r.group_id;
      if (!groupCode.includes('/')) {
        groupCode = `${r.group_id}/001`;
      }
      const formattedTicket = String(r.ticket_number).padStart(2, '0');
      const newGroupNo = `${groupCode}/${formattedTicket}`;

      const val = Number(r.chit_value);
      const chitValueDisplay = val >= 100000 ? val / 100000 : val;

      return {
        sNo: index + 1,
        newGroupNo,
        name: r.name,
        phoneNumber: r.phone_number,
        chitValue: chitValueDisplay,
        fullChitValue: val,
        month: Number(r.month),
        customerId: r.customer_id,
        groupId: r.group_id,
        membershipId: r.membership_id,
        ticketNumber: r.ticket_number,
        joiningDate: r.joining_date,
        groupingDate: r.start_date,
        installmentAmount: Number(r.installment_amount || 0),
        paidInstallments: Number(r.paid_installments || 0),
        pendingInstallments: Number(r.pending_installments || 0),
        totalPaid: Number(r.total_paid || 0),
        totalPending: Number(r.total_pending || 0),
        status: r.status,
        groupName: r.group_name
      };
    });
  },

  // ============================================================
  // KUZHUKKAL (LUCKY DRAW / DRAW OF LOTS)
  // ============================================================
  async getKuzhukkalDraws(groupId?: string): Promise<KuzhukkalDraw[]> {
    let sql = `
      SELECT kd.*, cg.group_name, c.full_name AS winner_customer_name, c.mobile_number AS winner_customer_mobile,
             u1.full_name AS conducted_by_name, u2.full_name AS confirmed_by_name
      FROM kuzhukkal_draws kd
      LEFT JOIN chit_groups cg ON kd.group_id COLLATE utf8mb4_unicode_ci = cg.group_id COLLATE utf8mb4_unicode_ci
      LEFT JOIN customers c ON kd.winner_customer_id COLLATE utf8mb4_unicode_ci = c.customer_id COLLATE utf8mb4_unicode_ci
      LEFT JOIN users u1 ON kd.conducted_by_user_id = u1.id
      LEFT JOIN users u2 ON kd.confirmed_by_user_id = u2.id
      WHERE 1=1
    `;
    const p: any[] = [];
    if (groupId && groupId !== 'all') {
      sql += ' AND kd.group_id COLLATE utf8mb4_unicode_ci = ?';
      p.push(groupId);
    }
    sql += ' ORDER BY kd.draw_sequence DESC, kd.created_at DESC';
    const rows = await query<any>(sql, p);
    return rows.map(mapKuzhukkalDraw);
  },

  async getEligibleKuzhukkalMembers(groupId: string): Promise<(Membership & { customerName?: string; customerMobile?: string })[]> {
    // 1. Get confirmed previous winners in this specific chit group
    const prevWinners = await query<any>(
      `SELECT winner_membership_id FROM kuzhukkal_draws WHERE group_id COLLATE utf8mb4_unicode_ci = ? AND status = 'Confirmed'`,
      [groupId]
    );
    const excludedMembershipIds = new Set(prevWinners.map((w: any) => String(w.winner_membership_id)));

    // 2. Fetch all memberships in this group
    const allMembers = await db.getMemberships(groupId);

    // 3. Filter eligible: active or prized, not cancelled/completed, AND NOT in previous winners
    return allMembers.filter(m => {
      if (m.status !== 'active' && m.status !== 'prized') return false;
      if (excludedMembershipIds.has(String(m.membershipId))) return false;
      return true;
    });
  },

  async getKuzhukkalContext(groupId: string): Promise<KuzhukkalContext> {
    const group = await db.getChitGroupById(groupId);
    if (!group) throw new Error('Chit group not found');

    const previousWinners = await db.getKuzhukkalDraws(groupId);
    const confirmedWinners = previousWinners.filter(w => w.status === 'Confirmed');
    const eligibleMembers = await db.getEligibleKuzhukkalMembers(groupId);
    const allMembers = await db.getMemberships(groupId);

    // Current draw sequence is confirmed draws + 1, capped at durationMonths
    const maxSeq = confirmedWinners.reduce((max, w) => Math.max(max, w.drawSequence), 0);
    const currentDrawSequence = Math.min(group.durationMonths, maxSeq + 1);

    return {
      groupId: group.groupId,
      groupName: group.groupName,
      chitValue: group.chitValue,
      numMembers: group.numMembers,
      durationMonths: group.durationMonths,
      currentDrawSequence,
      totalMembersCount: allMembers.length,
      eligibleMembersCount: eligibleMembers.length,
      previousWinnersCount: confirmedWinners.length,
      previousWinners,
      eligibleMembers,
    };
  },

  async recordKuzhukkalDraw(data: any, actor: User): Promise<KuzhukkalDraw> {
    const { groupId, drawSequence, drawMethod, winnerMembershipId, prizeTitle, prizeAmount, remarks, drawDate } = data;
    const group = await db.getChitGroupById(groupId);
    if (!group) throw new Error('Chit group not found');

    const mem = await db.getMembershipById(winnerMembershipId);
    if (!mem || mem.groupId !== groupId) throw new Error('Selected winner membership does not belong to this chit group');

    // 1. Strict Winner Exclusion Rule: Ensure this member has not already won in this group
    const alreadyWon = await queryOne<any>(
      `SELECT draw_id, draw_sequence FROM kuzhukkal_draws WHERE group_id COLLATE utf8mb4_unicode_ci = ? AND winner_membership_id COLLATE utf8mb4_unicode_ci = ? AND status = 'Confirmed'`,
      [groupId, winnerMembershipId]
    );
    if (alreadyWon) {
      throw new Error(`Winner Exclusion Rule: Subscriber (${mem.customerName || mem.customerId}, Ticket #${mem.ticketNumber}) has already won Draw #${alreadyWon.draw_sequence} (${alreadyWon.draw_id}) in this chit group and cannot win again.`);
    }

    // 2. Ensure this draw sequence is not already confirmed
    const seq = Number(drawSequence);
    const existingSeq = await queryOne<any>(
      `SELECT draw_id FROM kuzhukkal_draws WHERE group_id COLLATE utf8mb4_unicode_ci = ? AND draw_sequence = ? AND status = 'Confirmed'`,
      [groupId, seq]
    );
    if (existingSeq) {
      throw new Error(`Draw Sequence #${seq} has already been confirmed for this chit group in Draw ${existingSeq.draw_id}.`);
    }

    // 3. Generate unique Draw ID: KUZ-YYYY-XXX
    const maxDraw = await queryOne<any>(
      `SELECT draw_id FROM kuzhukkal_draws WHERE draw_id REGEXP '^KUZ-[0-9]{4}-[0-9]+$' ORDER BY CAST(SUBSTRING(draw_id, 10) AS UNSIGNED) DESC LIMIT 1`
    );
    let nextNum = 1;
    if (maxDraw?.draw_id) {
      const parts = maxDraw.draw_id.split('-');
      const pNum = parseInt(parts[2], 10);
      if (!isNaN(pNum)) nextNum = pNum + 1;
    }
    const year = new Date().getFullYear();
    let drawId = `KUZ-${year}-${String(nextNum).padStart(3, '0')}`;
    while (await queryOne('SELECT 1 FROM kuzhukkal_draws WHERE draw_id = ?', [drawId])) {
      nextNum++;
      drawId = `KUZ-${year}-${String(nextNum).padStart(3, '0')}`;
    }

    const dDate = drawDate || today();
    const pAmt = Number(prizeAmount || 0);

    await execute(
      `INSERT INTO kuzhukkal_draws
        (draw_id, group_id, draw_sequence, draw_date, draw_method,
         winner_membership_id, winner_customer_id, ticket_number,
         prize_title, prize_amount, status, conducted_by_user_id,
         confirmed_by_user_id, confirmed_at, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Confirmed', ?, ?, NOW(), ?)`,
      [
        drawId, groupId, seq, dDate, drawMethod || 'digital',
        mem.membershipId, mem.customerId, mem.ticketNumber,
        prizeTitle || 'Kuzhukkal Winner Prize', pAmt, actor.id,
        actor.id, remarks || null
      ]
    );

    // CRITICAL REQUIREMENT PRESERVED:
    // The winning member remains active and continues paying all remaining installments.
    // We DO NOT change membership status to completed or cancelled.
    // We DO NOT zero out or cancel future installments.

    await db.logAudit(actor.id, actor.username, 'RECORD_KUZHUKKAL_DRAW', 'KUZHUKKAL', drawId, null, {
      groupId, drawSequence: seq, drawMethod, winnerMembershipId, ticketNumber: mem.ticketNumber, prizeAmount: pAmt
    });

    const created = await queryOne<any>(
      `SELECT kd.*, cg.group_name, c.full_name AS winner_customer_name, c.mobile_number AS winner_customer_mobile,
              u1.full_name AS conducted_by_name, u2.full_name AS confirmed_by_name
       FROM kuzhukkal_draws kd
       LEFT JOIN chit_groups cg ON kd.group_id COLLATE utf8mb4_unicode_ci = cg.group_id COLLATE utf8mb4_unicode_ci
       LEFT JOIN customers c ON kd.winner_customer_id COLLATE utf8mb4_unicode_ci = c.customer_id COLLATE utf8mb4_unicode_ci
       LEFT JOIN users u1 ON kd.conducted_by_user_id = u1.id
       LEFT JOIN users u2 ON kd.confirmed_by_user_id = u2.id
       WHERE kd.draw_id = ?`,
      [drawId]
    );

    return mapKuzhukkalDraw(created!);
  },

  async cancelKuzhukkalDraw(drawId: string, actor: User): Promise<KuzhukkalDraw> {
    const existing = await queryOne<any>('SELECT * FROM kuzhukkal_draws WHERE draw_id = ?', [drawId]);
    if (!existing) throw new Error('Draw record not found');
    if (existing.status === 'Cancelled') throw new Error('Draw record is already cancelled');

    await execute(`UPDATE kuzhukkal_draws SET status = 'Cancelled' WHERE draw_id = ?`, [drawId]);
    await db.logAudit(actor.id, actor.username, 'CANCEL_KUZHUKKAL_DRAW', 'KUZHUKKAL', drawId, existing, { status: 'Cancelled' });

    const updated = await queryOne<any>(
      `SELECT kd.*, cg.group_name, c.full_name AS winner_customer_name, c.mobile_number AS winner_customer_mobile,
              u1.full_name AS conducted_by_name, u2.full_name AS confirmed_by_name
       FROM kuzhukkal_draws kd
       LEFT JOIN chit_groups cg ON kd.group_id COLLATE utf8mb4_unicode_ci = cg.group_id COLLATE utf8mb4_unicode_ci
       LEFT JOIN customers c ON kd.winner_customer_id COLLATE utf8mb4_unicode_ci = c.customer_id COLLATE utf8mb4_unicode_ci
       LEFT JOIN users u1 ON kd.conducted_by_user_id = u1.id
       LEFT JOIN users u2 ON kd.confirmed_by_user_id = u2.id
       WHERE kd.draw_id = ?`,
      [drawId]
    );

    return mapKuzhukkalDraw(updated!);
  }
};



