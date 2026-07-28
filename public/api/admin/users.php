<?php
require_once __DIR__ . '/../config.php';

// 仅允许 GET / POST / PUT
$method = $_SERVER['REQUEST_METHOD'];
if (!in_array($method, ['GET', 'POST', 'PUT'], true)) {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

$admin_id = require_admin();
$db = getDBConnection();

if ($method === 'GET') {
    // 用户列表（支持搜索、状态筛选、分页）
    $q = trim($_GET['q'] ?? '');
    $status = trim($_GET['status'] ?? '');
    $is_admin_filter = $_GET['is_admin'] ?? '';
    $p = get_pagination_params();

    $where = [];
    $params = [];
    $types = '';
    if ($q !== '') {
        $where[] = '(username LIKE ? OR email LIKE ? OR github_username LIKE ?)';
        $kw = '%' . $q . '%';
        $params[] = $kw; $params[] = $kw; $params[] = $kw;
        $types .= 'sss';
    }
    if ($status !== '') {
        $where[] = 'status = ?';
        $params[] = $status;
        $types .= 's';
    }
    if ($is_admin_filter === '1' || $is_admin_filter === '0') {
        $where[] = 'is_admin = ?';
        $params[] = (int)$is_admin_filter;
        $types .= 'i';
    }
    $where_sql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

    // 总数
    $sql = "SELECT COUNT(*) AS cnt FROM users $where_sql";
    $stmt = $db->prepare($sql);
    if ($types) {
        $stmt->bind_param($types, ...$params);
    }
    $stmt->execute();
    $res = $stmt->get_result();
    $total = 0;
    if ($row = $res->fetch_assoc()) {
        $total = (int)$row['cnt'];
    }
    $stmt->close();

    // 列表
    $sql = "SELECT id, username, email, github_id, github_username, bilibili_username, avatar_url, bio, email_verified, role, is_admin, status, created_at, last_login_at FROM users $where_sql ORDER BY created_at DESC LIMIT ? OFFSET ?";
    $stmt = $db->prepare($sql);
    $list_types = $types . 'ii';
    $list_params = array_merge($params, [$p['size'], $p['offset']]);
    $stmt->bind_param($list_types, ...$list_params);
    $stmt->execute();
    $res = $stmt->get_result();
    $users = [];
    while ($row = $res->fetch_assoc()) {
        $users[] = [
            'id' => (string)$row['id'],
            'username' => $row['username'],
            'email' => $row['email'],
            'github_id' => $row['github_id'] ? (string)$row['github_id'] : null,
            'github_username' => $row['github_username'],
            'bilibili_username' => $row['bilibili_username'],
            'avatar_url' => $row['avatar_url'],
            'bio' => $row['bio'],
            'email_verified' => (bool)$row['email_verified'],
            'role' => $row['role'],
            'is_admin' => (bool)$row['is_admin'],
            'status' => $row['status'],
            'created_at' => $row['created_at'],
            'last_login_at' => $row['last_login_at'],
        ];
    }
    $stmt->close();

    json_response([
        'success' => true,
        'users' => $users,
        'total' => $total,
        'page' => $p['page'],
        'size' => $p['size'],
    ]);
}

// POST/PUT：修改用户状态
$input = get_input_json();
$target_user_id = (int)($input['user_id'] ?? 0);
if ($target_user_id <= 0) {
    json_response(['success' => false, 'error' => '缺少 user_id'], 400);
}

// 查询目标用户
$stmt = $db->prepare('SELECT id, username, email, is_admin, status FROM users WHERE id = ? LIMIT 1');
$stmt->bind_param('i', $target_user_id);
$stmt->execute();
$res = $stmt->get_result();
$target = $res->fetch_assoc();
$stmt->close();
if (!$target) {
    json_response(['success' => false, 'error' => '用户不存在'], 404);
}

$action = $input['action'] ?? '';
$changes = [];
$detail_notes = [];

if ($action === 'set_status') {
    $new_status = $input['status'] ?? '';
    if (!in_array($new_status, ['active', 'banned', 'suspended'], true)) {
        json_response(['success' => false, 'error' => '无效状态'], 400);
    }
    $stmt = $db->prepare('UPDATE users SET status = ? WHERE id = ?');
    $stmt->bind_param('si', $new_status, $target_user_id);
    $stmt->execute();
    $stmt->close();
    $changes[] = "status -> $new_status";
    $detail_notes[] = "状态更新为 $new_status";
} elseif ($action === 'set_admin') {
    $new_admin = !empty($input['is_admin']) ? 1 : 0;
    $stmt = $db->prepare('UPDATE users SET is_admin = ? WHERE id = ?');
    $stmt->bind_param('ii', $new_admin, $target_user_id);
    $stmt->execute();
    $stmt->close();
    $changes[] = "is_admin -> $new_admin";
    $detail_notes[] = $new_admin ? '授予管理员权限' : '撤销管理员权限';
} elseif ($action === 'delete_user') {
    // 仅允许删除自己以外的用户
    if ($target_user_id === $admin_id) {
        json_response(['success' => false, 'error' => '不能删除自己'], 400);
    }
    // 删除关联数据（避免外键约束）
    $db->begin_transaction();
    try {
        foreach (['user_sessions', 'pat_tokens', 'notifications', 'resource_follows', 'forum_votes', 'forum_follows'] as $table) {
            $stmt = $db->prepare("DELETE FROM $table WHERE user_id = ?");
            $stmt->bind_param('i', $target_user_id);
            $stmt->execute();
            $stmt->close();
        }
        $stmt = $db->prepare('DELETE FROM users WHERE id = ?');
        $stmt->bind_param('i', $target_user_id);
        $stmt->execute();
        $stmt->close();
        $db->commit();
        $changes[] = 'user deleted';
        $detail_notes[] = '删除用户及其关联数据';
    } catch (Exception $e) {
        $db->rollback();
        json_response(['success' => false, 'error' => '删除用户失败：' . $e->getMessage()], 500);
    }
} else {
    json_response(['success' => false, 'error' => '未知 action'], 400);
}

// 记录审计日志
log_admin_action($db, $admin_id, $action, 'user', $target_user_id, implode('; ', $detail_notes) . ' (target: ' . $target['username'] . ')');

json_response([
    'success' => true,
    'user_id' => (string)$target_user_id,
    'changes' => $changes,
]);
