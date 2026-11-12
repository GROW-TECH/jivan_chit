-- ==============================================================================
-- BASIC CHIT FUND MANAGEMENT SYSTEM - DATABASE SCHEMA (MySQL 8.0+)
-- ==============================================================================
-- Normalized schema for Chit Fund management
-- Includes tables for Users, Customers, Chit Groups, Memberships,
-- Installments, Payments, Auctions, Dividends, Prize Payments,
-- Expenses, Notifications, and Audit Logs.
-- All financial values use DECIMAL(12, 2) to guarantee precision.
-- ==============================================================================

-- Database creation handled by cPanel (Database: jivanchitfunds_db)

-- 1. USERS TABLE
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `expenses`;
DROP TABLE IF EXISTS `prize_payments`;
DROP TABLE IF EXISTS `dividends`;
DROP TABLE IF EXISTS `auctions`;
DROP TABLE IF EXISTS `payments`;
DROP TABLE IF EXISTS `installments`;
DROP TABLE IF EXISTS `memberships`;
DROP TABLE IF EXISTS `chit_groups`;
DROP TABLE IF EXISTS `customers`;
DROP TABLE IF EXISTS `company_settings`;
DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `role` ENUM('admin', 'staff') NOT NULL DEFAULT 'staff',
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `last_login` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_user_role` (`role`),
  INDEX `idx_user_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. COMPANY SETTINGS TABLE
