<?php
require_once __DIR__ . '/../config.php';

// 仅允许 POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

$user_id = require_auth();

$db = getDBConnection();

$input = get_input_json();
// 兼容 old_password / current_password 两种字段名
$current_password = $input['current_password'] ?? ($input['old_password'] ?? '');
$new_password = $input['new_password'] ?? '';

if (!is_string($new_password) || $new_password === '') {
    json_response(['success' => false, 'error' => 'new_password 不能为空', 'code' => 'missing_new_password'], 400);
}

// 新密码强度校验：至少 8 字符
if (strlen($new_password) < 8) {
    json_response(['success' => false, 'error' => '新密码至少 8 个字符', 'code' => 'weak_password'], 400);
}

// 拉取当前 password_hash 与 password_enabled
$stmt = $db->prepare('SELECT password_hash, password_enabled FROM users WHERE id = ? LIMIT 1');
$stmt->bind_param('i', $user_id);
$stmt->execute();
$res = $stmt->get_result();
$user = $res->fetch_assoc();
$stmt->close();

if (!$user) {
    json_response(['success' => false, 'error' => '用户不存在', 'code' => 'user_not_found'], 404);
}

$has_password = !empty($user['password_enabled']) && !empty($user['password_hash']);

// 判断是否为 OAuth 用户首次设置密码：
// - password_enabled = 0 或 password_hash 为空 → 视为无密码账户
// - 此时允许不校验 current_password，直接设置新密码
if ($has_password) {
    // 普通用户：必须提供 current_password
    if (!is_string($current_password) || $current_password === '') {
        json_response(['success' => false, 'error' => 'current_password 不能为空', 'code' => 'missing_current_password'], 400);
    }
    // 校验旧密码
    if (!password_verify($current_password, $user['password_hash'])) {
        json_response(['success' => false, 'error' => '旧密码不正确', 'code' => 'invalid_current_password'], 401);
    }
    // 新密码不能与旧密码相同
    if (password_verify($new_password, $user['password_hash'])) {
        json_response(['success' => false, 'error' => '新密码不能与旧密码相同', 'code' => 'same_password'], 400);
    }
}
// OAuth 用户（无密码）跳过 current_password 校验，直接设置新密码

// 更新 password_hash 并启用密码登录
$new_hash = password_hash($new_password, PASSWORD_DEFAULT);

$stmt = $db->prepare('UPDATE users SET password_hash = ?, password_enabled = 1 WHERE id = ?');
$stmt->bind_param('si', $new_hash, $user_id);
$ok = $stmt->execute();
$stmt->close();

if (!$ok) {
    json_response(['success' => false, 'error' => '密码更新失败'], 500);
}

json_response(['success' => true]);
