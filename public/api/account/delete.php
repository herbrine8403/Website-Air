<?php
require_once __DIR__ . '/../config.php';

// 仅允许 POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'error' => 'Method not allowed', 'code' => 'method_not_allowed'], 405);
}

$user_id = require_auth();
$input = get_input_json();
$password = $input['password'] ?? '';

$db = getDBConnection();

// 查询用户完整信息（用于密码校验）
$stmt = $db->prepare('SELECT id, username, email, password_hash, password_enabled, github_id, status FROM users WHERE id = ? LIMIT 1');
$stmt->bind_param('i', $user_id);
$stmt->execute();
$res = $stmt->get_result();
$user = $res->fetch_assoc();
$stmt->close();

if (!$user) {
    json_response(['success' => false, 'error' => '用户不存在', 'code' => 'user_not_found'], 404);
}

// 已注销
if ($user['status'] === 'deleted') {
    json_response(['success' => false, 'error' => '账号已注销', 'code' => 'already_deleted'], 400);
}

// 密码校验：如果用户启用了密码，必须验证密码
// GitHub-only 用户（password_enabled=0 或 password_hash=NULL）跳过密码校验
if ($user['password_enabled'] && $user['password_hash']) {
    if (!$password) {
        json_response(['success' => false, 'error' => '请输入密码以确认注销', 'code' => 'password_required'], 400);
    }
    if (!password_verify($password, $user['password_hash'])) {
        json_response(['success' => false, 'error' => '密码不正确', 'code' => 'invalid_password'], 401);
    }
}

// ============ 执行软删除 ============
// 策略：保留用户记录（维持外键关联），但：
// 1. status='deleted'  → 登录会被拒绝（signin.php / github-callback.php 均检查 status）
// 2. username 改为 "已注销账号-{id}"（保证唯一性，前端据此显示灰色头像）
// 3. avatar_url=NULL → 前端显示默认头像
// 4. bio、bilibili_username 清空
// 5. password_hash=NULL → 无法用密码登录
// 6. github_id=NULL → 防止 GitHub OAuth 重新关联到此已注销账号
// 7. 撤销所有 refresh_token → 所有会话立即失效
// 这样所有 LEFT JOIN users 的查询自然返回正确的"已注销"信息，无需修改查询逻辑

$new_username = '已注销账号-' . $user_id;

$stmt = $db->prepare('UPDATE users SET status = "deleted", username = ?, avatar_url = NULL, bio = NULL, bilibili_username = NULL, password_hash = NULL, password_enabled = 0, github_id = NULL, github_username = NULL WHERE id = ?');
$stmt->bind_param('si', $new_username, $user_id);
$ok = $stmt->execute();
$stmt->close();

if (!$ok) {
    json_response(['success' => false, 'error' => '注销失败，请稍后重试', 'code' => 'db_error'], 500);
}

// 撤销所有 refresh_token（使所有会话立即失效）
$stmt = $db->prepare('DELETE FROM refresh_tokens WHERE user_id = ?');
$stmt->bind_param('i', $user_id);
$stmt->execute();
$stmt->close();

// 记录审计日志（使用用户自己的 id 作为 admin_id，这里用 log_admin_action 记录即可）
$ip = $_SERVER['REMOTE_ADDR'] ?? '';
$ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
$detail = json_encode(['action' => 'self_deactivate', 'username_before' => $user['username']], JSON_UNESCAPED_UNICODE);
$stmt = $db->prepare('INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, detail, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)');
$action = 'self_deactivate';
$target_type = 'user';
$target_id = (string)$user_id;
$stmt->bind_param('issssss', $user_id, $action, $target_type, $target_id, $detail, $ip, $ua);
$stmt->execute();
$stmt->close();

json_response(['success' => true, 'message' => '账号已注销']);
