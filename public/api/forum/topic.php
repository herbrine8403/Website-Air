<?php
// 话题详情 API - 公开访问
// 接收 ?id=xxx
// 自增 views_count，返回话题完整信息 + author + 顶层回复列表（含 author、楼中楼回复）
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

$db = getDBConnection();

$id = isset($_GET['id']) && $_GET['id'] !== '' ? intval($_GET['id']) : 0;
if ($id <= 0) {
    json_response(['success' => false, 'error' => 'id 为必填字段'], 400);
}

// 查询话题
$stmt = $db->prepare('SELECT t.*, u.id AS author_id, u.username AS author_username, u.avatar_url AS author_avatar_url '
    . 'FROM forum_topics t LEFT JOIN users u ON u.id = t.user_id WHERE t.id = ? LIMIT 1');
$stmt->bind_param('i', $id);
$stmt->execute();
$res = $stmt->get_result();
$topic = $res->fetch_assoc();
$stmt->close();

if (!$topic) {
    json_response(['success' => false, 'error' => '话题不存在'], 404);
}

$topic_id = (int)$topic['id'];

// 自增 views_count
$db->begin_transaction();
try {
    $stmt = $db->prepare('UPDATE forum_topics SET views_count = views_count + 1 WHERE id = ?');
    $stmt->bind_param('i', $topic_id);
    $stmt->execute();
    $stmt->close();
    $db->commit();
} catch (Exception $e) {
    $db->rollback();
}

// 查询顶层回复（parent_id IS NULL）
$replies = [];
$stmt = $db->prepare('SELECT r.id, r.target_type, r.target_id, r.parent_id, r.content, r.votes_up, r.votes_down, r.created_at, '
    . 'u.id AS author_id, u.username AS author_username, u.avatar_url AS author_avatar_url '
    . 'FROM forum_replies r LEFT JOIN users u ON u.id = r.user_id '
    . 'WHERE r.target_type = \'topic\' AND r.target_id = ? AND r.parent_id IS NULL '
    . 'ORDER BY r.created_at ASC');
$stmt->bind_param('i', $topic_id);
$stmt->execute();
$res = $stmt->get_result();
$top_replies = [];
while ($row = $res->fetch_assoc()) {
    $top_replies[] = $row;
}
$stmt->close();

// 为每个顶层回复查询楼中楼
foreach ($top_replies as $row) {
    $reply_id = (int)$row['id'];
    $children = [];
    $c_stmt = $db->prepare('SELECT r.id, r.target_type, r.target_id, r.parent_id, r.content, r.votes_up, r.votes_down, r.created_at, '
        . 'u.id AS author_id, u.username AS author_username, u.avatar_url AS author_avatar_url '
        . 'FROM forum_replies r LEFT JOIN users u ON u.id = r.user_id '
        . 'WHERE r.target_type = \'topic\' AND r.target_id = ? AND r.parent_id = ? '
        . 'ORDER BY r.created_at ASC');
    $c_stmt->bind_param('ii', $topic_id, $reply_id);
    $c_stmt->execute();
    $c_res = $c_stmt->get_result();
    while ($c_row = $c_res->fetch_assoc()) {
        $children[] = [
            'id' => (string)$c_row['id'],
            'parent_id' => (string)$c_row['parent_id'],
            'content' => $c_row['content'],
            'votes_up' => (int)$c_row['votes_up'],
            'votes_down' => (int)$c_row['votes_down'],
            'created_at' => $c_row['created_at'],
            'author' => [
                'id' => (string)$c_row['author_id'],
                'username' => $c_row['author_username'],
                'avatar_url' => $c_row['author_avatar_url'],
            ],
        ];
    }
    $c_stmt->close();

    $replies[] = [
        'id' => (string)$row['id'],
        'parent_id' => null,
        'content' => $row['content'],
        'votes_up' => (int)$row['votes_up'],
        'votes_down' => (int)$row['votes_down'],
        'created_at' => $row['created_at'],
        'author' => [
            'id' => (string)$row['author_id'],
            'username' => $row['author_username'],
            'avatar_url' => $row['author_avatar_url'],
        ],
        'children' => $children,
    ];
}

json_response([
    'success' => true,
    'topic' => [
        'id' => (string)$topic['id'],
        'title' => $topic['title'],
        'content' => $topic['content'],
        'category' => $topic['category'],
        'views_count' => (int)$topic['views_count'] + 1,
        'replies_count' => (int)$topic['replies_count'],
        'followers_count' => (int)$topic['followers_count'],
        'status' => $topic['status'],
        'featured' => (bool)$topic['featured'],
        'created_at' => $topic['created_at'],
        'updated_at' => $topic['updated_at'],
        'last_reply_at' => $topic['last_reply_at'],
        'author' => [
            'id' => (string)$topic['author_id'],
            'username' => $topic['author_username'],
            'avatar_url' => $topic['author_avatar_url'],
        ],
    ],
    'replies' => $replies,
]);
