<?php
// 资源列表 API - 公开访问
// 支持 query params: ?type=xxx&page=1&size=20&sort=newest|popular|downloads&q=xxx&tag_type=xxx&tag_value=xxx
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

$db = getDBConnection();

// 分页参数
$page = max(1, intval($_GET['page'] ?? 1));
$size = min(100, max(1, intval($_GET['size'] ?? 20)));
$offset = ($page - 1) * $size;

// 筛选参数
$type = isset($_GET['type']) && $_GET['type'] !== '' ? trim($_GET['type']) : null;
$sort = $_GET['sort'] ?? 'newest';
$q = isset($_GET['q']) && $_GET['q'] !== '' ? trim($_GET['q']) : null;
$tag_type = isset($_GET['tag_type']) && $_GET['tag_type'] !== '' ? trim($_GET['tag_type']) : null;
$tag_value = isset($_GET['tag_value']) && $_GET['tag_value'] !== '' ? trim($_GET['tag_value']) : null;

// 排序映射
$sort_map = [
    'newest' => 'r.created_at DESC',
    'popular' => 'r.followers_count DESC, r.downloads_count DESC',
    'downloads' => 'r.downloads_count DESC',
];
$order_clause = $sort_map[$sort] ?? $sort_map['newest'];

// 构建 WHERE 条件
$where = ["r.status = 'published'"];
$types = '';
$params = [];

if ($type !== null) {
    $where[] = "r.type = ?";
    $types .= 's';
    $params[] = $type;
}

if ($q !== null) {
    $where[] = "(r.title LIKE ? OR r.summary LIKE ?)";
    $types .= 'ss';
    $like = '%' . $q . '%';
    $params[] = $like;
    $params[] = $like;
}

$join_tag = '';
if ($tag_type !== null && $tag_value !== null) {
    $join_tag = " INNER JOIN resource_tags rt ON rt.resource_id = r.id ";
    $where[] = "rt.tag_type = ? AND rt.tag_value = ?";
    $types .= 'ss';
    $params[] = $tag_type;
    $params[] = $tag_value;
} elseif ($tag_type !== null) {
    $join_tag = " INNER JOIN resource_tags rt ON rt.resource_id = r.id ";
    $where[] = "rt.tag_type = ?";
    $types .= 's';
    $params[] = $tag_type;
}

$where_clause = implode(' AND ', $where);

// 查询总数
$count_sql = "SELECT COUNT(DISTINCT r.id) AS total FROM resources r $join_tag WHERE $where_clause";
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

// 查询列表
$list_sql = "SELECT DISTINCT r.id, r.slug, r.title, r.summary, r.type, r.cover_image, "
    . "r.downloads_count, r.followers_count, r.rating_avg, r.rating_count, r.created_at, "
    . "u.id AS author_id, u.username AS author_username, u.avatar_url AS author_avatar_url "
    . "FROM resources r $join_tag "
    . "LEFT JOIN users u ON u.id = r.user_id "
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
    $resource_id = (int)$row['id'];

    // 获取资源标签
    $tags = [];
    $tag_stmt = $db->prepare("SELECT tag_type, tag_value FROM resource_tags WHERE resource_id = ?");
    $tag_stmt->bind_param('i', $resource_id);
    $tag_stmt->execute();
    $tag_res = $tag_stmt->get_result();
    while ($tag_row = $tag_res->fetch_assoc()) {
        $tags[] = [
            'type' => $tag_row['tag_type'],
            'value' => $tag_row['tag_value'],
        ];
    }
    $tag_stmt->close();

    $items[] = [
        'id' => (string)$row['id'],
        'slug' => $row['slug'],
        'title' => $row['title'],
        'summary' => $row['summary'],
        'type' => $row['type'],
        'cover_image' => $row['cover_image'],
        'downloads_count' => (int)$row['downloads_count'],
        'followers_count' => (int)$row['followers_count'],
        'rating_avg' => (float)$row['rating_avg'],
        'rating_count' => (int)$row['rating_count'],
        'author' => [
            'id' => (string)$row['author_id'],
            'username' => $row['author_username'],
            'avatar_url' => $row['author_avatar_url'],
        ],
        'created_at' => $row['created_at'],
        'tags' => $tags,
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
