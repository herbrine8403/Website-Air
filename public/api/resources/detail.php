<?php
// 资源详情 API - 公开访问
// 接收 ?slug=xxx 或 ?id=xxx
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

$db = getDBConnection();

$slug = isset($_GET['slug']) && $_GET['slug'] !== '' ? trim($_GET['slug']) : null;
$id = isset($_GET['id']) && $_GET['id'] !== '' ? intval($_GET['id']) : null;

if ($slug === null && $id === null) {
    json_response(['success' => false, 'error' => '缺少 slug 或 id 参数'], 400);
}

// 查询资源
if ($slug !== null) {
    $stmt = $db->prepare('SELECT r.*, u.id AS author_id, u.username AS author_username, u.avatar_url AS author_avatar_url '
        . 'FROM resources r LEFT JOIN users u ON u.id = r.user_id WHERE r.slug = ? LIMIT 1');
    $stmt->bind_param('s', $slug);
} else {
    $stmt = $db->prepare('SELECT r.*, u.id AS author_id, u.username AS author_username, u.avatar_url AS author_avatar_url '
        . 'FROM resources r LEFT JOIN users u ON u.id = r.user_id WHERE r.id = ? LIMIT 1');
    $stmt->bind_param('i', $id);
}
$stmt->execute();
$res = $stmt->get_result();
$resource = $res->fetch_assoc();
$stmt->close();

if (!$resource) {
    json_response(['success' => false, 'error' => '资源不存在'], 404);
}

$resource_id = (int)$resource['id'];

// 获取标签
$tags = [];
$stmt = $db->prepare('SELECT tag_type, tag_value FROM resource_tags WHERE resource_id = ?');
$stmt->bind_param('i', $resource_id);
$stmt->execute();
$res = $stmt->get_result();
while ($row = $res->fetch_assoc()) {
    $tags[] = ['type' => $row['tag_type'], 'value' => $row['tag_value']];
}
$stmt->close();

// 获取画廊
$gallery = [];
$stmt = $db->prepare('SELECT image_url, caption, sort_order FROM resource_gallery WHERE resource_id = ? ORDER BY sort_order ASC, id ASC');
$stmt->bind_param('i', $resource_id);
$stmt->execute();
$res = $stmt->get_result();
while ($row = $res->fetch_assoc()) {
    $gallery[] = [
        'image_url' => $row['image_url'],
        'caption' => $row['caption'],
        'sort_order' => (int)$row['sort_order'],
    ];
}
$stmt->close();

// 获取依赖
$dependencies = [];
$stmt = $db->prepare('SELECT dep_type, dep_name, dep_version, dep_url FROM resource_dependencies WHERE resource_id = ? ORDER BY id ASC');
$stmt->bind_param('i', $resource_id);
$stmt->execute();
$res = $stmt->get_result();
while ($row = $res->fetch_assoc()) {
    $dependencies[] = [
        'dep_type' => $row['dep_type'],
        'dep_name' => $row['dep_name'],
        'dep_version' => $row['dep_version'],
        'dep_url' => $row['dep_url'],
    ];
}
$stmt->close();

// 获取最新版本
$latest_version = null;
$stmt = $db->prepare('SELECT id, version_number, version_type, changelog, downloads_count, created_at '
    . 'FROM resource_versions WHERE resource_id = ? ORDER BY created_at DESC LIMIT 1');
$stmt->bind_param('i', $resource_id);
$stmt->execute();
$res = $stmt->get_result();
if ($version_row = $res->fetch_assoc()) {
    $version_id = (int)$version_row['id'];

    // 版本的 loaders
    $loaders = [];
    $l_stmt = $db->prepare('SELECT loader FROM resource_version_loaders WHERE version_id = ?');
    $l_stmt->bind_param('i', $version_id);
    $l_stmt->execute();
    $l_res = $l_stmt->get_result();
    while ($l_row = $l_res->fetch_assoc()) {
        $loaders[] = $l_row['loader'];
    }
    $l_stmt->close();

    // 版本的 mc_versions
    $mc_versions = [];
    $m_stmt = $db->prepare('SELECT mc_version FROM resource_version_mc_versions WHERE version_id = ?');
    $m_stmt->bind_param('i', $version_id);
    $m_stmt->execute();
    $m_res = $m_stmt->get_result();
    while ($m_row = $m_res->fetch_assoc()) {
        $mc_versions[] = $m_row['mc_version'];
    }
    $m_stmt->close();

    // 版本的 files
    $files = [];
    $f_stmt = $db->prepare('SELECT id, source_type, source_url, file_path, file_size, file_name, downloads_count, created_at FROM resource_files WHERE version_id = ? ORDER BY id ASC');
    $f_stmt->bind_param('i', $version_id);
    $f_stmt->execute();
    $f_res = $f_stmt->get_result();
    while ($f_row = $f_res->fetch_assoc()) {
        $files[] = [
            'id' => (string)$f_row['id'],
            'source_type' => $f_row['source_type'],
            'source_url' => $f_row['source_url'],
            'file_path' => $f_row['file_path'],
            'file_size' => $f_row['file_size'] !== null ? (int)$f_row['file_size'] : null,
            'file_name' => $f_row['file_name'],
            'downloads_count' => (int)$f_row['downloads_count'],
            'created_at' => $f_row['created_at'],
        ];
    }
    $f_stmt->close();

    $latest_version = [
        'id' => (string)$version_row['id'],
        'version_number' => $version_row['version_number'],
        'version_type' => $version_row['version_type'],
        'changelog' => $version_row['changelog'],
        'downloads_count' => (int)$version_row['downloads_count'],
        'created_at' => $version_row['created_at'],
        'loaders' => $loaders,
        'mc_versions' => $mc_versions,
        'files' => $files,
    ];
}
$stmt->close();

// 检查当前用户是否关注
$is_following = false;
$current_user_id = get_current_user_id();
if ($current_user_id !== null) {
    $stmt = $db->prepare('SELECT id FROM resource_follows WHERE resource_id = ? AND user_id = ? LIMIT 1');
    $stmt->bind_param('ii', $resource_id, $current_user_id);
    $stmt->execute();
    $stmt->store_result();
    if ($stmt->num_rows > 0) {
        $is_following = true;
    }
    $stmt->close();
}

json_response([
    'success' => true,
    'resource' => [
        'id' => (string)$resource['id'],
        'slug' => $resource['slug'],
        'title' => $resource['title'],
        'summary' => $resource['summary'],
        'description' => $resource['description'],
        'type' => $resource['type'],
        'cover_image' => $resource['cover_image'],
        'downloads_count' => (int)$resource['downloads_count'],
        'followers_count' => (int)$resource['followers_count'],
        'rating_avg' => (float)$resource['rating_avg'],
        'rating_count' => (int)$resource['rating_count'],
        'license' => $resource['license'],
        'status' => $resource['status'],
        'featured' => (bool)$resource['featured'],
        'created_at' => $resource['created_at'],
        'updated_at' => $resource['updated_at'],
        'author' => [
            'id' => (string)$resource['author_id'],
            'username' => $resource['author_username'],
            'avatar_url' => $resource['author_avatar_url'],
        ],
        'tags' => $tags,
        'gallery' => $gallery,
        'dependencies' => $dependencies,
        'latest_version' => $latest_version,
        'is_following' => $is_following,
    ],
]);
