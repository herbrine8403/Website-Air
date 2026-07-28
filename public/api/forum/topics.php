<?php
// 话题列表 API - 公开访问
// 支持 ?category=xxx&page=1&size=20&sort=newest|hot|replies
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

$db = getDBConnection();

// 分页参数
$page = max(1, intval($_GET['page'] ?? 1));
$size = min(100, max(1, intval($_GET['size'] ?? 20)));
$offset = ($page - 1) * $size;

// 筛选与排序
$category = isset($_GET['category']) && $_GET['category'] !== '' ? trim($_GET['category']) : null;
$sort = $_GET['sort'] ?? 'newest';

$sort_map = [
    'newest' => 't.created_at DESC',
    'hot' => 't.followers_count DESC, t.views_count DESC',
    'replies' => 't.replies_count DESC',
];
$order_clause = $sort_map[$sort] ?? $sort_map['newest'];

// 构建 WHERE
$where = ["t.status = 'published'"];
$types = '';
$params = [];

if ($category !== null) {
    $where[] = "t.category = ?";
    $types .= 's';
    $params[] = $category;
}

$where_clause = implode(' AND ', $where);

// 总数
$count_sql = "SELECT COUNT(*) AS total FROM forum_topics t WHERE $where_clause";
$stmt = $db->prepare($count_sql);
if ($types !== '') {
    $stmt->bind_param($types, ...$params);
}
$stmt->execute();
$res = $stmt->get_result();
$total = 0;
if ($row = $res->fetch_assoc()) {
    $total = (int)$row['total'];
}
$stmt->close();

// 列表查询
$list_sql = "SELECT t.id, t.title, t.category, t.views_count, t.replies_count, t.followers_count, "
    . "t.created_at, t.last_reply_at, "
    . "u.id AS author_id, u.username AS author_username, u.avatar_url AS author_avatar_url "
    . "FROM forum_topics t "
    . "LEFT JOIN users u ON u.id = t.user_id "
    . "WHERE $where_clause "
    . "ORDER BY $order_clause "
    . "LIMIT ? OFFSET ?";

$stmt = $db->prepare($list_sql);
$limit_types = $types . 'ii';
$bind_params = array_merge($params, [$size, $offset]);
$stmt->bind_param($limit_types, ...$bind_params);
$stmt->execute();
$res = $stmt->get_result();

$items = [];
while ($row = $res->fetch_assoc()) {
    $items[] = [
        'id' => (string)$row['id'],
        'title' => $row['title'],
        'category' => $row['category'],
        'views_count' => (int)$row['views_count'],
        'replies_count' => (int)$row['replies_count'],
        'followers_count' => (int)$row['followers_count'],
        'created_at' => $row['created_at'],
        'last_reply_at' => $row['last_reply_at'],
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
