<?php
// 评论/回复 API
// GET: 获取资源评论列表（公开访问）
//   ?resource_id=xxx 或 ?id=xxx 或 ?slug=xxx
//   仅返回有内容的评论（过滤掉 rate.php 创建的"幽灵评分评论"——content 为空且仅有 rating）
// POST: 创建评论/回复 - 需要登录
//   JSON: { resource_id, content, parent_id?, rating? }
//   rating 1-5（可选，仅顶层评论可评分）
//   如果用户已评分过，会更新已有评分评论的 rating 字段（避免重复评分）
require_once __DIR__ . '/../config.php';

$db = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

// ============ GET: 获取评论列表 ============
if ($method === 'GET') {
    // 公开访问，不需要 require_auth
    $resource_id = 0;
    $slug = '';
    if (isset($_GET['resource_id'])) {
        $resource_id = intval($_GET['resource_id']);
    } elseif (isset($_GET['id'])) {
        // id 可能是数字 ID 也可能是 slug 字符串
        $id_val = trim($_GET['id']);
        if (is_numeric($id_val)) {
            $resource_id = intval($id_val);
        } else {
            $slug = $id_val;
        }
    } elseif (isset($_GET['slug'])) {
        $slug = trim($_GET['slug']);
    }

    // 如果传的是 slug，先查出 resource_id
    if ($resource_id <= 0 && $slug !== '') {
        $stmt = $db->prepare('SELECT id FROM resources WHERE slug = ? LIMIT 1');
        $stmt->bind_param('s', $slug);
        $stmt->execute();
        $res = $stmt->get_result();
        $row = $res->fetch_assoc();
        $stmt->close();
        if ($row) {
            $resource_id = (int)$row['id'];
        }
    }

    if ($resource_id <= 0) {
        json_response(['success' => false, 'error' => 'resource_id 或 slug 为必填字段'], 400);
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

    // 查询评论列表（含作者信息），按创建时间升序
    // 重要：过滤掉空内容评论（content 为 NULL 或空字符串）避免"幽灵评分评论"污染评论区
    // 但保留有 rating 但 content 为空且 rating=0 的旧数据兼容（视为已删除评论）
    $stmt = $db->prepare('SELECT c.id, c.resource_id, c.parent_id, c.content, c.rating, c.created_at, u.id AS user_id, u.username, u.avatar_url FROM resource_comments c LEFT JOIN users u ON u.id = c.user_id WHERE c.resource_id = ? AND c.content IS NOT NULL AND c.content != \'\' ORDER BY c.created_at ASC');
    $stmt->bind_param('i', $resource_id);
    $stmt->execute();
    $res = $stmt->get_result();
    $comments = [];
    while ($row = $res->fetch_assoc()) {
        $comments[] = [
            'id' => (string)$row['id'],
            'resource_id' => (string)$row['resource_id'],
            'parent_id' => $row['parent_id'] !== null ? (string)$row['parent_id'] : null,
            'content' => $row['content'],
            'rating' => (int)$row['rating'],
            'created_at' => $row['created_at'],
            'author' => [
                'id' => (string)$row['user_id'],
                'username' => $row['username'],
                'avatar_url' => $row['avatar_url'],
            ],
        ];
    }
    $stmt->close();

    // 同时返回当前资源的评分统计（避免前端额外请求 rate.php）
    $stmt = $db->prepare('SELECT rating_avg, rating_count FROM resources WHERE id = ? LIMIT 1');
    $stmt->bind_param('i', $resource_id);
    $stmt->execute();
    $res = $stmt->get_result();
    $rating_row = $res->fetch_assoc();
    $stmt->close();

    json_response([
        'success' => true,
        'comments' => $comments,
        'total' => count($comments),
        'rating_avg' => $rating_row ? (float)$rating_row['rating_avg'] : 0,
        'rating_count' => $rating_row ? (int)$rating_row['rating_count'] : 0,
    ]);
}

// ============ POST: 创建评论 ============
if ($method !== 'POST') {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

$user_id = require_auth();
$input = get_input_json();

// 兼容 query 和 body 两种传参方式
$resource_id = 0;
if (isset($input['resource_id'])) {
    $resource_id = intval($input['resource_id']);
} elseif (isset($_GET['resource_id'])) {
    $resource_id = intval($_GET['resource_id']);
} elseif (isset($_GET['id'])) {
    $resource_id = intval($_GET['id']);
}
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
    // 如果用户提交了评分，检查是否已有评分评论（避免重复评分）
    // 评分逻辑：一个用户对一个资源只能有一个评分（更新而非创建新的）
    // 使用 SELECT ... FOR UPDATE 锁住该用户的评分行，防止并发请求重复创建
    if ($effective_rating > 0) {
        $stmt = $db->prepare('SELECT id, content FROM resource_comments WHERE resource_id = ? AND user_id = ? AND parent_id IS NULL AND rating > 0 ORDER BY id DESC LIMIT 1 FOR UPDATE');
        $stmt->bind_param('ii', $resource_id, $user_id);
        $stmt->execute();
        $res = $stmt->get_result();
        $existing_rating = $res->fetch_assoc();
        $stmt->close();

        if ($existing_rating) {
            // 已有评分评论：更新 content 和 rating（合并评论与评分）
            $existing_id = (int)$existing_rating['id'];
            $merged_content = $content;
            // 如果原评论有内容，追加到新评论前
            $old_content = $existing_rating['content'];
            if (!empty($old_content) && $old_content !== $content) {
                $merged_content = $content; // 用新评论覆盖（用户主动编辑）
            }
            $stmt = $db->prepare('UPDATE resource_comments SET content = ?, rating = ?, created_at = NOW() WHERE id = ?');
            $stmt->bind_param('sii', $merged_content, $effective_rating, $existing_id);
            $stmt->execute();
            $stmt->close();
            $comment_id = $existing_id;
            $content = $merged_content;
        } else {
            // 没有已有评分评论：创建新评论（带评分）
            $stmt = $db->prepare('INSERT INTO resource_comments (resource_id, user_id, parent_id, content, rating, created_at) VALUES (?, ?, NULL, ?, ?, NOW())');
            $stmt->bind_param('iisi', $resource_id, $user_id, $content, $effective_rating);
            $stmt->execute();
            $comment_id = (int)$db->insert_id;
            $stmt->close();
        }
    } else {
        // 无评分：创建普通评论（rating=0）
        // 重要：parent_id 为 NULL 时不能通过 bind_param 'i' 类型传 null（PHP 8.1+ 会 TypeError）
        // 解决方案：使用 SQL NULL 字面量，避免传 null 给 bind_param
        if ($parent_id === null) {
            // parent_id 为 NULL：SQL 直接用 NULL 字面量，仅绑定 3 个参数
            $stmt = $db->prepare('INSERT INTO resource_comments (resource_id, user_id, parent_id, content, rating, created_at) VALUES (?, ?, NULL, ?, 0, NOW())');
            $stmt->bind_param('iis', $resource_id, $user_id, $content);
        } else {
            // parent_id 有值：使用占位符，绑定 4 个参数
            $stmt = $db->prepare('INSERT INTO resource_comments (resource_id, user_id, parent_id, content, rating, created_at) VALUES (?, ?, ?, ?, 0, NOW())');
            $stmt->bind_param('iiis', $resource_id, $user_id, $parent_id, $content);
        }
        $stmt->execute();
        $comment_id = (int)$db->insert_id;
        $stmt->close();
    }

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

// 查询最新评分统计用于返回
$stmt = $db->prepare('SELECT rating_avg, rating_count FROM resources WHERE id = ? LIMIT 1');
$stmt->bind_param('i', $resource_id);
$stmt->execute();
$res = $stmt->get_result();
$rating_info = $res->fetch_assoc();
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
    'rating_avg' => $rating_info ? (float)$rating_info['rating_avg'] : 0,
    'rating_count' => $rating_info ? (int)$rating_info['rating_count'] : 0,
], 201);
