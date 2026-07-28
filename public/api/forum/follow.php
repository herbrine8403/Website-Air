<?php
// 关注/取消关注 API - 需要登录
// 接收 JSON: { target_type: "topic"|"article"|"question", target_id }
// 切换关注状态
// 更新对应表的 followers_count
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

$user_id = require_auth();
$input = get_input_json();

$db = getDBConnection();

$target_type = isset($input['target_type']) && is_string($input['target_type']) ? trim($input['target_type']) : '';
$target_id = isset($input['target_id']) ? intval($input['target_id']) : 0;

$valid_types = ['topic', 'article', 'question'];
if (!in_array($target_type, $valid_types, true)) {
    json_response(['success' => false, 'error' => 'target_type 必须为 topic/article/question'], 400);
}

if ($target_id <= 0) {
    json_response(['success' => false, 'error' => 'target_id 为必填字段'], 400);
}

// 校验目标存在
$check_table_map = [
    'topic' => 'forum_topics',
    'article' => 'forum_articles',
    'question' => 'forum_questions',
];
$check_table = $check_table_map[$target_type];
$stmt = $db->prepare("SELECT id FROM $check_table WHERE id = ? LIMIT 1");
$stmt->bind_param('i', $target_id);
$stmt->execute();
$res = $stmt->get_result();
$target = $res->fetch_assoc();
$stmt->close();

if (!$target) {
    json_response(['success' => false, 'error' => '目标不存在'], 404);
}

// 查询当前关注状态
$stmt = $db->prepare('SELECT id FROM forum_follows WHERE user_id = ? AND target_type = ? AND target_id = ? LIMIT 1');
$stmt->bind_param('isi', $user_id, $target_type, $target_id);
$stmt->execute();
$stmt->store_result();
$is_following = $stmt->num_rows > 0;
$stmt->close();

$db->begin_transaction();

try {
    if ($is_following) {
        // 取消关注
        $stmt = $db->prepare('DELETE FROM forum_follows WHERE user_id = ? AND target_type = ? AND target_id = ?');
        $stmt->bind_param('isi', $user_id, $target_type, $target_id);
        $stmt->execute();
        $stmt->close();

        $stmt = $db->prepare("UPDATE $check_table SET followers_count = GREATEST(0, followers_count - 1) WHERE id = ?");
        $stmt->bind_param('i', $target_id);
        $stmt->execute();
        $stmt->close();
    } else {
        // 关注
        $stmt = $db->prepare('INSERT INTO forum_follows (user_id, target_type, target_id, created_at) VALUES (?, ?, ?, NOW())');
        $stmt->bind_param('isi', $user_id, $target_type, $target_id);
        $stmt->execute();
        $stmt->close();

        $stmt = $db->prepare("UPDATE $check_table SET followers_count = followers_count + 1 WHERE id = ?");
        $stmt->bind_param('i', $target_id);
        $stmt->execute();
        $stmt->close();
    }

    $db->commit();
} catch (Exception $e) {
    $db->rollback();
    json_response(['success' => false, 'error' => '操作失败：' . $e->getMessage()], 500);
}

// 查询最新 followers_count
$stmt = $db->prepare("SELECT followers_count FROM $check_table WHERE id = ? LIMIT 1");
$stmt->bind_param('i', $target_id);
$stmt->execute();
$res = $stmt->get_result();
$row = $res->fetch_assoc();
$stmt->close();

json_response([
    'success' => true,
    'following' => !$is_following,
    'followers_count' => (int)$row['followers_count'],
]);
