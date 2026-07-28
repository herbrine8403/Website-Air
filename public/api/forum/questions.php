<?php
// 问题列表 API - 公开访问
// 支持 ?page=1&size=20&sort=newest|hot|unanswered&status=solved|unsolved|bounty
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
$status_filter = isset($_GET['status']) && $_GET['status'] !== '' ? trim($_GET['status']) : null;

// 构建 WHERE
$where = ["q.status = 'published'"];
$types = '';
$params = [];

if ($status_filter === 'solved') {
    $where[] = "q.has_accepted = 1";
} elseif ($status_filter === 'unsolved') {
    $where[] = "q.has_accepted = 0";
} elseif ($status_filter === 'bounty') {
    $where[] = "q.bounty > 0";
}

// unanswered 排序意味着先显示未回答的
$sort_map = [
    'newest' => 'q.created_at DESC',
    'hot' => 'q.followers_count DESC, q.views_count DESC',
    'unanswered' => 'q.answers_count ASC, q.created_at DESC',
];
$order_clause = $sort_map[$sort] ?? $sort_map['newest'];

$where_clause = implode(' AND ', $where);

// 总数
$count_sql = "SELECT COUNT(*) AS total FROM forum_questions q WHERE $where_clause";
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
$list_sql = "SELECT q.id, q.title, q.tags, q.bounty, q.views_count, q.answers_count, q.has_accepted, q.created_at, "
    . "u.id AS author_id, u.username AS author_username, u.avatar_url AS author_avatar_url "
    . "FROM forum_questions q "
    . "LEFT JOIN users u ON u.id = q.user_id "
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
    // tags 字段是逗号分隔字符串，转为数组
    $tags_raw = $row['tags'];
    $tags = [];
    if ($tags_raw !== null && $tags_raw !== '') {
        $tags = array_map('trim', explode(',', $tags_raw));
    }

    $items[] = [
        'id' => (string)$row['id'],
        'title' => $row['title'],
        'tags' => $tags,
        'bounty' => (int)$row['bounty'],
        'views_count' => (int)$row['views_count'],
        'answers_count' => (int)$row['answers_count'],
        'has_accepted' => (bool)$row['has_accepted'],
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
