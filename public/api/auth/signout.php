<?php
require_once __DIR__ . '/../config.php';

// 仅允许 POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

// 需要登录
$user_id = require_auth();

// 获取 refresh_token（从 body 或 Authorization bearer）
$input = get_input_json();
$refresh_token = $input['refresh_token'] ?? '';

if (!$refresh_token) {
    // 尝试从 Authorization 头获取
    $refresh_token = extract_bearer_token();
}

if (!$refresh_token) {
    // 没有 refresh_token，仍然返回成功（幂等退出）
    json_response(['success' => true]);
}

$refresh_hash = hash('sha256', $refresh_token);

$db = getDBConnection();

// 删除当前 user_sessions 记录（按 refresh_token hash）
$stmt = $db->prepare('DELETE FROM user_sessions WHERE user_id = ? AND refresh_token_hash = ?');
$stmt->bind_param('is', $user_id, $refresh_hash);
$stmt->execute();
$stmt->close();

json_response(['success' => true]);
