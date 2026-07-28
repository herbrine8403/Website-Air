<?php
// 评分 API - 需要登录
// 接收 JSON: { resource_id, rating } (1-5)
// 实际上 rating 在 comment.php 中处理，此接口可重复调用更新评分
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

$user_id = require_auth();
$input = get_input_json();

$db = getDBConnection();

$resource_id = isset($input['resource_id']) ? intval($input['resource_id']) : 0;
$rating = isset($input['rating']) ? intval($input['rating']) : 0;

if ($resource_id <= 0) {
    json_response(['success' => false, 'error' => 'resource_id 为必填字段'], 400);
}

if ($rating < 1 || $rating > 5) {
    json_response(['success' => false, 'error' => 'rating 必须在 1-5 之间'], 400);
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

$db->begin_transaction();

try {
    // 查询是否已有该用户的评分评论（parent_id IS NULL AND rating > 0）
    $stmt = $db->prepare('SELECT id FROM resource_comments WHERE resource_id = ? AND user_id = ? AND parent_id IS NULL AND rating > 0 ORDER BY id DESC LIMIT 1');
    $stmt->bind_param('ii', $resource_id, $user_id);
    $stmt->execute();
    $res = $stmt->get_result();
    $existing = $res->fetch_assoc();
    $stmt->close();

    if ($existing) {
        // 更新已有评分
        $existing_id = (int)$existing['id'];
        $stmt = $db->prepare('UPDATE resource_comments SET rating = ? WHERE id = ?');
        $stmt->bind_param('ii', $rating, $existing_id);
        $stmt->execute();
        $stmt->close();
    } else {
        // 创建新的评分记录（content 可为空字符串，因为这是独立评分）
        $empty_content = '';
        $null = null;
        $stmt = $db->prepare('INSERT INTO resource_comments (resource_id, user_id, parent_id, content, rating, created_at) VALUES (?, ?, ?, ?, ?, NOW())');
        $stmt->bind_param('iissi', $resource_id, $user_id, $null, $empty_content, $rating);
        $stmt->execute();
        $stmt->close();
    }

    // 更新 resources.rating_avg 和 rating_count
    $stmt = $db->prepare('UPDATE resources SET rating_avg = (SELECT AVG(rating) FROM resource_comments WHERE resource_id = ? AND rating > 0), rating_count = (SELECT COUNT(*) FROM resource_comments WHERE resource_id = ? AND rating > 0) WHERE id = ?');
    $stmt->bind_param('iii', $resource_id, $resource_id, $resource_id);
    $stmt->execute();
    $stmt->close();

    $db->commit();
} catch (Exception $e) {
    $db->rollback();
    json_response(['success' => false, 'error' => '评分失败：' . $e->getMessage()], 500);
}

// 查询并返回最新评分统计
$stmt = $db->prepare('SELECT rating_avg, rating_count FROM resources WHERE id = ? LIMIT 1');
$stmt->bind_param('i', $resource_id);
$stmt->execute();
$res = $stmt->get_result();
$row = $res->fetch_assoc();
$stmt->close();

json_response([
    'success' => true,
    'rating_avg' => (float)$row['rating_avg'],
    'rating_count' => (int)$row['rating_count'],
]);
