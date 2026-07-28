<?php
require_once __DIR__ . '/../config.php';

$user_id = require_auth();

$method = $_SERVER['REQUEST_METHOD'];
$db = getDBConnection();

if ($method === 'GET') {
    // 分页参数
    $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
    $size = isset($_GET['size']) ? (int)$_GET['size'] : 20;
    if ($size < 1) $size = 20;
    if ($size > 100) $size = 100;
    $offset = ($page - 1) * $size;

    // 可选筛选：type 与 unread
    $where = 'user_id = ?';
    $types = 'i';
    $params = [$user_id];

    $type = isset($_GET['type']) ? trim((string)$_GET['type']) : '';
    if ($type !== '') {
        $where .= ' AND type = ?';
        $types .= 's';
        $params[] = $type;
    }

    $unread_only = isset($_GET['unread']) ? (bool)$_GET['unread'] : false;
    if ($unread_only) {
        $where .= ' AND is_read = 0';
    }

    // 列表查询
    $sql = "SELECT id, type, title, content, source_type, source_id, is_read, created_at FROM notifications WHERE $where ORDER BY created_at DESC LIMIT ? OFFSET ?";
    $types_with_paging = $types . 'ii';
    $params_with_paging = array_merge($params, [$size, $offset]);

    $stmt = $db->prepare($sql);
    if (!$stmt) {
        json_response(['success' => false, 'error' => '数据库准备失败'], 500);
    }
    $refs = [];
    foreach ($params_with_paging as $k => $v) {
        $refs[$k] = &$params_with_paging[$k];
    }
    array_unshift($refs, $types_with_paging);
    call_user_func_array([$stmt, 'bind_param'], $refs);
    $stmt->execute();
    $res = $stmt->get_result();

    $items = [];
    while ($row = $res->fetch_assoc()) {
        $items[] = [
            'id' => (string)$row['id'],
            'type' => $row['type'],
            'title' => $row['title'],
            'content' => $row['content'],
            'source_type' => $row['source_type'],
            'source_id' => $row['source_id'] ? (string)$row['source_id'] : null,
            'is_read' => (bool)$row['is_read'],
            'created_at' => $row['created_at'],
        ];
    }
    $stmt->close();

    // 总数与未读数
    $stmt = $db->prepare("SELECT COUNT(*) AS cnt FROM notifications WHERE $where");
    $refs = [];
    foreach ($params as $k => $v) {
        $refs[$k] = &$params[$k];
    }
    array_unshift($refs, $types);
    call_user_func_array([$stmt, 'bind_param'], $refs);
    $stmt->execute();
    $res = $stmt->get_result();
    $total = 0;
    if ($row = $res->fetch_assoc()) {
        $total = (int)$row['cnt'];
    }
    $stmt->close();

    // 未读数（不受 unread 参数影响）
    $stmt = $db->prepare('SELECT COUNT(*) AS cnt FROM notifications WHERE user_id = ? AND is_read = 0');
    $stmt->bind_param('i', $user_id);
    $stmt->execute();
    $res = $stmt->get_result();
    $unread_count = 0;
    if ($row = $res->fetch_assoc()) {
        $unread_count = (int)$row['cnt'];
    }
    $stmt->close();

    json_response([
        'success' => true,
        'notifications' => $items,
        'unread_count' => $unread_count,
        'pagination' => [
            'page' => $page,
            'size' => $size,
            'total' => $total,
            'total_pages' => $total > 0 ? (int)ceil($total / $size) : 0,
        ],
    ]);
} elseif ($method === 'POST') {
    $input = get_input_json();

    // 标记单条已读：{ id: 123 }
    // 标记全部已读：{ all: true }
    $mark_all = isset($input['all']) ? (bool)$input['all'] : false;
    $single_id = isset($input['id']) ? (int)$input['id'] : 0;

    if ($mark_all) {
        $stmt = $db->prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0');
        $stmt->bind_param('i', $user_id);
        $ok = $stmt->execute();
        $affected = $stmt->affected_rows;
        $stmt->close();

        if (!$ok) {
            json_response(['success' => false, 'error' => '标记失败'], 500);
        }
        json_response(['success' => true, 'updated' => $affected]);
    } elseif ($single_id > 0) {
        $stmt = $db->prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?');
        $stmt->bind_param('ii', $single_id, $user_id);
        $ok = $stmt->execute();
        $affected = $stmt->affected_rows;
        $stmt->close();

        if (!$ok) {
            json_response(['success' => false, 'error' => '标记失败'], 500);
        }
        if ($affected === 0) {
            json_response(['success' => false, 'error' => '通知不存在或已读', 'code' => 'notification_not_found'], 404);
        }
        json_response(['success' => true]);
    } else {
        json_response(['success' => false, 'error' => '需要 id 或 all 参数', 'code' => 'missing_param'], 400);
    }
} else {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}
