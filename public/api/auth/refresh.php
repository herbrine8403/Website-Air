<?php
require_once __DIR__ . '/../config.php';

// 仅允许 POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

// 获取 JSON body
$input = get_input_json();
$refresh_token = $input['refresh_token'] ?? '';

if (!$refresh_token) {
    // 尝试从 Authorization 头获取
    $refresh_token = extract_bearer_token();
}

if (!$refresh_token) {
    json_response(['success' => false, 'error' => '缺少 refresh_token', 'code' => 'missing_token'], 401);
}

// 解码 refresh_token
$payload = jwt_decode($refresh_token);
if (!$payload || !isset($payload['sub']) || ($payload['type'] ?? '') !== 'refresh') {
    json_response(['success' => false, 'error' => 'refresh_token 无效或已过期', 'code' => 'invalid_token'], 401);
}

$user_id = (int)$payload['sub'];
$refresh_hash = hash('sha256', $refresh_token);

$db = getDBConnection();

// 查询 user_sessions 校验 refresh_token hash 存在且未过期
$stmt = $db->prepare('SELECT id FROM user_sessions WHERE user_id = ? AND refresh_token_hash = ? AND expires_at > NOW() LIMIT 1');
$stmt->bind_param('is', $user_id, $refresh_hash);
$stmt->execute();
$res = $stmt->get_result();
$session = $res->fetch_assoc();
$stmt->close();

if (!$session) {
    json_response(['success' => false, 'error' => '会话不存在或已过期', 'code' => 'session_expired'], 401);
}

// 签发新 access token + 新 refresh token
$now = time();
$access_payload = ['sub' => (string)$user_id, 'iat' => $now, 'exp' => $now + JWT_ACCESS_TTL, 'type' => 'access'];
$refresh_payload = ['sub' => (string)$user_id, 'iat' => $now, 'exp' => $now + JWT_REFRESH_TTL, 'type' => 'refresh'];
$access_token = jwt_encode($access_payload);
$new_refresh_token = jwt_encode($refresh_payload);

// 更新 user_sessions 记录：旧 token 作废，新 token 写入
$new_refresh_hash = hash('sha256', $new_refresh_token);
$ip = $_SERVER['REMOTE_ADDR'] ?? '';
$ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
$new_expires_at = date('Y-m-d H:i:s', $now + JWT_REFRESH_TTL);

// 删除旧 session，插入新 session
$stmt = $db->prepare('DELETE FROM user_sessions WHERE id = ?');
$stmt->bind_param('i', $session['id']);
$stmt->execute();
$stmt->close();

$stmt = $db->prepare('INSERT INTO user_sessions (user_id, refresh_token_hash, ip, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)');
$stmt->bind_param('issss', $user_id, $new_refresh_hash, $ip, $ua, $new_expires_at);
$stmt->execute();
$stmt->close();

json_response(['success' => true, 'access_token' => $access_token, 'refresh_token' => $new_refresh_token]);
