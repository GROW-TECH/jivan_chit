<?php
// ============================================================
// AUCTIONS API
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
            SELECT a.*, cg.group_name, c.full_name AS winner_customer_name
            FROM auctions a
            LEFT JOIN chit_groups cg ON a.group_id = cg.group_id
            LEFT JOIN customers c ON a.winner_customer_id = c.customer_id
            WHERE 1=1
        ";
        $params = [];
        if ($id) { $sql .= " AND a.auction_id=?"; $params[] = $id; }
        if (!empty($_GET['groupId'])) { $sql .= " AND a.group_id=?"; $params[] = $_GET['groupId']; }
        $sql .= " ORDER BY a.auction_date DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();
        
        if ($id) {
            $firstRow = isset($rows[0]) ? $rows[0] : null;
            jsonResponse(true, '', ['auction' => mapAuction($firstRow)]);
        }
        jsonResponse(true, '', ['auctions' => array_map('mapAuction', $rows)]);
        break;

    case 'POST':
        $b     = getRequestBody();
        $stmt  = $pdo->query("SELECT COUNT(*) FROM auctions");
        $count = (int)$stmt->fetchColumn() + 1;
        $aid   = 'AUC' . date('Ym') . str_pad($count, 4, '0', STR_PAD_LEFT);
        
        $status = isset($b['status']) ? $b['status'] : 'Completed';
        $remarks = isset($b['remarks']) ? $b['remarks'] : null;

        $pdo->prepare("
            INSERT INTO auctions
              (auction_id, group_id, auction_number, auction_date, chit_value,
               bid_discount_amount, prize_amount, foreman_commission, dividend_amount,
               dividend_per_member, winner_membership_id, winner_customer_id, ticket_number, status, remarks)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ")->execute([
            $aid, 
            isset($b['groupId']) ? $b['groupId'] : null, 
            isset($b['auctionNumber']) ? $b['auctionNumber'] : null, 
            isset($b['auctionDate']) ? $b['auctionDate'] : null, 
            isset($b['chitValue']) ? $b['chitValue'] : null,
            isset($b['bidDiscountAmount']) ? $b['bidDiscountAmount'] : null, 
            isset($b['prizeAmount']) ? $b['prizeAmount'] : null, 
            isset($b['foremanCommission']) ? $b['foremanCommission'] : null,
            isset($b['dividendAmount']) ? $b['dividendAmount'] : null, 
            isset($b['dividendPerMember']) ? $b['dividendPerMember'] : null,
            isset($b['winnerMembershipId']) ? $b['winnerMembershipId'] : null, 
            isset($b['winnerCustomerId']) ? $b['winnerCustomerId'] : null, 
            isset($b['ticketNumber']) ? $b['ticketNumber'] : null,
            $status, 
            $remarks
        ]);
        jsonResponse(true, 'Auction recorded', ['auctionId' => $aid], 201);
        break;

    default:
        jsonResponse(false, 'Method not allowed', null, 405);
}

// Removed PHP 7 type hints for compatibility with PHP 5.6
function mapAuction($r) {
    if (!$r) return null;
    return [
        'id'                  => (int)$r['id'],
        'auctionId'           => $r['auction_id'],
        'groupId'             => $r['group_id'],
        'groupName'           => isset($r['group_name']) ? $r['group_name'] : null,
        'auctionNumber'       => (int)$r['auction_number'],
        'auctionDate'         => $r['auction_date'],
        'chitValue'           => (float)$r['chit_value'],
        'bidDiscountAmount'   => (float)$r['bid_discount_amount'],
        'prizeAmount'         => (float)$r['prize_amount'],
        'foremanCommission'   => (float)$r['foreman_commission'],
        'dividendAmount'      => (float)$r['dividend_amount'],
        'dividendPerMember'   => (float)$r['dividend_per_member'],
        'winnerMembershipId'  => $r['winner_membership_id'],
        'winnerCustomerId'    => $r['winner_customer_id'],
        'winnerCustomerName'  => isset($r['winner_customer_name']) ? $r['winner_customer_name'] : null,
        'ticketNumber'        => (int)$r['ticket_number'],
        'status'              => $r['status'],
        'remarks'             => $r['remarks'],
        'createdAt'           => isset($r['created_at']) ? $r['created_at'] : null,
        'updatedAt'           => isset($r['updated_at']) ? $r['updated_at'] : null,
    ];
}