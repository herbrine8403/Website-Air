<?php
require_once __DIR__ . '/../config.php';

$method = $_SERVER['REQUEST_METHOD'];
if (!in_array($method, ['GET', 'POST', 'PUT', 'DELETE'], true)) {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

$admin_id = require_admin();
$db = getDBConnection();

// 类型 -> 表名映射
$forum_tables = [
    'topic' => ['table' => 'forum_topics', 'title_col' => 'title', 'status_col' => 'status', 'featured_col' => 'featured'],
    'article' => ['table' => 'forum_articles', 'title_col' => 'title', 'status_col' => 'status', 'featured_col' => 'featured'],
    'question' => ['table' => 'forum_questions', 'title_col' => 'title', 'status_col' => 'status', 'featured_col' => 'featured'],
    'reply' => ['table' => 'forum_replies', 'title_col' => 'content', 'status_col' => null, 'featured_col' => null],
    'answer' => ['table' => 'forum_answers', 'title_col' => 'content', 'status_col' => null, 'featured_col' => null],
];

if ($method === 'GET') {
    // 列表（支持 type、q、status）
    $type = trim($_GET['type'] ?? 'topic');
    if (!isset($forum_tables[$type])) {
        json_response(['success' => false, 'error' => '无效 type'], 400);
    }
    $info = $forum_tables[$type];
    $table = $info['table'];
    $title_col = $info['title_col'];

    $q = trim($_GET['q'] ?? '');
    $status = trim($_GET['status'] ?? '');
    $p = get_pagination_params();

    $where = [];
    $params = [];
    $types = '';
    if ($q !== '') {
        $where[] = "$title_col LIKE ?";
        $params[] = '%' . $q . '%';
        $types .= 's';
    }
    if ($status !== '' && $info['status_col']) {
        $where[] = $info['status_col'] . ' = ?';
        $params[] = $status;
        $types .= 's';
    }
    $where_sql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

    // 总数
    $sql = "SELECT COUNT(*) AS cnt FROM $table $where_sql";
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
    $sql = "SELECT t.*, u.username AS author_name FROM $table t LEFT JOIN users u ON u.id = t.user_id $where_sql ORDER BY t.created_at DESC LIMIT ? OFFSET ?";
    $stmt = $db->prepare($sql);
    $list_types = $types . 'ii';
    $list_params = array_merge($params, [$p['size'], $p['offset']]);
    $stmt->bind_param($list_types, ...$list_params);
    $stmt->execute();
    $res = $stmt->get_result();
    $items = [];
    while ($row = $res->fetch_assoc()) {
        $items[] = $row;
    }
    $stmt->close();

    json_response([
        'success' => true,
        'type' => $type,
        'items' => $items,
        'total' => $total,
        'page' => $p['page'],
        'size' => $p['size'],
    ]);
}

// 写操作
$input = get_input_json();
$type = $input['type'] ?? '';
if (!isset($forum_tables[$type])) {
    json_response(['success' => false, 'error' => '无效 type'], 400);
}
$info = $forum_tables[$type];
$table = $info['table'];

$target_id = (int)($input['id'] ?? 0);
if ($target_id <= 0) {
    json_response(['success' => false, 'error' => '缺少 id'], 400);
}

// 查询目标
$id_col = 'id';
$stmt = $db->prepare("SELECT $id_col, $info[title_col] AS display_text, user_id FROM $table WHERE $id_col = ? LIMIT 1");
$stmt->bind_param('i', $target_id);
$stmt->execute();
$res = $stmt->get_result();
$target = $res->fetch_assoc();
$stmt->close();
if (!$target) {
    json_response(['success' => false, 'error' => '内容不存在'], 404);
}

$action = $input['action'] ?? '';
$detail_notes = [];

if ($action === 'set_status' && $info['status_col']) {
    $new_status = $input['status'] ?? '';
    if (!in_array($new_status, ['published', 'pending', 'draft', 'removed', 'hidden'], true)) {
        json_response(['success' => false, 'error' => '无效状态'], 400);
    }
    $stmt = $db->prepare("UPDATE $table SET {$info['status_col']} = ? WHERE id = ?");
    $stmt->bind_param('si', $new_status, $target_id);
    $stmt->execute();
    $stmt->close();
    $detail_notes[] = "状态更新为 $new_status";
} elseif ($action === 'set_featured' && $info['featured_col']) {
    $new_featured = !empty($input['featured']) ? 1 : 0;
    $stmt = $db->prepare("UPDATE $table SET {$info['featured_col']} = ? WHERE id = ?");
    $stmt->bind_param('ii', $new_featured, $target_id);
    $stmt->execute();
    $stmt->close();
    $detail_notes[] = $new_featured ? '设为精选' : '取消精选';
} elseif ($action === 'delete_post') {
    // 物理删除
    $db->begin_transaction();
    try {
        // 删除子表（回复、投票、关注）
        if ($type === 'topic' || $type === 'article') {
            $stmt = $db->prepare('DELETE FROM forum_replies WHERE target_type = ? AND target_id = ?');
            $stmt->bind_param('si', $type, $target_id);
            $stmt->execute();
            $stmt->close();
        }
        if ($type === 'question') {
            // 删除回答及回答的回复/投票
            $answer_ids = [];
            $stmt = $db->prepare('SELECT id FROM forum_answers WHERE question_id = ?');
            $stmt->bind_param('i', $target_id);
            $stmt->execute();
            $res = $stmt->get_result();
            while ($row = $res->fetch_assoc()) {
                $answer_ids[] = (int)$row['id'];
            }
            $stmt->close();
            if (!empty($answer_ids)) {
                $in = implode(',', array_fill(0, count($answer_ids), '?'));
                $types = str_repeat('i', count($answer_ids));
                $stmt = $db->prepare("DELETE FROM forum_votes WHERE target_type = 'answer' AND target_id IN ($in)");
                $stmt->bind_param($types, ...$answer_ids);
                $stmt->execute();
                $stmt->close();
                $stmt = $db->prepare('DELETE FROM forum_answers WHERE question_id = ?');
                $stmt->bind_param('i', $target_id);
                $stmt->execute();
                $stmt->close();
            }
        }
        // 删除该帖本身的投票与关注
        $stmt = $db->prepare('DELETE FROM forum_votes WHERE target_type = ? AND target_id = ?');
        $stmt->bind_param('si', $type, $target_id);
        $stmt->execute();
        $stmt->close();
        $stmt = $db->prepare('DELETE FROM forum_follows WHERE target_type = ? AND target_id = ?');
        $stmt->bind_param('si', $type, $target_id);
        $stmt->execute();
        $stmt->close();
        // 删除主帖
        $stmt = $db->prepare("DELETE FROM $table WHERE id = ?");
        $stmt->bind_param('i', $target_id);
        $stmt->execute();
        $stmt->close();
        $db->commit();
        $detail_notes[] = '物理删除帖子及关联数据';
    } catch (Exception $e) {
        $db->rollback();
        json_response(['success' => false, 'error' => '删除失败：' . $e->getMessage()], 500);
    }
} else {
    json_response(['success' => false, 'error' => '未知或不支持的操作'], 400);
}

log_admin_action($db, $admin_id, $action, $type, $target_id, implode('; ', $detail_notes) . ' (target: ' . substr((string)$target['display_text'], 0, 60) . ')');

json_response([
    'success' => true,
    'id' => (string)$target_id,
    'type' => $type,
]);
