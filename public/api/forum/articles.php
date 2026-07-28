<?php
// 文章列表 API - 公开访问
// 支持 ?page=1&size=20&sort=newest|hot
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

$db = getDBConnection();

// 分页参数
$page = max(1, intval($_GET['page'] ?? 1));
$size = min(100, max(1, intval($_GET['size'] ?? 20)));
$offset = ($page - 1) * $size;

$sort = $_GET['sort'] ?? 'newest';

$sort_map = [
    'newest' => 'a.created_at DESC',
    'hot' => 'a.followers_count DESC, a.views_count DESC',
];
$order_clause = $sort_map[$sort] ?? $sort_map['newest'];

$where_clause = "a.status = 'published'";

// 总数
$stmt = $db->prepare("SELECT COUNT(*) AS total FROM forum_articles a WHERE $where_clause");
$stmt->execute();
$res = $stmt->get_result();
$total = 0;
if ($row = $res->fetch_assoc()) {
    $total = (int)$row['total'];
}
$stmt->close();

// 列表查询
$list_sql = "SELECT a.id, a.title, a.summary, a.cover_image, a.views_count, a.comments_count, "
    . "a.created_at, "
    . "u.id AS author_id, u.username AS author_username, u.avatar_url AS author_avatar_url "
    . "FROM forum_articles a "
    . "LEFT JOIN users u ON u.id = a.user_id "
    . "WHERE $where_clause "
    . "ORDER BY $order_clause "
    . "LIMIT ? OFFSET ?";

$stmt = $db->prepare($list_sql);
$stmt->bind_param('ii', $size, $offset);
$stmt->execute();
$res = $stmt->get_result();

$items = [];
while ($row = $res->fetch_assoc()) {
    $items[] = [
        'id' => (string)$row['id'],
        'title' => $row['title'],
        'summary' => $row['summary'],
        'cover_image' => $row['cover_image'],
        'views_count' => (int)$row['views_count'],
        'comments_count' => (int)$row['comments_count'],
        'created_at' => $row['created_at'],
        'author' => [
            'id' => (string)$row['author_id'],
            'username' => $row['author_username'],
            'avatar_url' => $row['author_avatar_url'],
        ],
    ];
}
$stmt->close();

json_response([
    'success' => true,
    'items' => $items,
    'total' => $total,
    'page' => $page,
    'size' => $size,
]);
