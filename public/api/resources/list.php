<?php
// 资源列表 API - 公开访问
// 支持的 query params:
//   ?type=xxx&types=a,b,c&page=1&size=20&sort=newest|popular|downloads|relevance&q=xxx
//   &tag_type=xxx&tag_value=a,b,c（逗号分隔多值）
//   &loader=Fabric,Forge（逗号分隔多值）
//   &game_version=1.20.1,1.21（逗号分隔多值）
//   &env=客户端,服务端（逗号分隔多值，匹配 resource_tags.tag_type='environment'）
//   &source=modrinth,air（逗号分隔多值，匹配 resource_files.source_type）
//   &user_id=xxx&mine=1&status=xxx
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

$db = getDBConnection();

// 分页参数
$page = max(1, intval($_GET['page'] ?? 1));
$size = min(100, max(1, intval($_GET['size'] ?? 20)));
$offset = ($page - 1) * $size;

// ============ 筛选参数 ============
// type（单值，向后兼容）/ types（复数，逗号分隔，优先级高于 type）
$types_param = isset($_GET['types']) && $_GET['types'] !== '' ? trim($_GET['types']) : null;
$type_param = isset($_GET['type']) && $_GET['type'] !== '' ? trim($_GET['type']) : null;
$type_list = [];
if ($types_param !== null) {
    foreach (explode(',', $types_param) as $t) {
        $t = trim($t);
        if ($t !== '') $type_list[] = $t;
    }
}
if (empty($type_list) && $type_param !== null) {
    $type_list[] = $type_param;
}

$sort = $_GET['sort'] ?? 'newest';
$q = isset($_GET['q']) && $_GET['q'] !== '' ? trim($_GET['q']) : null;

// tag_type / tag_value（均支持逗号分隔多值）
$tag_type = isset($_GET['tag_type']) && $_GET['tag_type'] !== '' ? trim($_GET['tag_type']) : null;
$tag_value_raw = isset($_GET['tag_value']) && $_GET['tag_value'] !== '' ? trim($_GET['tag_value']) : null;
$tag_value_list = [];
if ($tag_value_raw !== null) {
    foreach (explode(',', $tag_value_raw) as $v) {
        $v = trim($v);
        if ($v !== '') $tag_value_list[] = $v;
    }
}

// loader（逗号分隔多值，匹配 resource_version_loaders.loader）
$loader_raw = isset($_GET['loader']) && $_GET['loader'] !== '' ? trim($_GET['loader']) : null;
$loader_list = [];
if ($loader_raw !== null) {
    foreach (explode(',', $loader_raw) as $l) {
        $l = trim($l);
        if ($l !== '') $loader_list[] = $l;
    }
}

// game_version（逗号分隔多值，匹配 resource_version_mc_versions.mc_version）
$game_version_raw = isset($_GET['game_version']) && $_GET['game_version'] !== '' ? trim($_GET['game_version']) : null;
$game_version_list = [];
if ($game_version_raw !== null) {
    foreach (explode(',', $game_version_raw) as $v) {
        $v = trim($v);
        if ($v !== '') $game_version_list[] = $v;
    }
}

// env（逗号分隔多值，匹配 resource_tags.tag_type='environment' AND tag_value IN (...)）
$env_raw = isset($_GET['env']) && $_GET['env'] !== '' ? trim($_GET['env']) : null;
$env_list = [];
if ($env_raw !== null) {
    foreach (explode(',', $env_raw) as $e) {
        $e = trim($e);
        if ($e !== '') $env_list[] = $e;
    }
}

// source（逗号分隔多值，匹配 resource_files.source_type IN (...)）
$source_raw = isset($_GET['source']) && $_GET['source'] !== '' ? trim($_GET['source']) : null;
$source_list = [];
if ($source_raw !== null) {
    foreach (explode(',', $source_raw) as $s) {
        $s = trim($s);
        if ($s !== '') $source_list[] = $s;
    }
}

$user_id = isset($_GET['user_id']) ? (int)$_GET['user_id'] : 0;
$mine = isset($_GET['mine']) ? (int)$_GET['mine'] : 0;
$status = isset($_GET['status']) && $_GET['status'] !== '' ? trim($_GET['status']) : null;

// 如果指定了 mine=1，需要从 token 提取 user_id
if ($mine === 1 && $user_id === 0) {
    try {
        $user_id = require_auth();
    } catch (Exception $e) {
        json_response(['success' => false, 'error' => '未登录', 'code' => 'unauthorized'], 401);
    }
}

// ============ 排序映射 ============
// 'relevance' 当有 q 时使用，否则回退 newest
$sort_map = [
    'newest' => 'r.created_at DESC',
    'popular' => 'r.followers_count DESC, r.downloads_count DESC',
    'downloads' => 'r.downloads_count DESC',
    'relevance' => $q !== null ? 'r.created_at DESC' : 'r.created_at DESC',
];
$order_clause = $sort_map[$sort] ?? $sort_map['newest'];

// ============ 构建 WHERE 条件 ============
$where = [];
$types = '';
$params = [];

if ($status !== null) {
    // 资源管理页面场景：显示指定状态的资源（需要 user_id 鉴权）
    $where[] = "r.status = ?";
    $types .= 's';
    $params[] = $status;
    if ($user_id > 0) {
        $where[] = "r.user_id = ?";
        $types .= 'i';
        $params[] = $user_id;
    }
} elseif ($user_id > 0) {
    // 按用户筛选（公开主页场景：只显示该用户已发布的资源）
    $where[] = "r.status = 'published'";
    $where[] = "r.user_id = ?";
    $types .= 'i';
    $params[] = $user_id;
} else {
    // 默认场景：只显示已发布资源
    $where[] = "r.status = 'published'";
}

