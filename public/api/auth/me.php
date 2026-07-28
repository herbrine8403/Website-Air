<?php
require_once __DIR__ . '/../config.php';

// 仅允许 GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

// 需要登录
$user_id = require_auth();

$db = getDBConnection();

// 查询当前用户完整信息（不返回 password_hash）
$stmt = $db->prepare('SELECT id, username, email, password_enabled, github_id, github_username, bilibili_username, avatar_url, bio, email_verified, role, is_admin, status, created_at, last_login_at FROM users WHERE id = ? LIMIT 1');
$stmt->bind_param('i', $user_id);
$stmt->execute();
$res = $stmt->get_result();
$user = $res->fetch_assoc();
$stmt->close();

if (!$user) {
    json_response(['success' => false, 'error' => '用户不存在', 'code' => 'user_not_found'], 404);
}

$safe_user = [
    'id' => (string)$user['id'],
    'username' => $user['username'],
    'email' => $user['email'],
    'password_enabled' => (bool)$user['password_enabled'],
    'github_id' => $user['github_id'] ? (string)$user['github_id'] : null,
    'github_username' => $user['github_username'],
    'bilibili_username' => $user['bilibili_username'],
    'avatar_url' => $user['avatar_url'],
    'bio' => $user['bio'],
    'email_verified' => (bool)$user['email_verified'],
    'role' => $user['role'],
    'is_admin' => (bool)$user['is_admin'],
    'status' => $user['status'],
    'created_at' => $user['created_at'],
    'last_login_at' => $user['last_login_at'],
];

json_response(['success' => true, 'user' => $safe_user]);
