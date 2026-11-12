<?php
// ============================================================
// AGENT PANEL API (PHP Backend)
// Supports: profile, summary, trend, collection-sheet, due-bills, receipts, collect-payment
// ============================================================
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/helpers.php';

setCorsHeaders();
$pdo    = Database::getInstance();
$method = getMethod();
$action = isset($_GET['action']) ? $_GET['action'] : 'summary';

switch ($method) {
    case 'GET':
        if ($action === 'profile') {
            $stmt = $pdo->query("SELECT id, username, full_name, email, role FROM users WHERE role IN ('staff','admin') LIMIT 1");
            $u = $stmt->fetch();
            $custCount = (int)$pdo->query("SELECT COUNT(DISTINCT customer_id) FROM memberships WHERE status='active'")->fetchColumn();
            jsonResponse(true, '', [
                'id' => $u ? 'agent-' . $u['id'] : 'agent-001',
                'name' => isset($u['full_name']) ? $u['full_name'] : 'Field Agent',
                'phone' => '+91 98765 43210',
                'area' => 'North Zone & Regional Field',
                'assignedCustomers' => $custCount ?: 26
            ]);
        } elseif ($action === 'summary') {
            $month = isset($_GET['month']) ? $_GET['month'] : date('Y-m');
            $today = date('Y-m-d');

            // Today's payments
            $stmt = $pdo->prepare("
                SELECT
                    COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'cash' THEN amount_paid ELSE 0 END), 0) AS cash,
                    COALESCE(SUM(CASE WHEN LOWER(payment_mode) != 'cash' THEN amount_paid ELSE 0 END), 0) AS online,
                    COALESCE(SUM(amount_paid), 0) AS total,
                    COUNT(DISTINCT customer_id) AS customers_collected
                FROM payments
                WHERE payment_date = ? AND status = 'active'
            ");
            $stmt->execute([$today]);
            $todayData = $stmt->fetch();

            // Today's pending / overdue
            $stmt = $pdo->prepare("
                SELECT
                    COUNT(CASE WHEN due_date = ? AND status != 'Paid' THEN 1 END) AS pending_today,
                    COUNT(CASE WHEN due_date < ? AND status != 'Paid' THEN 1 END) AS overdue_today
                FROM installments
            ");
            $stmt->execute([$today, $today]);
            $todayInst = $stmt->fetch();

            // Month collection
            $stmt = $pdo->prepare("
                SELECT COALESCE(SUM(amount_paid), 0) AS collected
                FROM payments
                WHERE DATE_FORMAT(payment_date, '%Y-%m') = ? AND status = 'active'
            ");
            $stmt->execute([$month]);
            $monthColl = (float)$stmt->fetchColumn();

            // Month target & counts
            $stmt = $pdo->prepare("
                SELECT
                    COALESCE(SUM(net_due_amount), 0) AS target,
                    COALESCE(SUM(CASE WHEN status != 'Paid' THEN (net_due_amount - paid_amount) ELSE 0 END), 0) AS pending_balance,
                    COUNT(DISTINCT CASE WHEN status != 'Paid' THEN customer_id END) AS pending_customers,
                    COUNT(CASE WHEN status = 'Paid' THEN 1 END) AS collected_inst,
                    COUNT(CASE WHEN status = 'Pending' AND due_date >= ? THEN 1 END) AS pending_inst,
                    COUNT(CASE WHEN status = 'Overdue' OR (status != 'Paid' AND due_date < ?) THEN 1 END) AS overdue_inst
                FROM installments
                WHERE DATE_FORMAT(due_date, '%Y-%m') = ?
            ");
            $stmt->execute([$today, $today, $month]);
            $mInst = $stmt->fetch();

            $target = (float)$mInst['target'] > 0 ? (float)$mInst['target'] : 350000.0;
            $percent = $target > 0 ? min(100, round(($monthColl / $target) * 100)) : 0;
            $commissionRate = 0.05;

            jsonResponse(true, '', [
                'todayCashCollection' => (float)$todayData['cash'],
                'todayOnlineCollection' => (float)$todayData['online'],
                'todayTotalCollection' => (float)$todayData['total'],
                'todayCustomersCollected' => (int)$todayData['customers_collected'],
                'todayPendingCollections' => (int)$todayInst['pending_today'],
                'todayOverdueCollections' => (int)$todayInst['overdue_today'],
                'monthlyCollection' => $monthColl,
                'monthlyTarget' => $target,
                'pendingBalance' => (float)$mInst['pending_balance'],
                'pendingCustomersCount' => (int)$mInst['pending_customers'],
                'commissionEarned' => round($monthColl * $commissionRate, 2),
                'commissionRate' => $commissionRate,
                'collectedInstallments' => (int)$mInst['collected_inst'],
                'pendingInstallments' => (int)$mInst['pending_inst'],
                'overdueInstallments' => (int)$mInst['overdue_inst'],
                'remainingTargetAmount' => max(0, $target - $monthColl),
                'targetAchievedPercent' => $percent,
                'month' => $month
            ]);
        } elseif ($action === 'trend') {
            $months = [];
            $now = new DateTime();
            for ($i = 5; $i >= 0; $i--) {
                // Fixed for PHP 5.6 compatibility: split clone and modify
                $d = clone $now;
                $d->modify("-$i months");
                
                $key = $d->format('Y-m');
                $label = $d->format('M');

                $stmt = $pdo->prepare("SELECT COALESCE(SUM(amount_paid), 0) FROM payments WHERE DATE_FORMAT(payment_date, '%Y-%m') = ? AND status='active'");
                $stmt->execute([$key]);
                $coll = (float)$stmt->fetchColumn();

                $stmt = $pdo->prepare("SELECT COALESCE(SUM(net_due_amount), 0) FROM installments WHERE DATE_FORMAT(due_date, '%Y-%m') = ?");
                $stmt->execute([$key]);
                $tgt = (float)$stmt->fetchColumn();

                $months[] = [
                    'month' => $key,
                    'label' => $label,
                    'collected' => $coll,
                    'target' => $tgt > 0 ? $tgt : 350000.0
                ];
            }
            jsonResponse(true, '', $months);
        } elseif ($action === 'collection-sheet') {
            $dateType   = isset($_GET['dateType']) ? $_GET['dateType'] : 'today';
            $customDate = isset($_GET['customDate']) ? $_GET['customDate'] : '';
            $status     = isset($_GET['status']) ? $_GET['status'] : 'all';
            $search     = trim(isset($_GET['search']) ? $_GET['search'] : '');
            $today      = date('Y-m-d');

            $sql = "
                SELECT
                    i.installment_id, i.customer_id, c.full_name AS customer_name,
                    COALESCE(c.mobile_number, '') AS phone,
                    COALESCE(cg.group_name, i.group_id) AS chit_group_code,
                    COALESCE(m.ticket_number, i.ticket_number, 1) AS ticket_number,
                    i.due_date, i.net_due_amount AS due_installment_amount,
                    i.paid_amount,
                    GREATEST(0, (i.net_due_amount - i.paid_amount)) AS pending_balance,
                    i.status AS raw_status,
                    i.month_number AS current_installment
                FROM installments i
                LEFT JOIN customers c ON i.customer_id = c.customer_id
                LEFT JOIN memberships m ON i.membership_id = m.membership_id
                LEFT JOIN chit_groups cg ON i.group_id = cg.group_id
                WHERE 1=1
            ";
            $params = [];

            if ($dateType === 'today') {
                $sql .= " AND (i.due_date = ? OR (i.due_date < ? AND i.status != 'Paid'))";
                $params[] = $today;
                $params[] = $today;
            } elseif ($dateType === 'custom' && $customDate) {
                $sql .= " AND i.due_date = ?";
                $params[] = $customDate;
            }

            if ($status === 'paid') {
                $sql .= " AND (i.status = 'Paid' OR i.paid_amount >= i.net_due_amount)";
            } elseif ($status === 'pending') {
                $sql .= " AND i.status != 'Paid' AND i.paid_amount < i.net_due_amount AND i.due_date >= ?";
                $params[] = $today;
            } elseif ($status === 'overdue') {
                $sql .= " AND i.status != 'Paid' AND i.paid_amount < i.net_due_amount AND i.due_date < ?";
                $params[] = $today;
            }

            if (!empty($search)) {
                $sql .= " AND (c.full_name LIKE ? OR c.mobile_number LIKE ? OR cg.group_name LIKE ? OR i.customer_id LIKE ?)";
                $s = "%$search%";
                $params[] = $s; $params[] = $s; $params[] = $s; $params[] = $s;
            }

            $sql .= " ORDER BY i.due_date DESC, i.month_number ASC LIMIT 200";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll();

            $items = array_map(function($r) use ($today) {
                $isPaid = $r['raw_status'] === 'Paid' || (float)$r['pending_balance'] <= 0;
                $isOverdue = !$isPaid && $r['due_date'] < $today;
                return [
                    'id' => $r['installment_id'],
                    'customerId' => $r['customer_id'],
                    'customerName' => isset($r['customer_name']) ? $r['customer_name'] : 'Customer',
                    'phone' => isset($r['phone']) ? $r['phone'] : '',
                    'chitGroupCode' => $r['chit_group_code'],
                    'ticketNumber' => (string)$r['ticket_number'],
                    'dueDate' => substr($r['due_date'], 0, 10),
                    'dueInstallmentAmount' => (float)$r['due_installment_amount'],
                    'paidAmount' => (float)$r['paid_amount'],
                    'pendingBalance' => round((float)$r['pending_balance'], 2),
                    'status' => $isPaid ? 'paid' : ($isOverdue ? 'overdue' : 'pending'),
                    'currentInstallment' => (int)$r['current_installment']
                ];
            }, $rows);

            jsonResponse(true, '', $items);
        } elseif ($action === 'due-bills') {
            $today = date('Y-m-d');
            $stmt = $pdo->query("
                SELECT
                    i.installment_id, i.customer_id, c.full_name AS customer_name,
                    COALESCE(c.mobile_number, '') AS phone,
                    COALESCE(cg.group_name, i.group_id) AS chit_group_code,
                    COALESCE(m.ticket_number, i.ticket_number, 1) AS ticket_number,
                    i.month_number AS current_installment,
                    i.net_due_amount AS due_amount, i.paid_amount,
                    GREATEST(0, (i.net_due_amount - i.paid_amount)) AS outstanding_balance,
                    i.due_date, i.status AS raw_status
                FROM installments i
                LEFT JOIN customers c ON i.customer_id = c.customer_id
                LEFT JOIN memberships m ON i.membership_id = m.membership_id
                LEFT JOIN chit_groups cg ON i.group_id = cg.group_id
                WHERE i.status != 'Paid' AND (i.net_due_amount - i.paid_amount) > 0
                ORDER BY i.due_date ASC, i.month_number ASC
                LIMIT 150
            ");
            $rows = $stmt->fetchAll();
            $bills = array_map(function($r) use ($today) {
                $isOverdue = $r['due_date'] < $today;
                return [
                    'id' => $r['installment_id'],
                    'customerId' => $r['customer_id'],
                    'customerName' => isset($r['customer_name']) ? $r['customer_name'] : 'Customer',
                    'phone' => isset($r['phone']) ? $r['phone'] : '',
                    'chitGroupCode' => $r['chit_group_code'],
                    'ticketNumber' => (string)$r['ticket_number'],
                    'currentInstallment' => (int)$r['current_installment'],
                    'dueAmount' => (float)$r['due_amount'],
                    'paidAmount' => (float)$r['paid_amount'],
                    'outstandingBalance' => round((float)$r['outstanding_balance'], 2),
                    'arrears' => $isOverdue ? round((float)$r['outstanding_balance'], 2) : 0,
                    'dueDate' => substr($r['due_date'], 0, 10),
                    'status' => $isOverdue ? 'overdue' : 'pending'
                ];
            }, $rows);

            jsonResponse(true, '', $bills);
        } elseif ($action === 'receipts') {
            $stmt = $pdo->query("
                SELECT
                    p.receipt_number, p.customer_id, c.full_name AS customer_name,
                    COALESCE(c.mobile_number, '') AS phone,
                    COALESCE(cg.group_name, p.group_id) AS chit_group_code,
                    COALESCE(m.ticket_number, p.ticket_number, 1) AS ticket_number,
                    p.amount_paid, p.payment_mode, p.payment_date, p.created_at,
                    u.full_name AS agent_name, p.remaining_balance, p.remarks
                FROM payments p
                LEFT JOIN customers c ON p.customer_id = c.customer_id
                LEFT JOIN chit_groups cg ON p.group_id = cg.group_id
                LEFT JOIN memberships m ON p.membership_id = m.membership_id
                LEFT JOIN users u ON p.collected_by_user_id = u.id
                ORDER BY p.payment_date DESC, p.created_at DESC
                LIMIT 150
            ");
            $rows = $stmt->fetchAll();
            $receipts = array_map(function($r) {
                $payMode = isset($r['payment_mode']) ? $r['payment_mode'] : '';
                return [
                    'receiptNumber' => $r['receipt_number'],
                    'customerId' => $r['customer_id'],
                    'customerName' => isset($r['customer_name']) ? $r['customer_name'] : 'Customer',
                    'phone' => isset($r['phone']) ? $r['phone'] : '',
                    'chitGroupCode' => $r['chit_group_code'],
                    'ticketNumber' => (string)$r['ticket_number'],
                    'amountCollected' => (float)$r['amount_paid'],
                    'paymentMethod' => strtolower($payMode) === 'cash' ? 'cash' : 'online',
                    'collectedAt' => $r['created_at'] ? date('c', strtotime($r['created_at'])) : $r['payment_date'] . 'T12:00:00Z',
                    'agentName' => isset($r['agent_name']) ? $r['agent_name'] : 'Field Agent',
                    'remainingBalance' => (float)(isset($r['remaining_balance']) ? $r['remaining_balance'] : 0),
                    'notes' => isset($r['remarks']) ? $r['remarks'] : null
                ];
            }, $rows);
            jsonResponse(true, '', $receipts);
        }
        break;

    case 'POST':
        $b = getRequestBody();
        $customerId = isset($b['customerId']) ? $b['customerId'] : null;
        $amount = (float)(isset($b['amount']) ? $b['amount'] : 0);
        $method = isset($b['paymentMethod']) ? $b['paymentMethod'] : 'cash';
        $notes  = isset($b['notes']) ? $b['notes'] : null;

        if (!$customerId || $amount <= 0) {
            jsonResponse(false, 'Customer ID and valid amount are required', null, 400);
        }

        // Find active installment
        $stmt = $pdo->prepare("
            SELECT * FROM installments
            WHERE customer_id = ? AND (status != 'Paid' OR paid_amount < net_due_amount)
            ORDER BY due_date ASC, month_number ASC LIMIT 1
        ");
        $stmt->execute([$customerId]);
        $inst = $stmt->fetch();

        if (!$inst) {
            $stmt = $pdo->prepare("SELECT * FROM installments WHERE customer_id = ? ORDER BY due_date DESC LIMIT 1");
            $stmt->execute([$customerId]);
            $inst = $stmt->fetch();
        }

        if (!$inst) {
            jsonResponse(false, 'No active installment found for this customer', null, 404);
        }

        $count = (int)$pdo->query("SELECT COUNT(*) FROM payments")->fetchColumn() + 1;
        $rec = 'REC-' . date('Y') . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);
        $today = date('Y-m-d');
        $prevBal = (float)$inst['net_due_amount'] - (float)$inst['paid_amount'];
        $remaining = max(0, $prevBal - $amount);
        $newStatus = $remaining <= 0 ? 'Paid' : 'Partially Paid';

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("
                INSERT INTO payments (receipt_number, installment_id, membership_id, customer_id, group_id, amount_paid, previous_balance, remaining_balance, payment_mode, payment_date, collected_by_user_id, status, remarks)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'active', ?)
            ");
            $stmt->execute([
                $rec, $inst['installment_id'], $inst['membership_id'], $inst['customer_id'], $inst['group_id'],
                $amount, $prevBal, $remaining, ucfirst($method), $today, $notes
            ]);

            $stmt = $pdo->prepare("
                UPDATE installments SET paid_amount = paid_amount + ?, status = ?, payment_date = ?, payment_mode = ?, receipt_number = ?
                WHERE installment_id = ?
            ");
            $stmt->execute([$amount, $newStatus, $today, ucfirst($method), $rec, $inst['installment_id']]);

            $stmt = $pdo->prepare("
                UPDATE memberships SET total_paid = total_paid + ?, total_pending = GREATEST(0, total_pending - ?) WHERE membership_id = ?
            ");
            $stmt->execute([$amount, $amount, $inst['membership_id']]);

            $pdo->commit();
        } catch (Exception $e) {
            $pdo->rollBack();
            jsonResponse(false, 'Failed to record payment: ' . $e->getMessage(), null, 500);
        }

        $stmt = $pdo->prepare("SELECT full_name, mobile_number FROM customers WHERE customer_id = ?");
        $stmt->execute([$customerId]);
        $c = $stmt->fetch();

        $stmt = $pdo->prepare("SELECT group_name FROM chit_groups WHERE group_id = ?");
        $stmt->execute([$inst['group_id']]);
        $cgName = $stmt->fetchColumn() ?: $inst['group_id'];

        $ticketNum = isset($inst['ticket_number']) ? $inst['ticket_number'] : 1;
        $receipt = [
            'receiptNumber' => $rec,
            'customerId' => $customerId,
            'customerName' => isset($c['full_name']) ? $c['full_name'] : 'Customer',
            'phone' => isset($c['mobile_number']) ? $c['mobile_number'] : '',
            'chitGroupCode' => $cgName,
            'ticketNumber' => (string)$ticketNum,
            'amountCollected' => $amount,
            'paymentMethod' => strtolower($method) === 'online' ? 'online' : 'cash',
            'collectedAt' => date('c'),
            'agentName' => 'Field Agent',
            'remainingBalance' => $remaining,
            'notes' => $notes
        ];

        jsonResponse(true, 'Payment recorded successfully', [
            'payment' => [
                'id' => $rec,
                'customerId' => $customerId,
                'amount' => $amount,
                'paymentMethod' => $receipt['paymentMethod'],
                'collectedAt' => $receipt['collectedAt'],
                'receiptNumber' => $rec,
                'notes' => $notes
            ],
            'receipt' => $receipt
        ], 201);
        break;

    default:
        jsonResponse(false, 'Method not allowed', null, 405);
}