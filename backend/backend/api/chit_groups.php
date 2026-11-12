<?php
// ============================================================
// CHIT GROUPS API - Full CRUD
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
            $stmt = $pdo->prepare("SELECT * FROM chit_groups WHERE group_id = ?");
            $stmt->execute([$id]);
            $g = $stmt->fetch();
            if (!$g) jsonResponse(false, 'Group not found', null, 404);
            jsonResponse(true, '', ['group' => mapGroup($g)]);
        }
        $stmt = $pdo->query("SELECT * FROM chit_groups ORDER BY created_at DESC");
        jsonResponse(true, '', ['groups' => array_map('mapGroup', $stmt->fetchAll())]);
        break;

    case 'POST':
        $b = getRequestBody();
        $stmt  = $pdo->query("SELECT COUNT(*) FROM chit_groups");
        $count = (int)$stmt->fetchColumn() + 1;
        $gid   = 'GRP' . str_pad($count, 4, '0', STR_PAD_LEFT);

        $pdo->prepare("
            INSERT INTO chit_groups
              (group_id, group_name, chit_value, num_members, monthly_installment, duration_months,
               start_date, end_date, auction_day_of_month, auction_frequency,
               foreman_commission_percent, status, description)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
        ")->execute([
            $gid, 
            isset($b['groupName']) ? $b['groupName'] : null, 
            isset($b['chitValue']) ? $b['chitValue'] : null, 
            isset($b['numMembers']) ? $b['numMembers'] : null,
            isset($b['monthlyInstallment']) ? $b['monthlyInstallment'] : null, 
            isset($b['durationMonths']) ? $b['durationMonths'] : null,
            isset($b['startDate']) ? $b['startDate'] : null, 
            isset($b['endDate']) ? $b['endDate'] : null,
            isset($b['auctionDayOfMonth']) ? $b['auctionDayOfMonth'] : 10, 
            isset($b['auctionFrequency']) ? $b['auctionFrequency'] : 'Monthly',
            isset($b['foremanCommissionPercent']) ? $b['foremanCommissionPercent'] : 5.00, 
            isset($b['status']) ? $b['status'] : 'Upcoming',
            isset($b['description']) ? $b['description'] : null
        ]);

        $stmt = $pdo->prepare("SELECT * FROM chit_groups WHERE group_id = ?");
        $stmt->execute([$gid]);
        jsonResponse(true, 'Chit group created', ['group' => mapGroup($stmt->fetch())], 201);
        break;

    case 'PUT':
        if (!$id) jsonResponse(false, 'Group ID required', null, 400);
        $b = getRequestBody();
        $pdo->prepare("
            UPDATE chit_groups SET
              group_name=?, chit_value=?, num_members=?, monthly_installment=?, duration_months=?,
              start_date=?, end_date=?, auction_day_of_month=?, auction_frequency=?,
              foreman_commission_percent=?, status=?, description=?
            WHERE group_id=?
        ")->execute([
            isset($b['groupName']) ? $b['groupName'] : null, 
            isset($b['chitValue']) ? $b['chitValue'] : null, 
            isset($b['numMembers']) ? $b['numMembers'] : null, 
            isset($b['monthlyInstallment']) ? $b['monthlyInstallment'] : null,
            isset($b['durationMonths']) ? $b['durationMonths'] : null, 
            isset($b['startDate']) ? $b['startDate'] : null, 
            isset($b['endDate']) ? $b['endDate'] : null,
            isset($b['auctionDayOfMonth']) ? $b['auctionDayOfMonth'] : 10, 
            isset($b['auctionFrequency']) ? $b['auctionFrequency'] : 'Monthly',
            isset($b['foremanCommissionPercent']) ? $b['foremanCommissionPercent'] : 5.00, 
            isset($b['status']) ? $b['status'] : 'Upcoming',
            isset($b['description']) ? $b['description'] : null, 
            $id
        ]);
        $stmt = $pdo->prepare("SELECT * FROM chit_groups WHERE group_id = ?");
        $stmt->execute([$id]);
        jsonResponse(true, 'Chit group updated', ['group' => mapGroup($stmt->fetch())]);
        break;

    case 'DELETE':
        if (!$id) jsonResponse(false, 'Group ID required', null, 400);
        $pdo->prepare("DELETE FROM chit_groups WHERE group_id = ?")->execute([$id]);
        jsonResponse(true, 'Chit group deleted');
        break;

    default:
        jsonResponse(false, 'Method not allowed', null, 405);
}

// Removed PHP 7 type hints for compatibility with PHP 5.6
function mapGroup($r) {
    if (!$r) return null;
    return [
        'id'                        => (int)$r['id'],
        'groupId'                   => $r['group_id'],
        'groupName'                 => isset($r['group_name']) ? $r['group_name'] : null,
        'chitValue'                 => (float)$r['chit_value'],
        'numMembers'                => (int)$r['num_members'],
        'monthlyInstallment'        => (float)$r['monthly_installment'],
        'durationMonths'            => (int)$r['duration_months'],
        'startDate'                 => isset($r['start_date']) ? $r['start_date'] : null,
        'endDate'                   => isset($r['end_date']) ? $r['end_date'] : null,
        'auctionDayOfMonth'         => (int)$r['auction_day_of_month'],
        'auctionFrequency'          => isset($r['auction_frequency']) ? $r['auction_frequency'] : null,
        'foremanCommissionPercent'  => (float)$r['foreman_commission_percent'],
        'status'                    => isset($r['status']) ? $r['status'] : null,
        'description'               => isset($r['description']) ? $r['description'] : null,
        'createdAt'                 => isset($r['created_at']) ? $r['created_at'] : null,
        'updatedAt'                 => isset($r['updated_at']) ? $r['updated_at'] : null,
    ];
}