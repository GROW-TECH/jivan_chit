<?php
// ============================================================
// DB CONNECTION TEST PAGE
// Visit: http://xiadot.com/backend/test_connection.php
// ============================================================
require_once __DIR__ . '/config/database.php';

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DB Connection Test - Chit Fund System</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Inter', sans-serif;
    background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
  }
  .card {
    background: rgba(255,255,255,0.08);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 20px;
    padding: 48px 40px;
    max-width: 600px;
    width: 90%;
    box-shadow: 0 25px 50px rgba(0,0,0,0.4);
    animation: fadeIn .5s ease;
  }
  @keyframes fadeIn { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
  .logo { font-size: 2.2rem; font-weight: 700; margin-bottom: 8px;
    background: linear-gradient(90deg,#a78bfa,#60a5fa); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
  .subtitle { color: rgba(255,255,255,0.5); font-size: .9rem; margin-bottom: 32px; }
  .status-box { border-radius: 12px; padding: 20px 24px; margin: 12px 0; border-left: 4px solid; }
  .success { background: rgba(52,211,153,0.12); border-color: #34d399; }
  .error   { background: rgba(248,113,113,0.12); border-color: #f87171; }
  .info    { background: rgba(96,165,250,0.12);  border-color: #60a5fa; }
  .status-title { font-weight: 600; font-size: 1rem; margin-bottom: 6px; }
  .success .status-title { color: #34d399; }
  .error   .status-title { color: #f87171; }
  .info    .status-title { color: #60a5fa; }
  .status-detail { font-size: .85rem; color: rgba(255,255,255,0.6); }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; }
  th, td { padding: 10px 14px; text-align: left; font-size: .85rem; border-bottom: 1px solid rgba(255,255,255,0.08); }
  th { color: rgba(255,255,255,0.5); font-weight: 500; text-transform: uppercase; font-size: .75rem; letter-spacing: .05em; }
  td { color: rgba(255,255,255,0.85); }
  .badge { display:inline-block; padding:2px 10px; border-radius:20px; font-size:.75rem; font-weight:600; }
  .badge-ok  { background:rgba(52,211,153,0.2); color:#34d399; }
  .badge-err { background:rgba(248,113,113,0.2); color:#f87171; }
</style>
</head>
<body>
<div class="card">
  <div class="logo">🏦 Chit Fund System</div>
  <div class="subtitle">Backend Database Connection Diagnostics</div>

<?php
$tables = [
  'users','company_settings','customers','chit_groups','memberships',
  'installments','payments','auctions','dividends','prize_payments',
  'expenses','notifications','audit_logs'
];

try {
    $pdo = Database::getInstance();
    echo '<div class="status-box success">
            <div class="status-title">✅ Database Connected Successfully</div>
            <div class="status-detail">Host: <strong>' . DB_HOST . '</strong> &nbsp;|&nbsp; Database: <strong>' . DB_NAME . '</strong> &nbsp;|&nbsp; User: <strong>' . DB_USER . '</strong></div>
          </div>';

    // Check each table
    echo '<table><thead><tr><th>Table</th><th>Status</th><th>Row Count</th></tr></thead><tbody>';
    foreach ($tables as $tbl) {
        try {
            $count = $pdo->query("SELECT COUNT(*) FROM `$tbl`")->fetchColumn();
            echo "<tr><td>$tbl</td><td><span class='badge badge-ok'>EXISTS</span></td><td>" . number_format($count) . "</td></tr>";
        } catch (Exception $e) {
            echo "<tr><td>$tbl</td><td><span class='badge badge-err'>MISSING</span></td><td>—</td></tr>";
        }
    }
    echo '</tbody></table>';

    // PHP version
    echo '<div class="status-box info" style="margin-top:20px">
            <div class="status-title">ℹ️ Server Info</div>
            <div class="status-detail">PHP ' . PHP_VERSION . ' &nbsp;|&nbsp; PDO MySQL &nbsp;|&nbsp; ' . date('Y-m-d H:i:s') . '</div>
          </div>';

} catch (Exception $e) {
    echo '<div class="status-box error">
            <div class="status-title">❌ Connection Failed</div>
            <div class="status-detail">' . htmlspecialchars($e->getMessage()) . '</div>
          </div>';
    echo '<div class="status-box info">
            <div class="status-title">💡 Check your credentials</div>
            <div class="status-detail">Host: ' . DB_HOST . ' &nbsp;|&nbsp; DB: ' . DB_NAME . ' &nbsp;|&nbsp; User: ' . DB_USER . '</div>
          </div>';
}
?>

</div>
</body>
</html>
