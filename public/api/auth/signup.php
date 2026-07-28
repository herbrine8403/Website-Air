<?php
require_once __DIR__ . '/../config.php';

// 仅允许 POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

// 限流
rate_limit('signup', 5, 60);

// 获取 JSON body
$input = get_input_json();
$username = trim($input['username'] ?? '');
$email = trim($input['email'] ?? '');
$password = $input['password'] ?? '';
$bilibili = trim($input['bilibili_username'] ?? '');

// 校验
if (!preg_match('/^[a-zA-Z0-9_]{3,20}$/', $username)) {
    json_response(['success' => false, 'error' => '用户名需为 3-20 字符的字母数字下划线', 'code' => 'invalid_username'], 400);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_response(['success' => false, 'error' => '邮箱格式不正确', 'code' => 'invalid_email'], 400);
}
if (strlen($password) < 8) {
    json_response(['success' => false, 'error' => '密码至少 8 字符', 'code' => 'weak_password'], 400);
}

$db = getDBConnection();

// 唯一性校验
$stmt = $db->prepare('SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1');
$stmt->bind_param('ss', $username, $email);
$stmt->execute();
$res = $stmt->get_result();
if ($row = $res->fetch_assoc()) {
    $stmt->close();
    json_response(['success' => false, 'error' => '用户名或邮箱已被占用', 'code' => 'duplicate'], 409);
}
$stmt->close();

// 创建用户
$hash = password_hash($password, PASSWORD_DEFAULT);
$avatar = "https://api.dicebear.com/7.x/identicon/svg?seed=" . urlencode($username);
// 注册时根据邮箱判定管理员
$is_admin_flag = is_admin_email($email) ? 1 : 0;
$stmt = $db->prepare('INSERT INTO users (username, email, password_hash, password_enabled, bilibili_username, avatar_url, email_verified, role, is_admin, status) VALUES (?, ?, ?, 1, ?, ?, 1, "user", ?, "active")');
$stmt->bind_param('sssssi', $username, $email, $hash, $bilibili, $avatar, $is_admin_flag);
$stmt->execute();
$user_id = $db->insert_id;
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

// 返回用户信息
$user = [
    'id' => (string)$user_id,
    'username' => $username,
    'email' => $email,
    'avatar_url' => $avatar,
    'bio' => null,
    'github_username' => null,
    'bilibili_username' => $bilibili ?: null,
    'role' => 'user',
    'created_at' => date('Y-m-d H:i:s'),
];

json_response(['success' => true, 'user' => $user, 'access_token' => $access_token, 'refresh_token' => $refresh_token]);
