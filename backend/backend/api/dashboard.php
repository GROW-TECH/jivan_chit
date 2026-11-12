<?php
// ============================================================
// DASHBOARD STATS API
// GET /backend/api/dashboard.php
// ============================================================
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/helpers.php';

setCorsHeaders();
$pdo = Database::getInstance();

$totalCustomers    = (int)$pdo->query("SELECT COUNT(*) FROM customers WHERE status='active'")->fetchColumn();
$activeChitGroups  = (int)$pdo->query("SELECT COUNT(*) FROM chit_groups WHERE status='Active'")->fetchColumn();
$totalChitValue    = (float)$pdo->query("SELECT COALESCE(SUM(chit_value),0) FROM chit_groups WHERE status='Active'")->fetchColumn();
$totalCollected    = (float)$pdo->query("SELECT COALESCE(SUM(amount_paid),0) FROM payments WHERE status='active'")->fetchColumn();
$totalPending      = (float)$pdo->query("SELECT COALESCE(SUM(net_due_amount - paid_amount),0) FROM installments WHERE status IN ('Pending','Partially Paid','Overdue')")->fetchColumn();
$upcomingAuctions  = (int)$pdo->query("SELECT COUNT(*) FROM auctions WHERE status='Scheduled'")->fetchColumn();

// Monthly collection trend (last 6 months)
$trend = $pdo->query("
    SELECT DATE_FORMAT(payment_date,'%b %Y') AS month,
           SUM(amount_paid) AS collected
    FROM payments
    WHERE status='active' AND payment_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
    GROUP BY DATE_FORMAT(payment_date,'%Y-%m')
    ORDER BY MIN(payment_date)
")->fetchAll();

// Recent payments (last 5)
$recentPayments = $pdo->query("
    SELECT p.receipt_number, p.amount_paid, p.payment_date, p.payment_mode,
           c.full_name AS customer_name, cg.group_name
    FROM payments p
    LEFT JOIN customers c ON p.customer_id = c.customer_id
    LEFT JOIN chit_groups cg ON p.group_id = cg.group_id
    WHERE p.status='active'
    ORDER BY p.created_at DESC LIMIT 5
")->fetchAll();

// Recent customers (last 5)
$recentCustomers = $pdo->query("
    SELECT customer_id, full_name, mobile_number, joining_date, status
    FROM customers ORDER BY created_at DESC LIMIT 5
")->fetchAll();

// Group collection summary
$groupSummary = $pdo->query("
    SELECT cg.group_name,
           COALESCE(SUM(CASE WHEN i.status='Paid' THEN i.paid_amount ELSE 0 END),0) AS collected,
           COALESCE(SUM(CASE WHEN i.status IN ('Pending','Overdue','Partially Paid') THEN (i.net_due_amount - i.paid_amount) ELSE 0 END),0) AS pending
    FROM chit_groups cg
    LEFT JOIN installments i ON cg.group_id = i.group_id
    WHERE cg.status='Active'
    GROUP BY cg.group_id, cg.group_name
    LIMIT 5
")->fetchAll();

jsonResponse(true, '', [
    'stats' => [
        'totalCustomers'           => $totalCustomers,
        'activeChitGroups'         => $activeChitGroups,
        'totalChitValue'           => $totalChitValue,
        'totalCollectedAmount'     => $totalCollected,
        'pendingAmount'            => $totalPending,
        'upcomingAuctionsCount'    => $upcomingAuctions,
        'monthlyCollectionTrend'   => $trend,
        'recentPayments'           => $recentPayments,
        'recentCustomers'          => $recentCustomers,
        'pendingCollectionByGroup' => $groupSummary,
    ]
]);
