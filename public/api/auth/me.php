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
// 先尝试包含 github_access_token 的查询；如果字段不存在（未迁移），回退到不包含该字段的查询
$stmt = $db->prepare('SELECT id, username, email, password_enabled, github_id, github_username, github_access_token, bilibili_username, avatar_url, bio, email_verified, role, is_admin, status, created_at, last_login_at FROM users WHERE id = ? LIMIT 1');
if (!$stmt) {
    // 字段不存在，回退
    $stmt = $db->prepare('SELECT id, username, email, password_enabled, github_id, github_username, bilibili_username, avatar_url, bio, email_verified, role, is_admin, status, created_at, last_login_at FROM users WHERE id = ? LIMIT 1');
}
$stmt->bind_param('i', $user_id);
$stmt->execute();
$res = $stmt->get_result();
$user = $res->fetch_assoc();
$stmt->close();

if (!$user) {
    json_response(['success' => false, 'error' => '用户不存在', 'code' => 'user_not_found'], 404);
}

// 兼容：如果回退查询，github_access_token 不存在，设为 null
if (!isset($user['github_access_token'])) {
    $user['github_access_token'] = null;
}

// 如果有 github_access_token，重新检查 GitHub 仓库权限并同步 is_admin
// 这样用户被添加为 collaborator 后，刷新页面即可获得管理员权限
// 注意：只在确认有权限时升级，不在 API 失败时降级（降级只在下次 GitHub 登录时发生）
if (!empty($user['github_access_token']) && !empty($user['github_username'])) {
    $should_be_admin = determine_is_admin(
        $db,
        $user['email'],
        $user['github_access_token'],
        $user['github_username']
    );
    $current_is_admin = (bool)$user['is_admin'];
    // 只有从 false 变为 true 时才升级；不降级避免 GitHub API 临时故障导致权限丢失
    if ($should_be_admin && !$current_is_admin) {
        sync_user_admin_flag($db, (int)$user['id'], true);
        $user['is_admin'] = 1;
    }
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
