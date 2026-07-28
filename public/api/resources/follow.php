<?php
// 关注/取消关注 API - 需要登录
// 接收 JSON: { resource_id }
// 切换关注状态（已关注则取消，未关注则关注）
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

$user_id = require_auth();
$input = get_input_json();

$db = getDBConnection();

$resource_id = isset($input['resource_id']) ? intval($input['resource_id']) : 0;
if ($resource_id <= 0) {
    json_response(['success' => false, 'error' => 'resource_id 为必填字段'], 400);
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

// 查询当前关注状态
$stmt = $db->prepare('SELECT id FROM resource_follows WHERE resource_id = ? AND user_id = ? LIMIT 1');
$stmt->bind_param('ii', $resource_id, $user_id);
$stmt->execute();
$stmt->store_result();
$is_following = $stmt->num_rows > 0;
$stmt->close();

$db->begin_transaction();

try {
    if ($is_following) {
        // 取消关注
        $stmt = $db->prepare('DELETE FROM resource_follows WHERE resource_id = ? AND user_id = ?');
        $stmt->bind_param('ii', $resource_id, $user_id);
        $stmt->execute();
        $stmt->close();

        // 减少 followers_count
        $stmt = $db->prepare('UPDATE resources SET followers_count = GREATEST(0, followers_count - 1) WHERE id = ?');
        $stmt->bind_param('i', $resource_id);
        $stmt->execute();
        $stmt->close();
    } else {
        // 关注
        $stmt = $db->prepare('INSERT INTO resource_follows (resource_id, user_id, created_at) VALUES (?, ?, NOW())');
        $stmt->bind_param('ii', $resource_id, $user_id);
        $stmt->execute();
        $stmt->close();

        // 增加 followers_count
        $stmt = $db->prepare('UPDATE resources SET followers_count = followers_count + 1 WHERE id = ?');
        $stmt->bind_param('i', $resource_id);
        $stmt->execute();
        $stmt->close();
    }

    $db->commit();
} catch (Exception $e) {
    $db->rollback();
    json_response(['success' => false, 'error' => '操作失败：' . $e->getMessage()], 500);
}

// 查询最新 followers_count
$stmt = $db->prepare('SELECT followers_count FROM resources WHERE id = ? LIMIT 1');
$stmt->bind_param('i', $resource_id);
$stmt->execute();
$res = $stmt->get_result();
$row = $res->fetch_assoc();
$stmt->close();

json_response([
    'success' => true,
    'following' => !$is_following,
    'followers_count' => (int)$row['followers_count'],
]);
