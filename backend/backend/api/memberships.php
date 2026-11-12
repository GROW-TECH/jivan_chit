<?php
// ============================================================
// MEMBERSHIPS API
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
                SELECT m.*, c.full_name AS customer_name, c.mobile_number AS customer_mobile,
                       cg.group_name, cg.chit_value
                FROM memberships m
                LEFT JOIN customers c ON m.customer_id = c.customer_id
                LEFT JOIN chit_groups cg ON m.group_id = cg.group_id
                WHERE m.membership_id = ?
            ");
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if (!$row) jsonResponse(false, 'Membership not found', null, 404);
            jsonResponse(true, '', ['membership' => mapMembership($row)]);
        }
        $sql    = "
            SELECT m.*, c.full_name AS customer_name, c.mobile_number AS customer_mobile,
                   cg.group_name, cg.chit_value
            FROM memberships m
            LEFT JOIN customers c ON m.customer_id = c.customer_id
            LEFT JOIN chit_groups cg ON m.group_id = cg.group_id
            WHERE 1=1
        ";
        $params = [];
        if (!empty($_GET['customerId'])) { $sql .= " AND m.customer_id=?"; $params[] = $_GET['customerId']; }
        if (!empty($_GET['groupId']))    { $sql .= " AND m.group_id=?";    $params[] = $_GET['groupId'];    }
        $sql .= " ORDER BY m.created_at DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        jsonResponse(true, '', ['memberships' => array_map('mapMembership', $stmt->fetchAll())]);
        break;

    case 'POST':
        $b = getRequestBody();
        $stmt  = $pdo->query("SELECT COUNT(*) FROM memberships");
        $count = (int)$stmt->fetchColumn() + 1;
        $mid   = 'MEM' . str_pad($count, 5, '0', STR_PAD_LEFT);
        
        $totalInst = isset($b['totalInstallments']) ? (int)$b['totalInstallments'] : 0;
        $instAmt   = isset($b['installmentAmount']) ? (float)$b['installmentAmount'] : 0.0;
        $statusVal = isset($b['status']) ? $b['status'] : 'active';

        $pdo->prepare("
            INSERT INTO memberships
              (membership_id, customer_id, group_id, ticket_number, joining_date,
               installment_amount, total_installments, paid_installments, pending_installments,
               total_paid, total_pending, status)
            VALUES (?,?,?,?,?,?,?,0,?,0.00,?,?)
        ")->execute([
            $mid, 
            isset($b['customerId']) ? $b['customerId'] : null, 
            isset($b['groupId']) ? $b['groupId'] : null, 
            isset($b['ticketNumber']) ? $b['ticketNumber'] : 1, 
            isset($b['joiningDate']) ? $b['joiningDate'] : null,
            $instAmt, 
            $totalInst,
            $totalInst, // pending starts at total
            $instAmt * $totalInst, // total_pending
            $statusVal
        ]);
        
        $stmt = $pdo->prepare("SELECT m.*, c.full_name AS customer_name, c.mobile_number AS customer_mobile, cg.group_name, cg.chit_value FROM memberships m LEFT JOIN customers c ON m.customer_id=c.customer_id LEFT JOIN chit_groups cg ON m.group_id=cg.group_id WHERE m.membership_id=?");
        $stmt->execute([$mid]);
        jsonResponse(true, 'Membership created', ['membership' => mapMembership($stmt->fetch())], 201);
        break;

    case 'PUT':
        if (!$id) jsonResponse(false, 'Membership ID required', null, 400);
        $b = getRequestBody();
        $statusVal = isset($b['status']) ? $b['status'] : 'active';
        $pdo->prepare("UPDATE memberships SET status=? WHERE membership_id=?")->execute([$statusVal, $id]);
        jsonResponse(true, 'Membership updated');
        break;

    default:
        jsonResponse(false, 'Method not allowed', null, 405);
}

// Removed PHP 7 return type hints (: array) for compatibility with PHP 5.6
function mapMembership($r) {
    if (!$r) return null;
    return [
        'id'                  => (int)$r['id'],
        'membershipId'        => isset($r['membership_id']) ? $r['membership_id'] : null,
        'customerId'          => isset($r['customer_id']) ? $r['customer_id'] : null,
        'customerName'        => isset($r['customer_name']) ? $r['customer_name'] : null,
        'customerMobile'      => isset($r['customer_mobile']) ? $r['customer_mobile'] : null,
        'groupId'             => isset($r['group_id']) ? $r['group_id'] : null,
        'groupName'           => isset($r['group_name']) ? $r['group_name'] : null,
        'chitValue'           => isset($r['chit_value']) ? (float)$r['chit_value'] : null,
        'ticketNumber'        => isset($r['ticket_number']) ? (int)$r['ticket_number'] : 0,
        'joiningDate'         => isset($r['joining_date']) ? $r['joining_date'] : null,
        'installmentAmount'   => isset($r['installment_amount']) ? (float)$r['installment_amount'] : 0.0,
        'totalInstallments'   => isset($r['total_installments']) ? (int)$r['total_installments'] : 0,
        'paidInstallments'    => isset($r['paid_installments']) ? (int)$r['paid_installments'] : 0,
        'pendingInstallments' => isset($r['pending_installments']) ? (int)$r['pending_installments'] : 0,
        'totalPaid'           => isset($r['total_paid']) ? (float)$r['total_paid'] : 0.0,
        'totalPending'        => isset($r['total_pending']) ? (float)$r['total_pending'] : 0.0,
        'status'              => isset($r['status']) ? $r['status'] : null,
        'createdAt'           => isset($r['created_at']) ? $r['created_at'] : null,
        'updatedAt'           => isset($r['updated_at']) ? $r['updated_at'] : null,
    ];
}