<?php
require_once __DIR__ . '/../config.php';

$user_id = require_auth();

$method = $_SERVER['REQUEST_METHOD'];
$db = getDBConnection();

// 通过 refresh_token cookie 识别当前会话
// 前端将 refresh_token 写入 cookie（air_refresh_token），同源请求会自动带上
$current_refresh_token = null;
if (isset($_COOKIE['air_refresh_token'])) {
    $current_refresh_token = $_COOKIE['air_refresh_token'];
} elseif (isset($_SERVER['HTTP_X_REFRESH_TOKEN'])) {
    $current_refresh_token = $_SERVER['HTTP_X_REFRESH_TOKEN'];
}
$current_refresh_hash = $current_refresh_token ? hash('sha256', $current_refresh_token) : null;

if ($method === 'GET') {
    // 列出当前用户所有活跃 session（不含 token hash）
    $stmt = $db->prepare('SELECT id, ip, user_agent, last_active, created_at, expires_at, refresh_token_hash FROM user_sessions WHERE user_id = ? ORDER BY last_active DESC');
    $stmt->bind_param('i', $user_id);
    $stmt->execute();
    $res = $stmt->get_result();

    $sessions = [];
    while ($row = $res->fetch_assoc()) {
        $is_current = false;
        if ($current_refresh_hash && $row['refresh_token_hash']) {
            $is_current = hash_equals($current_refresh_hash, $row['refresh_token_hash']);
        }
        $sessions[] = [
            'id' => (string)$row['id'],
            'ip' => $row['ip'],
            'user_agent' => $row['user_agent'],
            'last_active' => $row['last_active'],
            'created_at' => $row['created_at'],
            'expires_at' => $row['expires_at'],
            'is_current' => $is_current,
        ];
    }
    $stmt->close();

    json_response(['success' => true, 'sessions' => $sessions]);
} elseif ($method === 'DELETE') {
    $session_id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($session_id <= 0) {
        json_response(['success' => false, 'error' => '需要 id 参数', 'code' => 'missing_id'], 400);
    }

    // 通过 user_id 限定删除范围，避免越权
    $stmt = $db->prepare('DELETE FROM user_sessions WHERE id = ? AND user_id = ?');
    $stmt->bind_param('ii', $session_id, $user_id);
    $ok = $stmt->execute();
    $affected = $stmt->affected_rows;
    $stmt->close();

    if (!$ok) {
        json_response(['success' => false, 'error' => '删除失败'], 500);
    }
    if ($affected === 0) {
        json_response(['success' => false, 'error' => '会话不存在或已删除', 'code' => 'session_not_found'], 404);
    }

    json_response(['success' => true]);
} else {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}
