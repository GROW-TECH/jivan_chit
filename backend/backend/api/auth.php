<?php
// ============================================================
// AUTH API - Login / Logout / Session
// POST /backend/api/auth.php?action=login
// POST /backend/api/auth.php?action=logout
// GET  /backend/api/auth.php?action=me
// ============================================================
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/helpers.php';

setCorsHeaders();
session_start();

// Fixed for PHP 5.6 compatibility: Replaced '??' with isset ternary
$action = isset($_GET['action']) ? $_GET['action'] : '';

switch ($action) {

    // ---- LOGIN ----
    case 'login':
        if (getMethod() !== 'POST') {
            jsonResponse(false, 'Method not allowed', null, 405);
        }
        $body = getRequestBody();
        
        // Fixed for PHP 5.6 compatibility
        $username = isset($body['username']) ? trim($body['username']) : '';
        $password = isset($body['password']) ? $body['password'] : '';

        if (!$username || !$password) {
            jsonResponse(false, 'Username and password are required', null, 400);
        }

        $pdo = Database::getInstance();
        $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ? AND status = 'active' LIMIT 1");
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            jsonResponse(false, 'Invalid credentials', null, 401);
        }

        // Update last login
        $pdo->prepare("UPDATE users SET last_login = NOW() WHERE id = ?")->execute([$user['id']]);

        $_SESSION['user_id']   = $user['id'];
        $_SESSION['username']  = $user['username'];
        $_SESSION['user_role'] = $user['role'];

        unset($user['password_hash']);
        jsonResponse(true, 'Login successful', [
            'user' => [
                'id'        => $user['id'],
                'username'  => $user['username'],
                'fullName'  => $user['full_name'],
                'email'     => $user['email'],
                'role'      => $user['role'],
                'status'    => $user['status'],
                'lastLogin' => $user['last_login'],
                'createdAt' => $user['created_at'],
            ]
        ]);
        break;

    // ---- LOGOUT ----
    case 'logout':
        session_destroy();
        jsonResponse(true, 'Logged out successfully');
        break;

    // ---- CURRENT USER ----
    case 'me':
        if (empty($_SESSION['user_id'])) {
            jsonResponse(false, 'Not authenticated', null, 401);
        }
        $pdo  = Database::getInstance();
        $stmt = $pdo->prepare("SELECT id, username, full_name, email, role, status, last_login, created_at FROM users WHERE id = ?");
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch();
        jsonResponse(true, '', ['user' => $user]);
        break;

    default:
        jsonResponse(false, 'Unknown action', null, 404);
}