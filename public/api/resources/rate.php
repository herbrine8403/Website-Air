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

// 兼容 query 和 body 两种传参方式
$resource_id = 0;
if (isset($input['resource_id'])) {
    $resource_id = intval($input['resource_id']);
} elseif (isset($_GET['resource_id'])) {
    $resource_id = intval($_GET['resource_id']);
} elseif (isset($_GET['id'])) {
    $resource_id = intval($_GET['id']);
}
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
    // 使用 SELECT ... FOR UPDATE 锁住该用户的评分行，防止并发请求重复创建评分
    // 重要：MySQL InnoDB 在事务中行锁，确保两个并发请求不会同时"未找到"再"创建"
    $stmt = $db->prepare('SELECT id, content FROM resource_comments WHERE resource_id = ? AND user_id = ? AND parent_id IS NULL AND rating > 0 ORDER BY id DESC LIMIT 1 FOR UPDATE');
    $stmt->bind_param('ii', $resource_id, $user_id);
    $stmt->execute();
    $res = $stmt->get_result();
    $existing = $res->fetch_assoc();
    $stmt->close();

    if ($existing) {
        // 更新已有评分（保留 content，避免覆盖已有评论）
        $existing_id = (int)$existing['id'];
        $stmt = $db->prepare('UPDATE resource_comments SET rating = ? WHERE id = ?');
        $stmt->bind_param('ii', $rating, $existing_id);
        $stmt->execute();
        $stmt->close();
    } else {
        // 兼容旧逻辑：用户首次评分，且没有评论，创建一条 content 为空字符串的评分评论
        // 注意：comment.php 的 GET 接口会过滤 content 为空的评论，所以这条不会出现在评论区
        // 但如果用户后续在 comment.php 提交带 rating 的评论，会查找并更新此条记录的 content
        // 重要：parent_id 不能通过 bind_param 'i' 类型传 null（PHP 8.1+ 会 TypeError）
        // 解决方案：使用 SQL NULL 字面量
        $empty_content = '';
        $stmt = $db->prepare('INSERT INTO resource_comments (resource_id, user_id, parent_id, content, rating, created_at) VALUES (?, ?, NULL, ?, ?, NOW())');
        $stmt->bind_param('iisi', $resource_id, $user_id, $empty_content, $rating);
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
