<?php
// ============================================================
// PAYMENTS API - Full CRUD
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
        if ($id) {
            $stmt = $pdo->prepare("
                SELECT p.*, c.full_name AS customer_name, cg.group_name,
                       u.full_name AS collected_by_name
                FROM payments p
                LEFT JOIN customers c ON p.customer_id = c.customer_id
                LEFT JOIN chit_groups cg ON p.group_id = cg.group_id
                LEFT JOIN users u ON p.collected_by_user_id = u.id
                WHERE p.receipt_number = ?
            ");
            $stmt->execute([$id]);
            $p = $stmt->fetch();
            if (!$p) jsonResponse(false, 'Payment not found', null, 404);
            jsonResponse(true, '', ['payment' => mapPayment($p)]);
        }

        $sql  = "
            SELECT p.*, c.full_name AS customer_name, cg.group_name,
                   u.full_name AS collected_by_name
            FROM payments p
            LEFT JOIN customers c ON p.customer_id = c.customer_id
            LEFT JOIN chit_groups cg ON p.group_id = cg.group_id
            LEFT JOIN users u ON p.collected_by_user_id = u.id
            WHERE 1=1
        ";
        $params = [];
        if (!empty($_GET['customerId'])) {
            $sql .= " AND p.customer_id = ?";
            $params[] = $_GET['customerId'];
        }
        if (!empty($_GET['groupId'])) {
            $sql .= " AND p.group_id = ?";
            $params[] = $_GET['groupId'];
        }
        $sql .= " ORDER BY p.payment_date DESC, p.created_at DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        jsonResponse(true, '', ['payments' => array_map('mapPayment', $stmt->fetchAll())]);
        break;

    case 'POST':
        $b = getRequestBody();
        // Generate receipt number
        $stmt  = $pdo->query("SELECT COUNT(*) FROM payments");
        $count = (int)$stmt->fetchColumn() + 1;
        $rec   = 'REC' . date('Ymd') . str_pad($count, 4, '0', STR_PAD_LEFT);

        $pdo->prepare("
            INSERT INTO payments
              (receipt_number, installment_id, membership_id, customer_id, group_id,
               amount_paid, previous_balance, remaining_balance, payment_mode,
               transaction_reference, payment_date, collected_by_user_id, status, remarks)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ")->execute([
            $rec, 
            isset($b['installmentId']) ? $b['installmentId'] : null, 
            isset($b['membershipId']) ? $b['membershipId'] : null, 
            isset($b['customerId']) ? $b['customerId'] : null, 
            isset($b['groupId']) ? $b['groupId'] : null,
            isset($b['amountPaid']) ? $b['amountPaid'] : 0, 
            isset($b['previousBalance']) ? $b['previousBalance'] : 0, 
            isset($b['remainingBalance']) ? $b['remainingBalance'] : 0,
            isset($b['paymentMode']) ? $b['paymentMode'] : 'Cash', 
            isset($b['transactionReference']) ? $b['transactionReference'] : null,
            isset($b['paymentDate']) ? $b['paymentDate'] : null, 
            isset($b['collectedByUserId']) ? $b['collectedByUserId'] : 1,
            isset($b['status']) ? $b['status'] : 'active', 
            isset($b['remarks']) ? $b['remarks'] : null
        ]);

        $stmt = $pdo->prepare("
            SELECT p.*, c.full_name AS customer_name, cg.group_name, u.full_name AS collected_by_name
            FROM payments p
            LEFT JOIN customers c ON p.customer_id = c.customer_id
            LEFT JOIN chit_groups cg ON p.group_id = cg.group_id
            LEFT JOIN users u ON p.collected_by_user_id = u.id
            WHERE p.receipt_number = ?
        ");
        $stmt->execute([$rec]);
        jsonResponse(true, 'Payment recorded', ['payment' => mapPayment($stmt->fetch())], 201);
        break;

    case 'PUT':
        if (!$id) jsonResponse(false, 'Receipt number required', null, 400);
        $b = getRequestBody();
        $pdo->prepare("
            UPDATE payments SET status=?, reversal_reason=?, remarks=? WHERE receipt_number=?
        ")->execute([
            isset($b['status']) ? $b['status'] : 'active', 
            isset($b['reversalReason']) ? $b['reversalReason'] : null, 
            isset($b['remarks']) ? $b['remarks'] : null, 
            $id
        ]);
        jsonResponse(true, 'Payment updated');
        break;

    default:
        jsonResponse(false, 'Method not allowed', null, 405);
}

// Removed PHP 7 return type hints (: array) for compatibility with PHP 5.6
function mapPayment($r) {
    if (!$r) return null;
    return [
        'id'                   => (int)$r['id'],
        'receiptNumber'        => isset($r['receipt_number']) ? $r['receipt_number'] : null,
        'installmentId'        => isset($r['installment_id']) ? $r['installment_id'] : null,
        'membershipId'         => isset($r['membership_id']) ? $r['membership_id'] : null,
        'customerId'           => isset($r['customer_id']) ? $r['customer_id'] : null,
        'customerName'         => isset($r['customer_name']) ? $r['customer_name'] : null,
        'groupId'              => isset($r['group_id']) ? $r['group_id'] : null,
        'groupName'            => isset($r['group_name']) ? $r['group_name'] : null,
        'amountPaid'           => isset($r['amount_paid']) ? (float)$r['amount_paid'] : 0.0,
        'previousBalance'      => isset($r['previous_balance']) ? (float)$r['previous_balance'] : 0.0,
        'remainingBalance'     => isset($r['remaining_balance']) ? (float)$r['remaining_balance'] : 0.0,
        'paymentMode'          => isset($r['payment_mode']) ? $r['payment_mode'] : null,
        'transactionReference' => isset($r['transaction_reference']) ? $r['transaction_reference'] : null,
        'paymentDate'          => isset($r['payment_date']) ? $r['payment_date'] : null,
        'collectedByUserId'    => isset($r['collected_by_user_id']) ? (int)$r['collected_by_user_id'] : 0,
        'collectedByName'      => isset($r['collected_by_name']) ? $r['collected_by_name'] : null,
        'status'               => isset($r['status']) ? $r['status'] : null,
        'reversalReason'       => isset($r['reversal_reason']) ? $r['reversal_reason'] : null,
        'remarks'              => isset($r['remarks']) ? $r['remarks'] : null,
        'createdAt'            => isset($r['created_at']) ? $r['created_at'] : null,
        'updatedAt'            => isset($r['updated_at']) ? $r['updated_at'] : null,
    ];
}