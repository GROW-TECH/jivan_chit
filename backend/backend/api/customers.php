<?php
// ============================================================
// CUSTOMERS API
// GET    /backend/api/customers.php          - list all
// GET    /backend/api/customers.php?id=CUST001
// POST   /backend/api/customers.php          - create
// PUT    /backend/api/customers.php?id=CUST001
// DELETE /backend/api/customers.php?id=CUST001
// ============================================================
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/helpers.php';

setCorsHeaders();
$pdo    = Database::getInstance();
$method = getMethod();
// Fixed for PHP 5.6 compatibility: Replaced '??' with isset ternary
$id     = isset($_GET['id']) ? $_GET['id'] : null;

switch ($method) {

    // ---- LIST / GET ONE ----
    case 'GET':
        if ($id) {
            $stmt = $pdo->prepare("SELECT * FROM customers WHERE customer_id = ?");
            $stmt->execute([$id]);
            $c = $stmt->fetch();
            if (!$c) jsonResponse(false, 'Customer not found', null, 404);
            jsonResponse(true, '', ['customer' => mapCustomer($c)]);
        }

        $search = isset($_GET['search']) ? $_GET['search'] : '';
        $status = isset($_GET['status']) ? $_GET['status'] : '';
        $sql    = "SELECT * FROM customers WHERE 1=1";
        $params = [];

        if ($search) {
            $sql .= " AND (full_name LIKE ? OR mobile_number LIKE ? OR customer_id LIKE ?)";
            $like = "%$search%";
            $params = array_merge($params, [$like, $like, $like]);
        }
        if ($status) {
            $sql .= " AND status = ?";
            $params[] = $status;
        }
        $sql .= " ORDER BY created_at DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();
        jsonResponse(true, '', ['customers' => array_map('mapCustomer', $rows)]);
        break;

    // ---- CREATE ----
    case 'POST':
        $b = getRequestBody();
        validateCustomer($b);

        // Generate customer_id
        $stmt  = $pdo->query("SELECT COUNT(*) FROM customers");
        $count = (int)$stmt->fetchColumn() + 1;
        $cid   = 'CUST' . str_pad($count, 4, '0', STR_PAD_LEFT);

        $pdo->prepare("
            INSERT INTO customers
              (customer_id, full_name, mobile_number, alternate_mobile, email, dob, gender,
               address, city, pincode, id_proof_type, id_proof_number,
               nominee_name, nominee_relationship, nominee_mobile, joining_date, status, remarks)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ")->execute([
            $cid,
            isset($b['fullName']) ? $b['fullName'] : null, 
            isset($b['mobileNumber']) ? $b['mobileNumber'] : null, 
            isset($b['alternateMobile']) ? $b['alternateMobile'] : null,
            isset($b['email']) ? $b['email'] : null, 
            isset($b['dob']) ? $b['dob'] : null, 
            isset($b['gender']) ? $b['gender'] : 'Male',
            isset($b['address']) ? $b['address'] : null, 
            isset($b['city']) ? $b['city'] : null, 
            isset($b['pincode']) ? $b['pincode'] : null,
            isset($b['idProofType']) ? $b['idProofType'] : null, 
            isset($b['idProofNumber']) ? $b['idProofNumber'] : null,
            isset($b['nomineeName']) ? $b['nomineeName'] : null, 
            isset($b['nomineeRelationship']) ? $b['nomineeRelationship'] : null, 
            isset($b['nomineeMobile']) ? $b['nomineeMobile'] : null,
            isset($b['joiningDate']) ? $b['joiningDate'] : null, 
            isset($b['status']) ? $b['status'] : 'active', 
            isset($b['remarks']) ? $b['remarks'] : null
        ]);

        $stmt = $pdo->prepare("SELECT * FROM customers WHERE customer_id = ?");
        $stmt->execute([$cid]);
        jsonResponse(true, 'Customer created successfully', ['customer' => mapCustomer($stmt->fetch())], 201);
        break;

    // ---- UPDATE ----
    case 'PUT':
        if (!$id) jsonResponse(false, 'Customer ID required', null, 400);
        $b = getRequestBody();

        $pdo->prepare("
            UPDATE customers SET
              full_name=?, mobile_number=?, alternate_mobile=?, email=?, dob=?, gender=?,
              address=?, city=?, pincode=?, id_proof_type=?, id_proof_number=?,
              nominee_name=?, nominee_relationship=?, nominee_mobile=?,
              joining_date=?, status=?, remarks=?
            WHERE customer_id=?
        ")->execute([
            isset($b['fullName']) ? $b['fullName'] : null, 
            isset($b['mobileNumber']) ? $b['mobileNumber'] : null, 
            isset($b['alternateMobile']) ? $b['alternateMobile'] : null,
            isset($b['email']) ? $b['email'] : null, 
            isset($b['dob']) ? $b['dob'] : null, 
            isset($b['gender']) ? $b['gender'] : 'Male',
            isset($b['address']) ? $b['address'] : null, 
            isset($b['city']) ? $b['city'] : null, 
            isset($b['pincode']) ? $b['pincode'] : null,
            isset($b['idProofType']) ? $b['idProofType'] : null, 
            isset($b['idProofNumber']) ? $b['idProofNumber'] : null,
            isset($b['nomineeName']) ? $b['nomineeName'] : null, 
            isset($b['nomineeRelationship']) ? $b['nomineeRelationship'] : null, 
            isset($b['nomineeMobile']) ? $b['nomineeMobile'] : null,
            isset($b['joiningDate']) ? $b['joiningDate'] : null, 
            isset($b['status']) ? $b['status'] : 'active', 
            isset($b['remarks']) ? $b['remarks'] : null,
            $id
        ]);

        $stmt = $pdo->prepare("SELECT * FROM customers WHERE customer_id = ?");
        $stmt->execute([$id]);
        jsonResponse(true, 'Customer updated successfully', ['customer' => mapCustomer($stmt->fetch())]);
        break;

    // ---- DELETE ----
    case 'DELETE':
        if (!$id) jsonResponse(false, 'Customer ID required', null, 400);
        $pdo->prepare("DELETE FROM customers WHERE customer_id = ?")->execute([$id]);
        jsonResponse(true, 'Customer deleted successfully');
        break;

    default:
        jsonResponse(false, 'Method not allowed', null, 405);
}

