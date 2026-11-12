<?php
// ============================================================
// CORS & JSON RESPONSE HELPERS
// ============================================================

function setCorsHeaders() {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Content-Type: application/json; charset=UTF-8');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}

function jsonResponse($success, $message = '', $data = null, $code = 200) {
    http_response_code($code);
    $response = array('success' => $success, 'message' => $message);
    if ($data !== null) {
        $response['data'] = $data;
    }
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

function getRequestBody() {
    $raw = file_get_contents('php://input');
    if ($raw) {
        $data = json_decode($raw, true);
        return $data ? $data : array();
    }
    return array();
}

function getMethod() {
    return strtoupper($_SERVER['REQUEST_METHOD']);
}