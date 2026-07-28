<?php
require_once __DIR__ . '/../config.php';

// 仅允许 GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

// 开启 session
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$code = $_GET['code'] ?? '';
$state = $_GET['state'] ?? '';

// 校验 state 与 session 中一致
$session_state = $_SESSION['oauth_state'] ?? null;
unset($_SESSION['oauth_state']);

if (!$code || !$state || !$session_state || !hash_equals($session_state, $state)) {
    header_remove('Content-Type');
    header('Location: /callback.html?error=invalid_state', true, 302);
    exit;
}

// 用 curl POST https://github.com/login/oauth/access_token 换 access_token
$ch = curl_init('https://github.com/login/oauth/access_token');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: application/json',
    'Content-Type: application/json',
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'client_id' => GITHUB_CLIENT_ID,
    'client_secret' => GITHUB_CLIENT_SECRET,
    'code' => $code,
    'redirect_uri' => GITHUB_REDIRECT_URI,
]));
curl_setopt($ch, CURLOPT_TIMEOUT, 15);
$token_resp = curl_exec($ch);
$token_http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($token_http !== 200 || !$token_resp) {
    header_remove('Content-Type');
    header('Location: /callback.html?error=token_exchange_failed', true, 302);
    exit;
}

$token_data = json_decode($token_resp, true);
$github_access_token = $token_data['access_token'] ?? '';

if (!$github_access_token) {
    header_remove('Content-Type');
    header('Location: /callback.html?error=no_access_token', true, 302);
    exit;
}

// 用 access_token 调 GitHub API /user 获取 id/login/avatar_url
$ch = curl_init('https://api.github.com/user');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $github_access_token,
    'Accept: application/vnd.github+json',
    'User-Agent: Air-Website',
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 15);
$user_resp = curl_exec($ch);
$user_http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($user_http !== 200 || !$user_resp) {
    header_remove('Content-Type');
    header('Location: /callback.html?error=user_fetch_failed', true, 302);
    exit;
}

$gh_user = json_decode($user_resp, true);
$github_id = $gh_user['id'] ?? null;
$github_login = $gh_user['login'] ?? '';
$github_avatar = $gh_user['avatar_url'] ?? '';

if (!$github_id) {
    header_remove('Content-Type');
    header('Location: /callback.html?error=no_github_id', true, 302);
    exit;
}

// 用 access_token 调 GitHub API /user/emails 获取 primary email
$ch = curl_init('https://api.github.com/user/emails');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $github_access_token,
    'Accept: application/vnd.github+json',
    'User-Agent: Air-Website',
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 15);
$emails_resp = curl_exec($ch);
$emails_http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$primary_email = '';
if ($emails_http === 200 && $emails_resp) {
    $emails_data = json_decode($emails_resp, true);
    if (is_array($emails_data)) {
        foreach ($emails_data as $em) {
            if (!empty($em['primary']) && !empty($em['verified']) && !empty($em['email'])) {
                $primary_email = $em['email'];
                break;
            }
        }
    }
}

$db = getDBConnection();

// 查询 users 表：github_id 是否已绑定
$stmt = $db->prepare('SELECT id, username, email, github_id, github_username, bilibili_username, avatar_url, bio, email_verified, role, status, created_at FROM users WHERE github_id = ? LIMIT 1');
$stmt->bind_param('i', $github_id);
$stmt->execute();
$res = $stmt->get_result();
$user = $res->fetch_assoc();
$stmt->close();