// Removed PHP 7 type hints for compatibility with PHP 5.6
function mapCustomer($row) {
    if (!$row) return null;
    return [
        'id'                  => (int)$row['id'],
        'customerId'          => $row['customer_id'],
        'fullName'            => isset($row['full_name']) ? $row['full_name'] : null,
        'mobileNumber'        => isset($row['mobile_number']) ? $row['mobile_number'] : null,
        'alternateMobile'     => isset($row['alternate_mobile']) ? $row['alternate_mobile'] : null,
        'email'               => isset($row['email']) ? $row['email'] : null,
        'dob'                 => isset($row['dob']) ? $row['dob'] : null,
        'gender'              => isset($row['gender']) ? $row['gender'] : null,
        'address'             => isset($row['address']) ? $row['address'] : null,
        'city'                => isset($row['city']) ? $row['city'] : null,
        'pincode'             => isset($row['pincode']) ? $row['pincode'] : null,
        'idProofType'         => isset($row['id_proof_type']) ? $row['id_proof_type'] : null,
        'idProofNumber'       => isset($row['id_proof_number']) ? $row['id_proof_number'] : null,
        'nomineeName'         => isset($row['nominee_name']) ? $row['nominee_name'] : null,
        'nomineeRelationship' => isset($row['nominee_relationship']) ? $row['nominee_relationship'] : null,
        'nomineeMobile'       => isset($row['nominee_mobile']) ? $row['nominee_mobile'] : null,
        'joiningDate'         => isset($row['joining_date']) ? $row['joining_date'] : null,
        'status'              => isset($row['status']) ? $row['status'] : null,
        'remarks'             => isset($row['remarks']) ? $row['remarks'] : null,
        'createdAt'           => isset($row['created_at']) ? $row['created_at'] : null,
        'updatedAt'           => isset($row['updated_at']) ? $row['updated_at'] : null,
    ];
}

function validateCustomer($b) {
    $required = ['fullName','mobileNumber','address','city','pincode','idProofType','idProofNumber','nomineeName','nomineeRelationship','nomineeMobile','joiningDate'];
    foreach ($required as $f) {
        if (empty($b[$f])) jsonResponse(false, "Field '$f' is required", null, 400);
    }
}