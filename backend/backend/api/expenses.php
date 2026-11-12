<?php
// ============================================================
// EXPENSES API
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
        $sql    = "SELECT e.*, u.full_name AS created_by_name FROM expenses e LEFT JOIN users u ON e.created_by_user_id = u.id WHERE 1=1";
        $params = [];
        if ($id) { $sql .= " AND e.expense_id=?"; $params[] = $id; }
        if (!empty($_GET['category'])) { $sql .= " AND e.category=?"; $params[] = $_GET['category']; }
        $sql .= " ORDER BY e.expense_date DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();
        
        $firstRow = isset($rows[0]) ? $rows[0] : null;
        if ($id) jsonResponse(true, '', ['expense' => mapExpense($firstRow)]);
        jsonResponse(true, '', ['expenses' => array_map('mapExpense', $rows)]);
        break;

    case 'POST':
        $b     = getRequestBody();
        $stmt  = $pdo->query("SELECT COUNT(*) FROM expenses");
        $count = (int)$stmt->fetchColumn() + 1;
        $eid   = 'EXP' . date('Ymd') . str_pad($count, 4, '0', STR_PAD_LEFT);
        
        $pdo->prepare("
            INSERT INTO expenses (expense_id, expense_date, category, description, amount, payment_mode, reference_number, remarks, created_by_user_id)
            VALUES (?,?,?,?,?,?,?,?,?)
        ")->execute([
            $eid, 
            isset($b['expenseDate']) ? $b['expenseDate'] : null, 
            isset($b['category']) ? $b['category'] : null, 
            isset($b['description']) ? $b['description'] : null, 
            isset($b['amount']) ? $b['amount'] : null,
            isset($b['paymentMode']) ? $b['paymentMode'] : 'Cash', 
            isset($b['referenceNumber']) ? $b['referenceNumber'] : null,
            isset($b['remarks']) ? $b['remarks'] : null, 
            isset($b['createdByUserId']) ? $b['createdByUserId'] : 1
        ]);
        jsonResponse(true, 'Expense recorded', ['expenseId' => $eid], 201);
        break;

    case 'DELETE':
        if (!$id) jsonResponse(false, 'Expense ID required', null, 400);
        $pdo->prepare("DELETE FROM expenses WHERE expense_id=?")->execute([$id]);
        jsonResponse(true, 'Expense deleted');
        break;

    default:
        jsonResponse(false, 'Method not allowed', null, 405);
}

// Removed PHP 7 return type hints for compatibility with PHP 5.6
function mapExpense($r) {
    if (!$r) return null;
    return [
        'id'              => (int)$r['id'],
        'expenseId'       => isset($r['expense_id']) ? $r['expense_id'] : null,
        'expenseDate'     => isset($r['expense_date']) ? $r['expense_date'] : null,
        'category'        => isset($r['category']) ? $r['category'] : null,
        'description'     => isset($r['description']) ? $r['description'] : null,
        'amount'          => isset($r['amount']) ? (float)$r['amount'] : 0.0,
        'paymentMode'     => isset($r['payment_mode']) ? $r['payment_mode'] : null,
        'referenceNumber' => isset($r['reference_number']) ? $r['reference_number'] : null,
        'remarks'         => isset($r['remarks']) ? $r['remarks'] : null,
        'createdByUserId' => isset($r['created_by_user_id']) ? (int)$r['created_by_user_id'] : 0,
        'createdByName'   => isset($r['created_by_name']) ? $r['created_by_name'] : null,
        'createdAt'       => isset($r['created_at']) ? $r['created_at'] : null,
    ];
}