CREATE TABLE `company_settings` (
  `id` INT PRIMARY KEY DEFAULT 1,
  `company_name` VARCHAR(150) NOT NULL,
  `address` TEXT NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `currency_symbol` VARCHAR(5) NOT NULL DEFAULT '₹',
  `financial_year` VARCHAR(20) NOT NULL DEFAULT '2025-2026',
  `default_commission_percent` DECIMAL(5, 2) NOT NULL DEFAULT 5.00,
  `receipt_prefix` VARCHAR(10) NOT NULL DEFAULT 'REC',
  `customer_id_prefix` VARCHAR(10) NOT NULL DEFAULT 'CUST',
  `membership_id_prefix` VARCHAR(10) NOT NULL DEFAULT 'MEM',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. CUSTOMERS TABLE
CREATE TABLE `customers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `customer_id` VARCHAR(30) NOT NULL UNIQUE,
  `full_name` VARCHAR(120) NOT NULL,
  `mobile_number` VARCHAR(15) NOT NULL,
  `alternate_mobile` VARCHAR(15) NULL,
  `email` VARCHAR(100) NULL,
  `dob` DATE NULL,
  `gender` ENUM('Male', 'Female', 'Other') NOT NULL DEFAULT 'Male',
  `address` TEXT NOT NULL,
  `city` VARCHAR(60) NOT NULL,
  `pincode` VARCHAR(10) NOT NULL,
  `id_proof_type` ENUM('Aadhaar', 'PAN', 'Voter ID', 'Passport', 'Driving License') NOT NULL DEFAULT 'Aadhaar',
  `id_proof_number` VARCHAR(50) NOT NULL,
  `nominee_name` VARCHAR(100) NOT NULL,
  `nominee_relationship` VARCHAR(50) NOT NULL,
  `nominee_mobile` VARCHAR(15) NOT NULL,
  `joining_date` DATE NOT NULL,
  `google_map_link` TEXT NULL,
  `co_applicant_name` VARCHAR(120) NULL,
  `co_applicant_mobile` VARCHAR(15) NULL,
  `co_applicant_address` TEXT NULL,
  `co_applicant_map_link` TEXT NULL,
  `security1_name` VARCHAR(120) NULL,
  `security1_mobile` VARCHAR(15) NULL,
  `security1_address` TEXT NULL,
  `security1_map_link` TEXT NULL,
  `security1_photo` TEXT NULL,
  `security2_name` VARCHAR(120) NULL,
  `security2_mobile` VARCHAR(15) NULL,
  `security2_address` TEXT NULL,
  `security2_map_link` TEXT NULL,
  `security2_photo` TEXT NULL,
  `remarks` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_customer_mobile` (`mobile_number`),
  INDEX `idx_customer_status` (`status`),
  INDEX `idx_customer_name` (`full_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. CHIT GROUPS TABLE
CREATE TABLE `chit_groups` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `group_id` VARCHAR(30) NOT NULL UNIQUE,
  `group_name` VARCHAR(100) NOT NULL,
  `chit_value` DECIMAL(12, 2) NOT NULL,
  `num_members` INT NOT NULL,
  `monthly_installment` DECIMAL(12, 2) NOT NULL,
  `duration_months` INT NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `auction_day_of_month` INT NOT NULL DEFAULT 10,
  `auction_frequency` VARCHAR(30) NOT NULL DEFAULT 'Monthly',
  `foreman_commission_percent` DECIMAL(5, 2) NOT NULL DEFAULT 5.00,
  `status` ENUM('Upcoming', 'Active', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Upcoming',
  `description` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_group_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. MEMBERSHIPS TABLE
CREATE TABLE `memberships` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `membership_id` VARCHAR(30) NOT NULL UNIQUE,
  `customer_id` VARCHAR(30) NOT NULL,
  `group_id` VARCHAR(30) NOT NULL,
  `ticket_number` INT NOT NULL,
  `joining_date` DATE NOT NULL,
  `installment_amount` DECIMAL(12, 2) NOT NULL,
  `total_installments` INT NOT NULL,
  `paid_installments` INT NOT NULL DEFAULT 0,
  `pending_installments` INT NOT NULL,
  `total_paid` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `total_pending` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `status` ENUM('active', 'prized', 'completed', 'cancelled') NOT NULL DEFAULT 'active',
  `is_duplicate_allowed` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`) ON UPDATE CASCADE,
  FOREIGN KEY (`group_id`) REFERENCES `chit_groups` (`group_id`) ON UPDATE CASCADE,
  UNIQUE KEY `uniq_group_ticket` (`group_id`, `ticket_number`),
  INDEX `idx_member_customer` (`customer_id`),
  INDEX `idx_member_group` (`group_id`),
  INDEX `idx_member_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. INSTALLMENTS TABLE
CREATE TABLE `installments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `installment_id` VARCHAR(40) NOT NULL UNIQUE,
  `membership_id` VARCHAR(30) NOT NULL,
  `customer_id` VARCHAR(30) NOT NULL,
  `group_id` VARCHAR(30) NOT NULL,
  `month_number` INT NOT NULL,
  `due_date` DATE NOT NULL,
  `installment_amount` DECIMAL(12, 2) NOT NULL,
  `dividend_deduction` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `net_due_amount` DECIMAL(12, 2) NOT NULL,
  `paid_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `payment_date` DATE NULL,
  `payment_mode` ENUM('Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Other') NULL,
  `receipt_number` VARCHAR(50) NULL,
  `status` ENUM('Pending', 'Partially Paid', 'Paid', 'Overdue') NOT NULL DEFAULT 'Pending',
  `remarks` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`membership_id`) REFERENCES `memberships` (`membership_id`) ON UPDATE CASCADE,
  FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`) ON UPDATE CASCADE,
  FOREIGN KEY (`group_id`) REFERENCES `chit_groups` (`group_id`) ON UPDATE CASCADE,
  INDEX `idx_inst_status` (`status`),
  INDEX `idx_inst_due_date` (`due_date`),
  INDEX `idx_inst_member` (`membership_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. PAYMENTS TABLE
CREATE TABLE `payments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `receipt_number` VARCHAR(50) NOT NULL UNIQUE,
  `installment_id` VARCHAR(40) NOT NULL,
  `membership_id` VARCHAR(30) NOT NULL,
  `customer_id` VARCHAR(30) NOT NULL,
  `group_id` VARCHAR(30) NOT NULL,
  `amount_paid` DECIMAL(12, 2) NOT NULL,
  `previous_balance` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `remaining_balance` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `payment_mode` ENUM('Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Other') NOT NULL DEFAULT 'Cash',
  `transaction_reference` VARCHAR(100) NULL,
  `payment_date` DATE NOT NULL,
  `collected_by_user_id` INT NOT NULL,
  `status` ENUM('active', 'reversed', 'cancelled') NOT NULL DEFAULT 'active',
  `reversal_reason` TEXT NULL,
  `remarks` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`membership_id`) REFERENCES `memberships` (`membership_id`) ON UPDATE CASCADE,
  FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`) ON UPDATE CASCADE,
  FOREIGN KEY (`group_id`) REFERENCES `chit_groups` (`group_id`) ON UPDATE CASCADE,
  FOREIGN KEY (`collected_by_user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  INDEX `idx_pay_date` (`payment_date`),
  INDEX `idx_pay_mode` (`payment_mode`),
  INDEX `idx_pay_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. AUCTIONS TABLE
CREATE TABLE `auctions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `auction_id` VARCHAR(40) NOT NULL UNIQUE,
  `group_id` VARCHAR(30) NOT NULL,
  `auction_number` INT NOT NULL,
  `auction_date` DATE NOT NULL,
  `chit_value` DECIMAL(12, 2) NOT NULL,
  `bid_discount_amount` DECIMAL(12, 2) NOT NULL,
  `prize_amount` DECIMAL(12, 2) NOT NULL,
  `foreman_commission` DECIMAL(12, 2) NOT NULL,
  `dividend_amount` DECIMAL(12, 2) NOT NULL,
  `dividend_per_member` DECIMAL(12, 2) NOT NULL,
  `winner_membership_id` VARCHAR(30) NOT NULL,
  `winner_customer_id` VARCHAR(30) NOT NULL,
  `ticket_number` INT NOT NULL,
  `status` ENUM('Scheduled', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Completed',
  `remarks` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`group_id`) REFERENCES `chit_groups` (`group_id`) ON UPDATE CASCADE,
  FOREIGN KEY (`winner_membership_id`) REFERENCES `memberships` (`membership_id`) ON UPDATE CASCADE,
  FOREIGN KEY (`winner_customer_id`) REFERENCES `customers` (`customer_id`) ON UPDATE CASCADE,
  UNIQUE KEY `uniq_group_auction_num` (`group_id`, `auction_number`),
  INDEX `idx_auc_date` (`auction_date`),
  INDEX `idx_auc_group` (`group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. DIVIDENDS TABLE
CREATE TABLE `dividends` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `dividend_id` VARCHAR(40) NOT NULL UNIQUE,
  `auction_id` VARCHAR(40) NOT NULL,
  `group_id` VARCHAR(30) NOT NULL,
  `total_discount` DECIMAL(12, 2) NOT NULL,
  `foreman_commission` DECIMAL(12, 2) NOT NULL,
  `distributable_dividend` DECIMAL(12, 2) NOT NULL,
  `num_eligible_members` INT NOT NULL,
  `dividend_per_member` DECIMAL(12, 2) NOT NULL,
  `month_number` INT NOT NULL,
  `status` ENUM('Pending Review', 'Confirmed', 'Distributed') NOT NULL DEFAULT 'Confirmed',
  `confirmed_by_user_id` INT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`auction_id`) REFERENCES `auctions` (`auction_id`) ON UPDATE CASCADE,
  FOREIGN KEY (`group_id`) REFERENCES `chit_groups` (`group_id`) ON UPDATE CASCADE,
  FOREIGN KEY (`confirmed_by_user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  INDEX `idx_div_group` (`group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. PRIZE PAYMENTS TABLE
CREATE TABLE `prize_payments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `prize_payment_id` VARCHAR(40) NOT NULL UNIQUE,
  `auction_id` VARCHAR(40) NOT NULL,
  `group_id` VARCHAR(30) NOT NULL,
  `winner_customer_id` VARCHAR(30) NOT NULL,
  `winner_membership_id` VARCHAR(30) NOT NULL,
  `ticket_number` INT NOT NULL,
  `auction_number` INT NOT NULL,
  `chit_value` DECIMAL(12, 2) NOT NULL,
  `discount_amount` DECIMAL(12, 2) NOT NULL,
  `prize_amount` DECIMAL(12, 2) NOT NULL,
  `paid_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `disbursal_date` DATE NULL,
  `payment_status` ENUM('Pending', 'Partially Paid', 'Paid') NOT NULL DEFAULT 'Pending',
  `payment_mode` ENUM('Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Other') NULL,
  `transaction_reference` VARCHAR(100) NULL,
  `remarks` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`auction_id`) REFERENCES `auctions` (`auction_id`) ON UPDATE CASCADE,
  FOREIGN KEY (`group_id`) REFERENCES `chit_groups` (`group_id`) ON UPDATE CASCADE,
  FOREIGN KEY (`winner_customer_id`) REFERENCES `customers` (`customer_id`) ON UPDATE CASCADE,
  FOREIGN KEY (`winner_membership_id`) REFERENCES `memberships` (`membership_id`) ON UPDATE CASCADE,
  INDEX `idx_prize_status` (`payment_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. EXPENSES TABLE
CREATE TABLE `expenses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `expense_id` VARCHAR(40) NOT NULL UNIQUE,
  `expense_date` DATE NOT NULL,
  `category` ENUM('Office Expense', 'Salary', 'Rent', 'Travel', 'Marketing', 'Bank Charges', 'Other') NOT NULL,
  `description` TEXT NOT NULL,
  `amount` DECIMAL(12, 2) NOT NULL,
  `payment_mode` ENUM('Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Other') NOT NULL DEFAULT 'Cash',
  `reference_number` VARCHAR(100) NULL,
  `remarks` TEXT NULL,
  `created_by_user_id` INT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  INDEX `idx_exp_date` (`expense_date`),
  INDEX `idx_exp_cat` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. NOTIFICATIONS TABLE
CREATE TABLE `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `notification_id` VARCHAR(40) NOT NULL UNIQUE,
  `type` ENUM('upcoming_installment', 'overdue_installment', 'upcoming_auction', 'pending_prize_payment', 'general') NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `message` TEXT NOT NULL,
  `related_id` VARCHAR(50) NULL,
  `due_date` DATE NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_notif_read` (`is_read`),
  INDEX `idx_notif_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. AUDIT LOGS TABLE
CREATE TABLE `audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `username` VARCHAR(50) NOT NULL,
  `action` VARCHAR(50) NOT NULL,
  `module` VARCHAR(50) NOT NULL,
  `record_id` VARCHAR(50) NOT NULL,
  `old_value` JSON NULL,
  `new_value` JSON NULL,
  `ip_address` VARCHAR(45) NULL,
  `timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_audit_module` (`module`),
  INDEX `idx_audit_user` (`user_id`),
  INDEX `idx_audit_time` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