if (!$user) {
    // github_id 未绑定
    if (!$primary_email) {
        // email 不可读 → 重定向到前端补充邮箱
        $params = http_build_query([
            'error' => 'email_required',
            'github_id' => (string)$github_id,
            'github_username' => $github_login,
        ]);
        header_remove('Content-Type');
        header('Location: /callback.html?' . $params, true, 302);
        exit;
    }

    // github_id 未绑定且 email 可读 → 自动注册
    // username=github login + 随机后缀防冲突
    $base_username = substr(preg_replace('/[^a-zA-Z0-9_]/', '_', $github_login), 0, 15);
    $username = $base_username;
    for ($i = 0; $i < 10; $i++) {
        $stmt = $db->prepare('SELECT id FROM users WHERE username = ? LIMIT 1');
        $stmt->bind_param('s', $username);
        $stmt->execute();
        $res = $stmt->get_result();
        $exists = $res->fetch_assoc();
        $stmt->close();
        if (!$exists) {
            break;
        }
        $username = $base_username . '_' . substr(bin2hex(random_bytes(2)), 0, 4);
    }

    // 如果 email 已被其他账号占用（比如邮箱密码注册过），则绑定到那个账号
    $stmt = $db->prepare('SELECT id, username, email, github_id, github_username, bilibili_username, avatar_url, bio, email_verified, role, status, created_at FROM users WHERE email = ? LIMIT 1');
    $stmt->bind_param('s', $primary_email);
    $stmt->execute();
    $res = $stmt->get_result();
    $existing_user = $res->fetch_assoc();
    $stmt->close();

    if ($existing_user) {
        // 绑定 github_id 到已有账号
        $stmt = $db->prepare('UPDATE users SET github_id = ?, github_username = ?, avatar_url = COALESCE(NULLIF(avatar_url, ""), ?) WHERE id = ?');
        $stmt->bind_param('issi', $github_id, $github_login, $github_avatar, $existing_user['id']);
        $stmt->execute();
        $stmt->close();
        $user = $existing_user;
        $user['github_id'] = (string)$github_id;
        $user['github_username'] = $github_login;
    } else {
        // 创建新用户：password_hash 随机不可用，password_enabled=0
        $random_hash = password_hash(bin2hex(random_bytes(32)), PASSWORD_DEFAULT);
        $avatar = $github_avatar ?: ("https://api.dicebear.com/7.x/identicon/svg?seed=" . urlencode($username));
        $stmt = $db->prepare('INSERT INTO users (username, email, password_hash, password_enabled, github_id, github_username, avatar_url, email_verified, role, status) VALUES (?, ?, ?, 0, ?, ?, ?, 1, "user", "active")');
        $stmt->bind_param('sssiss', $username, $primary_email, $random_hash, $github_id, $github_login, $avatar);
        $stmt->execute();
        $new_user_id = $db->insert_id;
        $stmt->close();

        $user = [
            'id' => (string)$new_user_id,
            'username' => $username,
            'email' => $primary_email,
            'github_id' => (string)$github_id,
            'github_username' => $github_login,
            'bilibili_username' => null,
            'avatar_url' => $avatar,
            'bio' => null,
            'email_verified' => '1',
            'role' => 'user',
            'status' => 'active',
            'created_at' => date('Y-m-d H:i:s'),
        ];
    }
}

// 状态校验
if ($user['status'] !== 'active') {
    header_remove('Content-Type');
    header('Location: /callback.html?error=inactive', true, 302);
    exit;
}

$user_id = (int)$user['id'];

// 同步 is_admin（基于邮箱 + GitHub 仓库权限）
$current_email = $user['email'] ?? $primary_email;
$should_be_admin = determine_is_admin($db, $current_email, $github_access_token, $github_login);
sync_user_admin_flag($db, $user_id, $should_be_admin);

// 更新 last_login_at
$stmt = $db->prepare('UPDATE users SET last_login_at = NOW() WHERE id = ?');
$stmt->bind_param('i', $user_id);
$stmt->execute();
$stmt->close();

// 签发 JWT access token + refresh token
$now = time();
$access_payload = ['sub' => (string)$user_id, 'iat' => $now, 'exp' => $now + JWT_ACCESS_TTL, 'type' => 'access'];
$refresh_payload = ['sub' => (string)$user_id, 'iat' => $now, 'exp' => $now + JWT_REFRESH_TTL, 'type' => 'refresh'];
$access_token = jwt_encode($access_payload);
$refresh_token = jwt_encode($refresh_payload);

// 创建 session（与 signin.php / signup.php 一致，否则 refresh.php 无法校验）
$refresh_hash = hash('sha256', $refresh_token);
$ip = $_SERVER['REMOTE_ADDR'] ?? '';
$ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
$expires_at = date('Y-m-d H:i:s', $now + JWT_REFRESH_TTL);
$stmt = $db->prepare('INSERT INTO user_sessions (user_id, refresh_token_hash, ip, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)');
$stmt->bind_param('issss', $user_id, $refresh_hash, $ip, $ua, $expires_at);
$stmt->execute();
$stmt->close();

// 重定向到 /callback.html?token=xxx&refresh_token=yyy
header_remove('Content-Type');
header('Location: /callback.html?token=' . urlencode($access_token) . '&refresh_token=' . urlencode($refresh_token), true, 302);
exit;
