<?php
require_once __DIR__ . '/../config.php';

// 仅允许 POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

// 限流
rate_limit('signin', 5, 60);

// 获取 JSON body
$input = get_input_json();
$email = trim($input['email'] ?? '');
$password = $input['password'] ?? '';

if ($email === '' || $password === '') {
    json_response(['success' => false, 'error' => '邮箱和密码不能为空', 'code' => 'missing_credentials'], 400);
}

$db = getDBConnection();

// 查询用户
$stmt = $db->prepare('SELECT id, username, email, password_hash, password_enabled, github_id, github_username, bilibili_username, avatar_url, bio, email_verified, role, status, created_at FROM users WHERE email = ? LIMIT 1');
$stmt->bind_param('s', $email);
$stmt->execute();
$res = $stmt->get_result();
$user = $res->fetch_assoc();
$stmt->close();

if (!$user || !$user['password_enabled'] || !$user['password_hash']) {
    json_response(['success' => false, 'error' => '邮箱或密码不正确', 'code' => 'invalid_credentials'], 401);
}

if (!password_verify($password, $user['password_hash'])) {
    json_response(['success' => false, 'error' => '邮箱或密码不正确', 'code' => 'invalid_credentials'], 401);
}

// 用户状态校验
if ($user['status'] !== 'active') {
    json_response(['success' => false, 'error' => '账号已被禁用，请联系管理员', 'code' => 'inactive'], 403);
}

$user_id = (int)$user['id'];

// 同步 is_admin（基于邮箱）
$should_be_admin = determine_is_admin($db, $user['email']);
sync_user_admin_flag($db, $user_id, $should_be_admin);

// 更新 last_login_at
$stmt = $db->prepare('UPDATE users SET last_login_at = NOW() WHERE id = ?');
$stmt->bind_param('i', $user_id);
$stmt->execute();
$stmt->close();

// 签发 JWT
$now = time();
$access_payload = ['sub' => (string)$user_id, 'iat' => $now, 'exp' => $now + JWT_ACCESS_TTL, 'type' => 'access'];
$refresh_payload = ['sub' => (string)$user_id, 'iat' => $now, 'exp' => $now + JWT_REFRESH_TTL, 'type' => 'refresh'];
$access_token = jwt_encode($access_payload);
$refresh_token = jwt_encode($refresh_payload);

// 创建 session
$refresh_hash = hash('sha256', $refresh_token);
$ip = $_SERVER['REMOTE_ADDR'] ?? '';
$ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
$expires_at = date('Y-m-d H:i:s', $now + JWT_REFRESH_TTL);
$stmt = $db->prepare('INSERT INTO user_sessions (user_id, refresh_token_hash, ip, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)');
$stmt->bind_param('issss', $user_id, $refresh_hash, $ip, $ua, $expires_at);
$stmt->execute();
$stmt->close();

// 返回用户信息（不含 password_hash）
$safe_user = [
    'id' => (string)$user_id,
    'username' => $user['username'],
    'email' => $user['email'],
    'avatar_url' => $user['avatar_url'],
    'bio' => $user['bio'],
    'github_username' => $user['github_username'],
    'bilibili_username' => $user['bilibili_username'],
    'role' => $user['role'],
    'created_at' => $user['created_at'],
];

json_response(['success' => true, 'user' => $safe_user, 'access_token' => $access_token, 'refresh_token' => $refresh_token]);
