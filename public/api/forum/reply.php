<?php
// 回复 API - 需要登录
// 接收 JSON: { target_type: "topic"|"article", target_id, content, parent_id? }
// 创建 forum_replies 记录
// 更新 forum_topics.replies_count 或 forum_articles.comments_count
// 更新 forum_topics.last_reply_at（如果是 topic）
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

$user_id = require_auth();
$input = get_input_json();

$db = getDBConnection();

$target_type = isset($input['target_type']) && is_string($input['target_type']) ? trim($input['target_type']) : '';
$target_id = isset($input['target_id']) ? intval($input['target_id']) : 0;
$content = isset($input['content']) && is_string($input['content']) ? trim($input['content']) : '';
$parent_id = isset($input['parent_id']) ? intval($input['parent_id']) : null;

if (!in_array($target_type, ['topic', 'article'], true)) {
    json_response(['success' => false, 'error' => 'target_type 必须为 topic 或 article'], 400);
}

if ($target_id <= 0) {
    json_response(['success' => false, 'error' => 'target_id 为必填字段'], 400);
}

if ($content === '') {
    json_response(['success' => false, 'error' => 'content 为必填字段'], 400);
}

// 校验目标存在
if ($target_type === 'topic') {
    $stmt = $db->prepare('SELECT id FROM forum_topics WHERE id = ? LIMIT 1');
} else {
    $stmt = $db->prepare('SELECT id FROM forum_articles WHERE id = ? LIMIT 1');
}
$stmt->bind_param('i', $target_id);
$stmt->execute();
$res = $stmt->get_result();
$target = $res->fetch_assoc();
$stmt->close();

if (!$target) {
    json_response(['success' => false, 'error' => '目标不存在'], 404);
}

// 校验 parent_id（如果提供）属于同一目标
if ($parent_id !== null && $parent_id > 0) {
    $stmt = $db->prepare('SELECT id FROM forum_replies WHERE id = ? AND target_type = ? AND target_id = ? LIMIT 1');
    $stmt->bind_param('isi', $parent_id, $target_type, $target_id);
    $stmt->execute();
    $stmt->store_result();
    if ($stmt->num_rows === 0) {
        $stmt->close();
        json_response(['success' => false, 'error' => 'parent_id 无效或不属于同一目标'], 400);
    }
    $stmt->close();
} else {
    $parent_id = null;
}

$reply_id = 0;
$created_at = date('Y-m-d H:i:s');

$db->begin_transaction();

try {
    // 创建回复
    $stmt = $db->prepare('INSERT INTO forum_replies (target_type, target_id, user_id, parent_id, content, created_at) VALUES (?, ?, ?, ?, ?, NOW())');
    if ($parent_id === null) {
        $null = null;
        $stmt->bind_param('siiss', $target_type, $target_id, $user_id, $null, $content);
    } else {
        $stmt->bind_param('siiis', $target_type, $target_id, $user_id, $parent_id, $content);
    }
    $stmt->execute();
    $reply_id = (int)$db->insert_id;
    $stmt->close();

    // 更新计数
    if ($target_type === 'topic') {
        $stmt = $db->prepare('UPDATE forum_topics SET replies_count = replies_count + 1, last_reply_at = NOW() WHERE id = ?');
        $stmt->bind_param('i', $target_id);
        $stmt->execute();
        $stmt->close();
    } else {
        $stmt = $db->prepare('UPDATE forum_articles SET comments_count = comments_count + 1 WHERE id = ?');
        $stmt->bind_param('i', $target_id);
        $stmt->execute();
        $stmt->close();
    }

    $db->commit();
} catch (Exception $e) {
    $db->rollback();
    json_response(['success' => false, 'error' => '创建回复失败：' . $e->getMessage()], 500);
}

// 查询作者信息
$stmt = $db->prepare('SELECT u.id, u.username, u.avatar_url FROM users u WHERE u.id = ? LIMIT 1');
$stmt->bind_param('i', $user_id);
$stmt->execute();
$res = $stmt->get_result();
$author = $res->fetch_assoc();
$stmt->close();

json_response([
    'success' => true,
    'reply' => [
        'id' => (string)$reply_id,
        'target_type' => $target_type,
        'target_id' => (string)$target_id,
        'parent_id' => $parent_id !== null ? (string)$parent_id : null,
        'content' => $content,
        'votes_up' => 0,
        'votes_down' => 0,
        'created_at' => $created_at,
        'author' => [
            'id' => (string)$author['id'],
            'username' => $author['username'],
            'avatar_url' => $author['avatar_url'],
        ],
    ],
], 201);
