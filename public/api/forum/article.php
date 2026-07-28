<?php
// 文章详情 API - 公开访问
// 接收 ?id=xxx
// 自增 views_count，返回文章完整信息 + author + 评论列表（含楼中楼）
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

$db = getDBConnection();

$id = isset($_GET['id']) && $_GET['id'] !== '' ? intval($_GET['id']) : 0;
if ($id <= 0) {
    json_response(['success' => false, 'error' => 'id 为必填字段'], 400);
}

// 查询文章
$stmt = $db->prepare('SELECT a.*, u.id AS author_id, u.username AS author_username, u.avatar_url AS author_avatar_url '
    . 'FROM forum_articles a LEFT JOIN users u ON u.id = a.user_id WHERE a.id = ? LIMIT 1');
$stmt->bind_param('i', $id);
$stmt->execute();
$res = $stmt->get_result();
$article = $res->fetch_assoc();
$stmt->close();

if (!$article) {
    json_response(['success' => false, 'error' => '文章不存在'], 404);
}

$article_id = (int)$article['id'];

// 自增 views_count
$db->begin_transaction();
try {
    $stmt = $db->prepare('UPDATE forum_articles SET views_count = views_count + 1 WHERE id = ?');
    $stmt->bind_param('i', $article_id);
    $stmt->execute();
    $stmt->close();
    $db->commit();
} catch (Exception $e) {
    $db->rollback();
}

// 查询顶层评论（parent_id IS NULL）
$comments = [];
$stmt = $db->prepare('SELECT r.id, r.target_type, r.target_id, r.parent_id, r.content, r.votes_up, r.votes_down, r.created_at, '
    . 'u.id AS author_id, u.username AS author_username, u.avatar_url AS author_avatar_url '
    . 'FROM forum_replies r LEFT JOIN users u ON u.id = r.user_id '
    . 'WHERE r.target_type = \'article\' AND r.target_id = ? AND r.parent_id IS NULL '
    . 'ORDER BY r.created_at ASC');
$stmt->bind_param('i', $article_id);
$stmt->execute();
$res = $stmt->get_result();
$top_comments = [];
while ($row = $res->fetch_assoc()) {
    $top_comments[] = $row;
}
$stmt->close();

// 为每个顶层评论查询楼中楼
foreach ($top_comments as $row) {
    $comment_id = (int)$row['id'];
    $children = [];
    $c_stmt = $db->prepare('SELECT r.id, r.target_type, r.target_id, r.parent_id, r.content, r.votes_up, r.votes_down, r.created_at, '
        . 'u.id AS author_id, u.username AS author_username, u.avatar_url AS author_avatar_url '
        . 'FROM forum_replies r LEFT JOIN users u ON u.id = r.user_id '
        . 'WHERE r.target_type = \'article\' AND r.target_id = ? AND r.parent_id = ? '
        . 'ORDER BY r.created_at ASC');
    $c_stmt->bind_param('ii', $article_id, $comment_id);
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

    $comments[] = [
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
    'article' => [
        'id' => (string)$article['id'],
        'title' => $article['title'],
        'content' => $article['content'],
        'summary' => $article['summary'],
        'cover_image' => $article['cover_image'],
        'views_count' => (int)$article['views_count'] + 1,
        'comments_count' => (int)$article['comments_count'],
        'followers_count' => (int)$article['followers_count'],
        'status' => $article['status'],
        'featured' => (bool)$article['featured'],
        'created_at' => $article['created_at'],
        'updated_at' => $article['updated_at'],
        'author' => [
            'id' => (string)$article['author_id'],
            'username' => $article['author_username'],
            'avatar_url' => $article['author_avatar_url'],
        ],
    ],
    'comments' => $comments,
]);
