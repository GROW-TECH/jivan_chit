<?php
// ============================================================
// USERS MANAGEMENT API (Updated with Phone & Complete Delete)
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
            $stmt = $pdo->prepare("SELECT id, username, full_name, email, phone, role, status, last_login, created_at, updated_at FROM users WHERE id = ?");
            $stmt->execute([$id]);
            $u = $stmt->fetch();
            if (!$u) jsonResponse(false, 'User not found', null, 404);
            jsonResponse(true, '', ['user' => mapUser($u)]);
        }
        $stmt = $pdo->query("SELECT id, username, full_name, email, phone, role, status, last_login, created_at, updated_at FROM users ORDER BY created_at DESC");
        jsonResponse(true, '', ['users' => array_map('mapUser', $stmt->fetchAll())]);
        break;

    case 'POST':
        $b = getRequestBody();
        if (empty($b['username']) || empty($b['password']) || empty($b['fullName'])) {
            jsonResponse(false, 'username, password, and fullName are required', null, 400);
        }
        $hash = password_hash($b['password'], PASSWORD_DEFAULT);
        $pdo->prepare("
            INSERT INTO users (username, password_hash, full_name, email, phone, role, status)
            VALUES (?,?,?,?,?,?,?)
        ")->execute([
            isset($b['username']) ? $b['username'] : null, 
            $hash, 
            isset($b['fullName']) ? $b['fullName'] : null, 
            isset($b['email']) ? $b['email'] : null,
            isset($b['phone']) ? $b['phone'] : null,
            isset($b['role']) ? $b['role'] : 'staff', 
            isset($b['status']) ? $b['status'] : 'active'
        ]);
        $lid  = $pdo->lastInsertId();
        $stmt = $pdo->prepare("SELECT id, username, full_name, email, phone, role, status, last_login, created_at, updated_at FROM users WHERE id=?");
        $stmt->execute([$lid]);
        jsonResponse(true, 'User created', ['user' => mapUser($stmt->fetch())], 201);
        break;

    case 'PUT':
        if (!$id) jsonResponse(false, 'User ID required', null, 400);
        $b  = getRequestBody();
        
        $sql = "UPDATE users SET full_name=?, email=?, phone=?, role=?, status=?";
        $params = [
            isset($b['fullName']) ? $b['fullName'] : null, 
            isset($b['email']) ? $b['email'] : null, 
            isset($b['phone']) ? $b['phone'] : null, 
            isset($b['role']) ? $b['role'] : 'staff', 
            isset($b['status']) ? $b['status'] : 'active'
        ];
        
        if (!empty($b['password'])) {
            $sql .= ", password_hash=?";
            $params[] = password_hash($b['password'], PASSWORD_DEFAULT);
        }
        $sql .= " WHERE id=?";
        $params[] = $id;
        
        $pdo->prepare($sql)->execute($params);
        $stmt = $pdo->prepare("SELECT id, username, full_name, email, phone, role, status, last_login, created_at, updated_at FROM users WHERE id=?");
        $stmt->execute([$id]);
        jsonResponse(true, 'User updated', ['user' => mapUser($stmt->fetch())]);
        break;

    case 'DELETE':
        if (!$id) jsonResponse(false, 'User ID required', null, 400);
        // Complete database delete as requested
        $pdo->prepare("DELETE FROM users WHERE id=?")->execute([$id]);
        jsonResponse(true, 'User deleted successfully from database');
        break;

    default:
        jsonResponse(false, 'Method not allowed', null, 405);
}

// Removed PHP 7 return type hints (: array) for compatibility with PHP 5.6
function mapUser($r) {
    if (!$r) return null;
    return [
        'id'        => (int)$r['id'],
        'username'  => isset($r['username']) ? $r['username'] : null,
        'fullName'  => isset($r['full_name']) ? $r['full_name'] : null,
        'email'     => isset($r['email']) ? $r['email'] : null,
        'phone'     => isset($r['phone']) ? $r['phone'] : null,
        'role'      => isset($r['role']) ? $r['role'] : null,
        'status'    => isset($r['status']) ? $r['status'] : null,
        'lastLogin' => isset($r['last_login']) ? $r['last_login'] : null,
        'createdAt' => isset($r['created_at']) ? $r['created_at'] : null,
        'updatedAt' => isset($r['updated_at']) ? $r['updated_at'] : null,
    ];
}