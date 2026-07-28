<?php
// 评论/回复 API - 需要登录
// 接收 JSON: { resource_id, content, parent_id?, rating? }
// rating 1-5（可选，仅顶层评论可评分）
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

$user_id = require_auth();
$input = get_input_json();

$db = getDBConnection();

$resource_id = isset($input['resource_id']) ? intval($input['resource_id']) : 0;
$content = isset($input['content']) && is_string($input['content']) ? trim($input['content']) : '';
$parent_id = isset($input['parent_id']) ? intval($input['parent_id']) : null;
$rating = isset($input['rating']) ? intval($input['rating']) : 0;

if ($resource_id <= 0) {
    json_response(['success' => false, 'error' => 'resource_id 为必填字段'], 400);
}

if ($content === '') {
    json_response(['success' => false, 'error' => 'content 为必填字段'], 400);
}

// 校验资源存在
$stmt = $db->prepare('SELECT id FROM resources WHERE id = ? LIMIT 1');
$stmt->bind_param('i', $resource_id);
$stmt->execute();
$res = $stmt->get_result();
$resource = $res->fetch_assoc();
$stmt->close();

if (!$resource) {
    json_response(['success' => false, 'error' => '资源不存在'], 404);
}

// 校验 rating
if ($rating !== 0 && ($rating < 1 || $rating > 5)) {
    json_response(['success' => false, 'error' => 'rating 必须在 1-5 之间'], 400);
}

// 仅顶层评论可评分
$effective_rating = 0;
if ($parent_id === null && $rating > 0) {
    $effective_rating = $rating;
}

$db->begin_transaction();

try {
    // 创建评论记录
    $stmt = $db->prepare('INSERT INTO resource_comments (resource_id, user_id, parent_id, content, rating, created_at) VALUES (?, ?, ?, ?, ?, NOW())');
    if ($parent_id === null) {
        $null = null;
        $stmt->bind_param('iissi', $resource_id, $user_id, $null, $content, $effective_rating);
    } else {
        $stmt->bind_param('iiisi', $resource_id, $user_id, $parent_id, $content, $effective_rating);
    }
    $stmt->execute();
    $comment_id = (int)$db->insert_id;
    $stmt->close();

    // 如有 rating，更新 resources.rating_avg 和 rating_count
    if ($effective_rating > 0) {
        $stmt = $db->prepare('UPDATE resources SET rating_avg = (SELECT AVG(rating) FROM resource_comments WHERE resource_id = ? AND rating > 0), rating_count = (SELECT COUNT(*) FROM resource_comments WHERE resource_id = ? AND rating > 0) WHERE id = ?');
        $stmt->bind_param('iii', $resource_id, $resource_id, $resource_id);
        $stmt->execute();
        $stmt->close();
    }

    $db->commit();
} catch (Exception $e) {
    $db->rollback();
    json_response(['success' => false, 'error' => '创建评论失败：' . $e->getMessage()], 500);
}

// 查询作者信息用于返回
$stmt = $db->prepare('SELECT u.id, u.username, u.avatar_url FROM users u WHERE u.id = ? LIMIT 1');
$stmt->bind_param('i', $user_id);
$stmt->execute();
$res = $stmt->get_result();
$author = $res->fetch_assoc();
$stmt->close();

json_response([
    'success' => true,
    'comment' => [
        'id' => (string)$comment_id,
        'resource_id' => (string)$resource_id,
        'parent_id' => $parent_id !== null ? (string)$parent_id : null,
        'content' => $content,
        'rating' => $effective_rating,
        'created_at' => date('Y-m-d H:i:s'),
        'author' => [
            'id' => (string)$author['id'],
            'username' => $author['username'],
            'avatar_url' => $author['avatar_url'],
        ],
    ],
], 201);