// 类型筛选（单值或多值，统一用 IN）
if (!empty($type_list)) {
    $placeholders = implode(',', array_fill(0, count($type_list), '?'));
    $where[] = "r.type IN ($placeholders)";
    $types .= str_repeat('s', count($type_list));
    foreach ($type_list as $t) {
        $params[] = $t;
    }
}

// 关键词搜索
if ($q !== null) {
    $where[] = "(r.title LIKE ? OR r.summary LIKE ?)";
    $types .= 'ss';
    $like = '%' . $q . '%';
    $params[] = $like;
    $params[] = $like;
}

// ============ 构建 JOIN ============
// 注意：需要 DISTINCT r.id 防止因 JOIN 产生重复行
$join_tag = '';
$join_loader = '';
$join_mc_version = '';
$join_env = '';
$join_source = '';

// tag_value 筛选（按 tag_type + tag_value 匹配，支持多值）
// 兼容性：当 tag_type='ios' 时同时匹配旧版 tag_type='general' 数据
// （旧版 UploadPage 把 iOS 标签存为 tag_type='general'，新版统一为 tag_type='ios'）
if ($tag_value_list) {
    $join_tag = " INNER JOIN resource_tags rt ON rt.resource_id = r.id ";
    if ($tag_type !== null) {
        if ($tag_type === 'ios') {
            // 兼容旧数据：tag_type='ios' 或 tag_type='general' 均视为 iOS 标签
            $where[] = "rt.tag_type IN ('ios', 'general')";
        } else {
            $where[] = "rt.tag_type = ?";
            $types .= 's';
            $params[] = $tag_type;
        }
    }
    $placeholders = implode(',', array_fill(0, count($tag_value_list), '?'));
    $where[] = "rt.tag_value IN ($placeholders)";
    $types .= str_repeat('s', count($tag_value_list));
    foreach ($tag_value_list as $v) {
        $params[] = $v;
    }
} elseif ($tag_type !== null) {
    // 仅指定 tag_type 不指定 tag_value
    $join_tag = " INNER JOIN resource_tags rt ON rt.resource_id = r.id ";
    if ($tag_type === 'ios') {
        $where[] = "rt.tag_type IN ('ios', 'general')";
    } else {
        $where[] = "rt.tag_type = ?";
        $types .= 's';
        $params[] = $tag_type;
    }
}

// env 筛选（resource_tags.tag_type='environment' AND tag_value IN (...)）
if (!empty($env_list)) {
    $join_env = " INNER JOIN resource_tags rt_env ON rt_env.resource_id = r.id AND rt_env.tag_type = 'environment' ";
    $placeholders = implode(',', array_fill(0, count($env_list), '?'));
    $where[] = "rt_env.tag_value IN ($placeholders)";
    $types .= str_repeat('s', count($env_list));
    foreach ($env_list as $e) {
        $params[] = $e;
    }
}

// loader 筛选（需要联表 resource_versions + resource_version_loaders）
if (!empty($loader_list)) {
    $join_loader = " INNER JOIN resource_versions rv_loader ON rv_loader.resource_id = r.id "
                 . " INNER JOIN resource_version_loaders rvl ON rvl.version_id = rv_loader.id ";
    $placeholders = implode(',', array_fill(0, count($loader_list), '?'));
    $where[] = "rvl.loader IN ($placeholders)";
    $types .= str_repeat('s', count($loader_list));
    foreach ($loader_list as $l) {
        $params[] = $l;
    }
}

// game_version 筛选（需要联表 resource_versions + resource_version_mc_versions）
if (!empty($game_version_list)) {
    $join_mc_version = " INNER JOIN resource_versions rv_mc ON rv_mc.resource_id = r.id "
                     . " INNER JOIN resource_version_mc_versions rvmv ON rvmv.version_id = rv_mc.id ";
    $placeholders = implode(',', array_fill(0, count($game_version_list), '?'));
    $where[] = "rvmv.mc_version IN ($placeholders)";
    $types .= str_repeat('s', count($game_version_list));
    foreach ($game_version_list as $v) {
        $params[] = $v;
    }
}

// source 筛选（需要联表 resource_versions + resource_files）
if (!empty($source_list)) {
    $join_source = " INNER JOIN resource_versions rv_src ON rv_src.resource_id = r.id "
                 . " INNER JOIN resource_files rf_src ON rf_src.version_id = rv_src.id ";
    $placeholders = implode(',', array_fill(0, count($source_list), '?'));
    $where[] = "rf_src.source_type IN ($placeholders)";
    $types .= str_repeat('s', count($source_list));
    foreach ($source_list as $s) {
        $params[] = $s;
    }
}

$where_clause = implode(' AND ', $where);

// 拼接所有 JOIN（保持顺序，避免重复）
$all_joins = $join_tag . $join_env . $join_loader . $join_mc_version . $join_source;

// ============ 查询总数 ============
$count_sql = "SELECT COUNT(DISTINCT r.id) AS total FROM resources r $all_joins WHERE $where_clause";
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

// ============ 查询列表 ============
$list_sql = "SELECT DISTINCT r.id, r.slug, r.title, r.summary, r.type, r.cover_image, "
    . "r.downloads_count, r.followers_count, r.rating_avg, r.rating_count, r.created_at, r.updated_at, "
    . "u.id AS author_id, u.username AS author_username, u.avatar_url AS author_avatar_url "
    . "FROM resources r $all_joins "
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
        'updated_at' => $row['updated_at'],
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
