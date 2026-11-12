<?php
// ============================================================
// DATABASE CONFIGURATION - Chit Fund Management System
// ============================================================

define('DB_HOST', 'xiadot.com');
define('DB_USER', 'chit_db');
define('DB_PASS', 'chit_software');
define('DB_NAME', 'chit_db');
define('DB_PORT', 3306);
define('DB_CHARSET', 'utf8mb4');

class Database {
    // Removed type hint for PHP 5.6 compatibility
    private static $instance = null;

    public static function getInstance() {
        if (self::$instance === null) {
            $dsn = "mysql:host=" . DB_HOST
                 . ";port=" . DB_PORT
                 . ";dbname=" . DB_NAME
                 . ";charset=" . DB_CHARSET;

            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];

            try {
                self::$instance = new PDO($dsn, DB_USER, DB_PASS, $options);
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Database connection failed: ' . $e->getMessage()
                ]);
                exit;
            }
        }
        return self::$instance;
    }

    // Prevent cloning
    private function __clone() {}
}