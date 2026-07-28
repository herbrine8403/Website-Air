<?php
require_once __DIR__ . '/../config.php';

$user_id = require_auth();

$method = $_SERVER['REQUEST_METHOD'];
$db = getDBConnection();

if ($method === 'GET') {
    // 列出当前用户所有 PAT（不含 token hash）
    $stmt = $db->prepare('SELECT id, name, scopes, last_used_at, created_at, expires_at FROM pat_tokens WHERE user_id = ? ORDER BY created_at DESC');
    $stmt->bind_param('i', $user_id);
    $stmt->execute();
    $res = $stmt->get_result();

    $pats = [];
    while ($row = $res->fetch_assoc()) {
        $pats[] = [
            'id' => (string)$row['id'],
            'name' => $row['name'],
            'scopes' => $row['scopes'],
            'last_used_at' => $row['last_used_at'],
            'created_at' => $row['created_at'],
            'expires_at' => $row['expires_at'],
        ];
    }
    $stmt->close();

    json_response(['success' => true, 'pats' => $pats]);
} elseif ($method === 'POST') {
    $input = get_input_json();

    $name = isset($input['name']) ? trim((string)$input['name']) : '';
    if ($name === '') {
        json_response(['success' => false, 'error' => 'name 不能为空', 'code' => 'missing_name'], 400);
    }
    if (mb_strlen($name) > 64) {
        json_response(['success' => false, 'error' => 'name 过长（最多 64 字符）'], 400);
    }

    // scopes: 可选，逗号分隔字符串
    $scopes = isset($input['scopes']) ? (string)$input['scopes'] : '';
    if (strlen($scopes) > 255) {
        json_response(['success' => false, 'error' => 'scopes 过长（最多 255 字符）'], 400);
    }

    // expires_in_days: 可选，默认 30 天；上限 365 天
    $expires_in_days = isset($input['expires_in_days']) ? (int)$input['expires_in_days'] : 30;
    if ($expires_in_days <= 0) {
        json_response(['success' => false, 'error' => 'expires_in_days 必须大于 0'], 400);
    }
    if ($expires_in_days > 365) {
        $expires_in_days = 365;
    }

    // 生成随机 token（40 字符）
    $token = generate_random_token(40);
    $token_hash = hash('sha256', $token);

    $expires_at = date('Y-m-d H:i:s', time() + $expires_in_days * 86400);

    $stmt = $db->prepare('INSERT INTO pat_tokens (user_id, name, token_hash, scopes, expires_at) VALUES (?, ?, ?, ?, ?)');
    $stmt->bind_param('issss', $user_id, $name, $token_hash, $scopes, $expires_at);
    $ok = $stmt->execute();
    $err = $stmt->error;
    $pat_id = $stmt->insert_id;
    $stmt->close();

    if (!$ok) {
        json_response(['success' => false, 'error' => '创建 PAT 失败：' . $err], 500);
    }

    // 返回 token 明文（仅此一次）+ pat 元数据
    $pat = [
        'id' => (string)$pat_id,
        'name' => $name,
        'scopes' => $scopes,
        'last_used_at' => null,
        'created_at' => date('Y-m-d H:i:s'),
        'expires_at' => $expires_at,
    ];

    json_response([
        'success' => true,
        'pat' => $pat,
        'token' => $token,
    ]);
} elseif ($method === 'DELETE') {
    $pat_id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($pat_id <= 0) {
        json_response(['success' => false, 'error' => '需要 id 参数', 'code' => 'missing_id'], 400);
    }

    // 通过 user_id 限定删除范围，避免越权
    $stmt = $db->prepare('DELETE FROM pat_tokens WHERE id = ? AND user_id = ?');
    $stmt->bind_param('ii', $pat_id, $user_id);
    $ok = $stmt->execute();
    $affected = $stmt->affected_rows;
    $stmt->close();

    if (!$ok) {
        json_response(['success' => false, 'error' => '删除失败'], 500);
    }
    if ($affected === 0) {
        json_response(['success' => false, 'error' => 'PAT 不存在或已删除', 'code' => 'pat_not_found'], 404);
    }

    json_response(['success' => true]);
} else {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}
