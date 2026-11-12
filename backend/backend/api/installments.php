<?php
// ============================================================
// INSTALLMENTS API
// ============================================================
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/helpers.php';

setCorsHeaders();
$pdo    = Database::getInstance();
$method = getMethod();
// Fixed for PHP 5.6 compatibility: Replaced '??' with isset ternary
$id     = isset($_GET['id']) ? $_GET['id'] : null;

switch ($method) {
    case 'GET':
        $sql    = "
            SELECT i.*, c.full_name AS customer_name, cg.group_name
            FROM installments i
            LEFT JOIN customers c ON i.customer_id = c.customer_id
            LEFT JOIN chit_groups cg ON i.group_id = cg.group_id
            WHERE 1=1
        ";
        $params = [];
        if ($id) {
            $sql .= " AND i.installment_id=?"; $params[] = $id;
        }
        if (!empty($_GET['membershipId'])) { $sql .= " AND i.membership_id=?"; $params[] = $_GET['membershipId']; }
        if (!empty($_GET['status']))       { $sql .= " AND i.status=?";       $params[] = $_GET['status']; }
        $sql .= " ORDER BY i.due_date ASC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();
        
        if ($id) {
            $firstRow = isset($rows[0]) ? $rows[0] : null;
            jsonResponse(true, '', ['installment' => mapInstallment($firstRow)]);
        }
        jsonResponse(true, '', ['installments' => array_map('mapInstallment', $rows)]);
        break;

    case 'POST':
        $b     = getRequestBody();
        $stmt  = $pdo->query("SELECT COUNT(*) FROM installments");
        $count = (int)$stmt->fetchColumn() + 1;
        $iid   = 'INST' . str_pad($count, 6, '0', STR_PAD_LEFT);
        
        $div   = isset($b['dividendDeduction']) ? (float)$b['dividendDeduction'] : 0;
        $instAmt = isset($b['installmentAmount']) ? (float)$b['installmentAmount'] : 0.0;
        $net   = $instAmt - $div;

        $pdo->prepare("
            INSERT INTO installments
              (installment_id, membership_id, customer_id, group_id, month_number,
               due_date, installment_amount, dividend_deduction, net_due_amount, status)
            VALUES (?,?,?,?,?,?,?,?,?,'Pending')
        ")->execute([
            $iid, 
            isset($b['membershipId']) ? $b['membershipId'] : null, 
            isset($b['customerId']) ? $b['customerId'] : null, 
            isset($b['groupId']) ? $b['groupId'] : null, 
            isset($b['monthNumber']) ? $b['monthNumber'] : null,
            isset($b['dueDate']) ? $b['dueDate'] : null, 
            $instAmt, 
            $div, 
            $net
        ]);
        jsonResponse(true, 'Installment created', ['installmentId' => $iid], 201);
        break;

    case 'PUT':
        if (!$id) jsonResponse(false, 'Installment ID required', null, 400);
        $b = getRequestBody();
        $pdo->prepare("
            UPDATE installments SET
              paid_amount=?, payment_date=?, payment_mode=?, receipt_number=?, status=?, remarks=?
            WHERE installment_id=?
        ")->execute([
            isset($b['paidAmount']) ? $b['paidAmount'] : 0, 
            isset($b['paymentDate']) ? $b['paymentDate'] : null, 
            isset($b['paymentMode']) ? $b['paymentMode'] : null,
            isset($b['receiptNumber']) ? $b['receiptNumber'] : null, 
            isset($b['status']) ? $b['status'] : 'Pending', 
            isset($b['remarks']) ? $b['remarks'] : null, 
            $id
        ]);
        jsonResponse(true, 'Installment updated');
        break;

    default:
        jsonResponse(false, 'Method not allowed', null, 405);
}

// Removed PHP 7 return type hints (: array) for compatibility with PHP 5.6
function mapInstallment($r) {
    if (!$r) return null;
    return [
        'id'                  => (int)$r['id'],
        'installmentId'       => isset($r['installment_id']) ? $r['installment_id'] : null,
        'membershipId'        => isset($r['membership_id']) ? $r['membership_id'] : null,
        'customerId'          => isset($r['customer_id']) ? $r['customer_id'] : null,
        'customerName'        => isset($r['customer_name']) ? $r['customer_name'] : null,
        'groupId'             => isset($r['group_id']) ? $r['group_id'] : null,
        'groupName'           => isset($r['group_name']) ? $r['group_name'] : null,
        'monthNumber'         => isset($r['month_number']) ? (int)$r['month_number'] : 0,
        'dueDate'             => isset($r['due_date']) ? $r['due_date'] : null,
        'installmentAmount'   => isset($r['installment_amount']) ? (float)$r['installment_amount'] : 0.0,
        'dividendDeduction'   => isset($r['dividend_deduction']) ? (float)$r['dividend_deduction'] : 0.0,
        'netDueAmount'        => isset($r['net_due_amount']) ? (float)$r['net_due_amount'] : 0.0,
        'paidAmount'          => isset($r['paid_amount']) ? (float)$r['paid_amount'] : 0.0,
        'balanceAmount'       => (isset($r['net_due_amount']) ? (float)$r['net_due_amount'] : 0.0) - (isset($r['paid_amount']) ? (float)$r['paid_amount'] : 0.0),
        'paymentDate'         => isset($r['payment_date']) ? $r['payment_date'] : null,
        'paymentMode'         => isset($r['payment_mode']) ? $r['payment_mode'] : null,
        'receiptNumber'       => isset($r['receipt_number']) ? $r['receipt_number'] : null,
        'status'              => isset($r['status']) ? $r['status'] : null,
        'remarks'             => isset($r['remarks']) ? $r['remarks'] : null,
        'createdAt'           => isset($r['created_at']) ? $r['created_at'] : null,
        'updatedAt'           => isset($r['updated_at']) ? $r['updated_at'] : null,
    ];
}