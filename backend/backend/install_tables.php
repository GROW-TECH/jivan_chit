<?php
// ============================================================
// ONE-TIME TABLE INSTALLER SCRIPT
// Upload this file to your server and visit:
//   http://xiadot.com/backend/install_tables.php
// DELETE THIS FILE after tables are created!
// ============================================================

$host    = 'xiadot.com';
$user    = 'chit_db';
$pass    = 'chit_software';
$db      = 'chit_db';
$port    = 3306;
$charset = 'utf8mb4';

$dsn     = "mysql:host=$host;port=$port;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
];

$results = [];
$errors  = [];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
    $results[] = ['status' => 'ok', 'msg' => "Connected to database '$db' on host '$host'"];
} catch (PDOException $e) {
    die(renderPage([['status'=>'err','msg'=>'Connection failed: '.$e->getMessage()]], []));
}

// All SQL statements to execute
$sqls = [

'Drop old tables (safe order)' => "
SET FOREIGN_KEY_CHECKS=0;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS prize_payments;
DROP TABLE IF EXISTS dividends;
DROP TABLE IF EXISTS auctions;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS installments;
DROP TABLE IF EXISTS memberships;
DROP TABLE IF EXISTS chit_groups;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS company_settings;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS=1;
",

'Create users table' => "
CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(100) NOT NULL UNIQUE,
  role          ENUM('admin','staff') NOT NULL DEFAULT 'staff',
  status        ENUM('active','inactive') NOT NULL DEFAULT 'active',
  last_login    DATETIME NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_role   (role),
  INDEX idx_user_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
",

'Insert default admin user (password: admin123)' => "
INSERT INTO users (username, password_hash, full_name, email, role, status) VALUES
('admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'System Administrator', 'admin@chitfund.com', 'admin', 'active'),
('staff', '10176e7b7b24d317acfcf8d2064cfd2f24e154f7b5a96603077d5ef813d6a6b6', 'Staff User', 'staff@chitfund.com', 'staff', 'active');
",

'Create company_settings table' => "
CREATE TABLE company_settings (
  id                         INT PRIMARY KEY DEFAULT 1,
  company_name               VARCHAR(150) NOT NULL,
  address                    TEXT NOT NULL,
  phone                      VARCHAR(20)  NOT NULL,
  email                      VARCHAR(100) NOT NULL,
  currency_symbol            VARCHAR(5)   NOT NULL DEFAULT '₹',
  financial_year             VARCHAR(20)  NOT NULL DEFAULT '2025-2026',
  default_commission_percent DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  receipt_prefix             VARCHAR(10)  NOT NULL DEFAULT 'REC',
  customer_id_prefix         VARCHAR(10)  NOT NULL DEFAULT 'CUST',
  membership_id_prefix       VARCHAR(10)  NOT NULL DEFAULT 'MEM',
  updated_at                 DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
",

'Insert company settings' => "
INSERT INTO company_settings VALUES (
  1, 'Chit Fund Management System',
  '123 Main Street, City, State - 600001',
  '+91-9876543210', 'info@chitfund.com',
  '₹', '2025-2026', 5.00, 'REC', 'CUST', 'MEM', NOW()
);
",

'Create customers table' => "
CREATE TABLE customers (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  customer_id          VARCHAR(30)  NOT NULL UNIQUE,
  full_name            VARCHAR(120) NOT NULL,
  mobile_number        VARCHAR(15)  NOT NULL,
  alternate_mobile     VARCHAR(15)  NULL,
  email                VARCHAR(100) NULL,
  dob                  DATE NULL,
  gender               ENUM('Male','Female','Other') NOT NULL DEFAULT 'Male',
  address              TEXT NOT NULL,
  city                 VARCHAR(60)  NOT NULL,
  pincode              VARCHAR(10)  NOT NULL,
  id_proof_type        ENUM('Aadhaar','PAN','Voter ID','Passport','Driving License') NOT NULL DEFAULT 'Aadhaar',
  id_proof_number      VARCHAR(50)  NOT NULL,
  nominee_name         VARCHAR(100) NOT NULL,
  nominee_relationship VARCHAR(50)  NOT NULL,
  nominee_mobile       VARCHAR(15)  NOT NULL,
  joining_date         DATE NOT NULL,
  status               ENUM('active','inactive') NOT NULL DEFAULT 'active',
  remarks              TEXT NULL,
  created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_customer_mobile (mobile_number),
  INDEX idx_customer_status (status),
  INDEX idx_customer_name   (full_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
",

'Create chit_groups table' => "
CREATE TABLE chit_groups (
  id                         INT AUTO_INCREMENT PRIMARY KEY,
  group_id                   VARCHAR(30)  NOT NULL UNIQUE,
  group_name                 VARCHAR(100) NOT NULL,
  chit_value                 DECIMAL(12,2) NOT NULL,
  num_members                INT NOT NULL,
  monthly_installment        DECIMAL(12,2) NOT NULL,
  duration_months            INT NOT NULL,
  start_date                 DATE NOT NULL,
  end_date                   DATE NOT NULL,
  auction_day_of_month       INT NOT NULL DEFAULT 10,
  auction_frequency          VARCHAR(30)  NOT NULL DEFAULT 'Monthly',
  foreman_commission_percent DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  status                     ENUM('Upcoming','Active','Completed','Cancelled') NOT NULL DEFAULT 'Upcoming',
  description                TEXT NULL,
  created_at                 DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                 DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_group_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
",

'Create memberships table' => "
CREATE TABLE memberships (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  membership_id        VARCHAR(30)   NOT NULL UNIQUE,
  customer_id          VARCHAR(30)   NOT NULL,
  group_id             VARCHAR(30)   NOT NULL,
  ticket_number        INT NOT NULL,
  joining_date         DATE NOT NULL,
  installment_amount   DECIMAL(12,2) NOT NULL,
  total_installments   INT NOT NULL,
  paid_installments    INT NOT NULL DEFAULT 0,
  pending_installments INT NOT NULL,
  total_paid           DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_pending        DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  status               ENUM('active','prized','completed','cancelled') NOT NULL DEFAULT 'active',
  is_duplicate_allowed TINYINT(1) NOT NULL DEFAULT 0,
  created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers   (customer_id) ON UPDATE CASCADE,
  FOREIGN KEY (group_id)    REFERENCES chit_groups (group_id)    ON UPDATE CASCADE,
  UNIQUE KEY uniq_group_ticket (group_id, ticket_number),
  INDEX idx_member_customer (customer_id),
  INDEX idx_member_group    (group_id),
  INDEX idx_member_status   (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
",

'Create installments table' => "
CREATE TABLE installments (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  installment_id      VARCHAR(40)   NOT NULL UNIQUE,
  membership_id       VARCHAR(30)   NOT NULL,
  customer_id         VARCHAR(30)   NOT NULL,
  group_id            VARCHAR(30)   NOT NULL,
  month_number        INT NOT NULL,
  due_date            DATE NOT NULL,
  installment_amount  DECIMAL(12,2) NOT NULL,
  dividend_deduction  DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  net_due_amount      DECIMAL(12,2) NOT NULL,
  paid_amount         DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  payment_date        DATE NULL,
  payment_mode        ENUM('Cash','UPI','Bank Transfer','Cheque','Other') NULL,
  receipt_number      VARCHAR(50)   NULL,
  status              ENUM('Pending','Partially Paid','Paid','Overdue') NOT NULL DEFAULT 'Pending',
  remarks             TEXT NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (membership_id) REFERENCES memberships  (membership_id) ON UPDATE CASCADE,
  FOREIGN KEY (customer_id)   REFERENCES customers    (customer_id)   ON UPDATE CASCADE,
  FOREIGN KEY (group_id)      REFERENCES chit_groups  (group_id)      ON UPDATE CASCADE,
  INDEX idx_inst_status   (status),
  INDEX idx_inst_due_date (due_date),
  INDEX idx_inst_member   (membership_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
",

'Create payments table' => "
CREATE TABLE payments (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  receipt_number        VARCHAR(50)   NOT NULL UNIQUE,
  installment_id        VARCHAR(40)   NOT NULL,
  membership_id         VARCHAR(30)   NOT NULL,
  customer_id           VARCHAR(30)   NOT NULL,
  group_id              VARCHAR(30)   NOT NULL,
  amount_paid           DECIMAL(12,2) NOT NULL,
  previous_balance      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  remaining_balance     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  payment_mode          ENUM('Cash','UPI','Bank Transfer','Cheque','Other') NOT NULL DEFAULT 'Cash',
  transaction_reference VARCHAR(100)  NULL,
  payment_date          DATE NOT NULL,
  collected_by_user_id  INT NOT NULL,
  status                ENUM('active','reversed','cancelled') NOT NULL DEFAULT 'active',
  reversal_reason       TEXT NULL,
  remarks               TEXT NULL,
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (membership_id)        REFERENCES memberships  (membership_id) ON UPDATE CASCADE,
  FOREIGN KEY (customer_id)          REFERENCES customers    (customer_id)   ON UPDATE CASCADE,
  FOREIGN KEY (group_id)             REFERENCES chit_groups  (group_id)      ON UPDATE CASCADE,
  FOREIGN KEY (collected_by_user_id) REFERENCES users        (id)            ON UPDATE CASCADE,
  INDEX idx_pay_date   (payment_date),
  INDEX idx_pay_mode   (payment_mode),
  INDEX idx_pay_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
",

'Create auctions table' => "
CREATE TABLE auctions (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  auction_id           VARCHAR(40)   NOT NULL UNIQUE,
  group_id             VARCHAR(30)   NOT NULL,
  auction_number       INT NOT NULL,
  auction_date         DATE NOT NULL,
  chit_value           DECIMAL(12,2) NOT NULL,
  bid_discount_amount  DECIMAL(12,2) NOT NULL,
  prize_amount         DECIMAL(12,2) NOT NULL,
  foreman_commission   DECIMAL(12,2) NOT NULL,
  dividend_amount      DECIMAL(12,2) NOT NULL,
  dividend_per_member  DECIMAL(12,2) NOT NULL,
  winner_membership_id VARCHAR(30)   NOT NULL,
  winner_customer_id   VARCHAR(30)   NOT NULL,
  ticket_number        INT NOT NULL,
  status               ENUM('Scheduled','Completed','Cancelled') NOT NULL DEFAULT 'Completed',
  remarks              TEXT NULL,
  created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id)             REFERENCES chit_groups  (group_id)       ON UPDATE CASCADE,
  FOREIGN KEY (winner_membership_id) REFERENCES memberships  (membership_id)  ON UPDATE CASCADE,
  FOREIGN KEY (winner_customer_id)   REFERENCES customers    (customer_id)    ON UPDATE CASCADE,
  UNIQUE KEY uniq_group_auction_num (group_id, auction_number),
  INDEX idx_auc_date  (auction_date),
  INDEX idx_auc_group (group_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
",

'Create dividends table' => "
CREATE TABLE dividends (
  id                     INT AUTO_INCREMENT PRIMARY KEY,
  dividend_id            VARCHAR(40)   NOT NULL UNIQUE,
  auction_id             VARCHAR(40)   NOT NULL,
  group_id               VARCHAR(30)   NOT NULL,
  total_discount         DECIMAL(12,2) NOT NULL,
  foreman_commission     DECIMAL(12,2) NOT NULL,
  distributable_dividend DECIMAL(12,2) NOT NULL,
  num_eligible_members   INT NOT NULL,
  dividend_per_member    DECIMAL(12,2) NOT NULL,
  month_number           INT NOT NULL,
  status                 ENUM('Pending Review','Confirmed','Distributed') NOT NULL DEFAULT 'Confirmed',
  confirmed_by_user_id   INT NOT NULL,
  created_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (auction_id)           REFERENCES auctions    (auction_id) ON UPDATE CASCADE,
  FOREIGN KEY (group_id)             REFERENCES chit_groups (group_id)   ON UPDATE CASCADE,
  FOREIGN KEY (confirmed_by_user_id) REFERENCES users       (id)         ON UPDATE CASCADE,
  INDEX idx_div_group (group_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
",

'Create prize_payments table' => "
CREATE TABLE prize_payments (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  prize_payment_id      VARCHAR(40)   NOT NULL UNIQUE,
  auction_id            VARCHAR(40)   NOT NULL,
  group_id              VARCHAR(30)   NOT NULL,
  winner_customer_id    VARCHAR(30)   NOT NULL,
  winner_membership_id  VARCHAR(30)   NOT NULL,
  ticket_number         INT NOT NULL,
  auction_number        INT NOT NULL,
  chit_value            DECIMAL(12,2) NOT NULL,
  discount_amount       DECIMAL(12,2) NOT NULL,
  prize_amount          DECIMAL(12,2) NOT NULL,
  paid_amount           DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  disbursal_date        DATE NULL,
  payment_status        ENUM('Pending','Partially Paid','Paid') NOT NULL DEFAULT 'Pending',
  payment_mode          ENUM('Cash','UPI','Bank Transfer','Cheque','Other') NULL,
  transaction_reference VARCHAR(100)  NULL,
  remarks               TEXT NULL,
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (auction_id)           REFERENCES auctions    (auction_id)    ON UPDATE CASCADE,
  FOREIGN KEY (group_id)             REFERENCES chit_groups (group_id)      ON UPDATE CASCADE,
  FOREIGN KEY (winner_customer_id)   REFERENCES customers   (customer_id)   ON UPDATE CASCADE,
  FOREIGN KEY (winner_membership_id) REFERENCES memberships (membership_id) ON UPDATE CASCADE,
  INDEX idx_prize_status (payment_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
",

'Create expenses table' => "
CREATE TABLE expenses (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  expense_id          VARCHAR(40) NOT NULL UNIQUE,
  expense_date        DATE NOT NULL,
  category            ENUM('Office Expense','Salary','Rent','Travel','Marketing','Bank Charges','Other') NOT NULL,
  description         TEXT NOT NULL,
  amount              DECIMAL(12,2) NOT NULL,
  payment_mode        ENUM('Cash','UPI','Bank Transfer','Cheque','Other') NOT NULL DEFAULT 'Cash',
  reference_number    VARCHAR(100) NULL,
  remarks             TEXT NULL,
  created_by_user_id  INT NOT NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON UPDATE CASCADE,
  INDEX idx_exp_date (expense_date),
  INDEX idx_exp_cat  (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
",

'Create notifications table' => "
CREATE TABLE notifications (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  notification_id VARCHAR(40) NOT NULL UNIQUE,
  type            ENUM('upcoming_installment','overdue_installment','upcoming_auction','pending_prize_payment','general') NOT NULL,
  title           VARCHAR(150) NOT NULL,
  message         TEXT NOT NULL,
  related_id      VARCHAR(50)  NULL,
  due_date        DATE NULL,
  is_read         TINYINT(1) NOT NULL DEFAULT 0,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notif_read (is_read),
  INDEX idx_notif_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
",

'Create audit_logs table' => "
CREATE TABLE audit_logs (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  username   VARCHAR(50) NOT NULL,
  action     VARCHAR(50) NOT NULL,
  module     VARCHAR(50) NOT NULL,
  record_id  VARCHAR(50) NOT NULL,
  old_value  JSON NULL,
  new_value  JSON NULL,
  ip_address VARCHAR(45) NULL,
  timestamp  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_module (module),
  INDEX idx_audit_user   (user_id),
  INDEX idx_audit_time   (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
",

];

// Execute each statement
foreach ($sqls as $label => $sql) {
    // Split on semicolons to handle multi-statement blocks
    $statements = array_filter(array_map('trim', explode(';', $sql)));
    foreach ($statements as $stmt) {
        if (empty($stmt)) continue;
        try {
            $pdo->exec($stmt);
        } catch (PDOException $e) {
            $errors[] = ['label' => $label, 'sql' => substr($stmt, 0, 80).'...', 'error' => $e->getMessage()];
            continue 2;
        }
    }
    $results[] = ['status' => 'ok', 'msg' => "✅ $label"];
}

// Verify tables
$tables = ['users','company_settings','customers','chit_groups','memberships',
           'installments','payments','auctions','dividends','prize_payments',
           'expenses','notifications','audit_logs'];

$tableStatus = [];
foreach ($tables as $t) {
    try {
        $count = $pdo->query("SELECT COUNT(*) FROM `$t`")->fetchColumn();
        $tableStatus[] = ['table' => $t, 'ok' => true, 'rows' => $count];
    } catch (Exception $e) {
        $tableStatus[] = ['table' => $t, 'ok' => false, 'rows' => 0];
    }
}

echo renderPage($results, $errors, $tableStatus);

// ---- RENDER ----
function renderPage(array $results, array $errors, array $tables = []): string {
    $allOk = empty($errors);
    ob_start();
    ?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>DB Installer - Chit Fund System</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',sans-serif;background:linear-gradient(135deg,#0a0a1a,#1a0a2e,#0d1a3a);min-height:100vh;padding:40px 20px;color:#fff}
.container{max-width:800px;margin:0 auto}
.header{text-align:center;margin-bottom:40px}
.logo{font-size:2.8rem;font-weight:800;background:linear-gradient(90deg,#a78bfa,#60a5fa,#34d399);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px}
.sub{color:rgba(255,255,255,0.45);font-size:.95rem}
.banner{border-radius:16px;padding:20px 24px;margin-bottom:24px;text-align:center;font-weight:700;font-size:1.2rem}
.banner.ok{background:linear-gradient(135deg,rgba(52,211,153,0.2),rgba(16,185,129,0.1));border:1px solid rgba(52,211,153,0.4);color:#34d399}
.banner.err{background:linear-gradient(135deg,rgba(248,113,113,0.2),rgba(239,68,68,0.1));border:1px solid rgba(248,113,113,0.4);color:#f87171}
.card{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:24px;margin-bottom:20px}
.card-title{font-weight:700;font-size:1rem;margin-bottom:16px;color:rgba(255,255,255,0.8);display:flex;align-items:center;gap:8px}
.log-item{display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:.85rem}
.log-item:last-child{border-bottom:none}
.dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:4px}
.dot-ok{background:#34d399}
.dot-err{background:#f87171}
table{width:100%;border-collapse:collapse}
th,td{padding:10px 14px;text-align:left;font-size:.85rem}
th{color:rgba(255,255,255,0.4);font-weight:500;text-transform:uppercase;font-size:.73rem;letter-spacing:.05em;border-bottom:1px solid rgba(255,255,255,0.1)}
td{border-bottom:1px solid rgba(255,255,255,0.05);color:rgba(255,255,255,0.8)}
.badge{display:inline-block;padding:2px 10px;border-radius:20px;font-size:.73rem;font-weight:600}
.badge-ok{background:rgba(52,211,153,0.15);color:#34d399}
.badge-err{background:rgba(248,113,113,0.15);color:#f87171}
.warning{background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.3);border-radius:12px;padding:16px 20px;margin-top:20px;color:#fbbf24;font-size:.87rem;line-height:1.6}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="logo">🏦 Chit Fund System</div>
    <div class="sub">Database Table Installer — xiadot.com &rarr; chit_db</div>
  </div>

  <div class="banner <?= $allOk ? 'ok' : 'err' ?>">
    <?= $allOk ? '✅ All tables created successfully in chit_db!' : '❌ Some steps failed — see details below' ?>
  </div>

  <div class="card">
    <div class="card-title">📋 Installation Log</div>
    <?php foreach ($results as $r): ?>
      <div class="log-item">
        <div class="dot dot-ok"></div>
        <div><?= htmlspecialchars($r['msg']) ?></div>
      </div>
    <?php endforeach; ?>
    <?php foreach ($errors as $e): ?>
      <div class="log-item">
        <div class="dot dot-err"></div>
        <div>
          <strong style="color:#f87171"><?= htmlspecialchars($e['label']) ?></strong><br>
          <span style="color:rgba(255,255,255,0.5);font-size:.8rem"><?= htmlspecialchars($e['error']) ?></span>
        </div>
      </div>
    <?php endforeach; ?>
  </div>

  <?php if (!empty($tables)): ?>
  <div class="card">
    <div class="card-title">📊 Table Verification</div>
    <table>
      <thead><tr><th>#</th><th>Table Name</th><th>Status</th><th>Rows</th></tr></thead>
      <tbody>
        <?php foreach ($tables as $i => $t): ?>
        <tr>
          <td style="color:rgba(255,255,255,0.3)"><?= $i+1 ?></td>
          <td><code style="color:#a78bfa"><?= $t['table'] ?></code></td>
          <td><span class="badge <?= $t['ok'] ? 'badge-ok' : 'badge-err' ?>"><?= $t['ok'] ? 'CREATED' : 'MISSING' ?></span></td>
          <td><?= number_format($t['rows']) ?></td>
        </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
  <?php endif; ?>

  <div class="warning">
    ⚠️ <strong>SECURITY:</strong> Delete this file from your server after the tables are created!<br>
    Path to delete: <code>backend/install_tables.php</code>
  </div>
</div>
</body>
</html>
    <?php
    return ob_get_clean();
}
