<?php
// 版本详情 API - 公开访问
// 接收 ?id=xxx（version_id）
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

$db = getDBConnection();

$version_id = isset($_GET['id']) ? intval($_GET['id']) : 0;
if ($version_id <= 0) {
    json_response(['success' => false, 'error' => '缺少 id 参数'], 400);
}

// 查询版本
$stmt = $db->prepare('SELECT id, resource_id, version_number, version_type, changelog, downloads_count, created_at '
    . 'FROM resource_versions WHERE id = ? LIMIT 1');
$stmt->bind_param('i', $version_id);
$stmt->execute();
$res = $stmt->get_result();
$version = $res->fetch_assoc();
$stmt->close();

if (!$version) {
    json_response(['success' => false, 'error' => '版本不存在'], 404);
}

$resource_id = (int)$version['resource_id'];

// 查询所属资源基础信息
$stmt = $db->prepare('SELECT r.id, r.slug, r.title, r.summary, r.type, r.cover_image, r.license, '
    . 'u.id AS author_id, u.username AS author_username, u.avatar_url AS author_avatar_url '
    . 'FROM resources r LEFT JOIN users u ON u.id = r.user_id WHERE r.id = ? LIMIT 1');
$stmt->bind_param('i', $resource_id);
$stmt->execute();
$res = $stmt->get_result();
$resource = $res->fetch_assoc();
$stmt->close();

// loaders
$loaders = [];
$l_stmt = $db->prepare('SELECT loader FROM resource_version_loaders WHERE version_id = ?');
$l_stmt->bind_param('i', $version_id);
$l_stmt->execute();
$l_res = $l_stmt->get_result();
while ($l_row = $l_res->fetch_assoc()) {
    $loaders[] = $l_row['loader'];
}
$l_stmt->close();

// mc_versions
$mc_versions = [];
$m_stmt = $db->prepare('SELECT mc_version FROM resource_version_mc_versions WHERE version_id = ?');
$m_stmt->bind_param('i', $version_id);
$m_stmt->execute();
$m_res = $m_stmt->get_result();
while ($m_row = $m_res->fetch_assoc()) {
    $mc_versions[] = $m_row['mc_version'];
}
$m_stmt->close();

// files
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

json_response([
    'success' => true,
    'version' => [
        'id' => (string)$version['id'],
        'resource_id' => (string)$version['resource_id'],
        'version_number' => $version['version_number'],
        'version_type' => $version['version_type'],
        'changelog' => $version['changelog'],
        'downloads_count' => (int)$version['downloads_count'],
        'created_at' => $version['created_at'],
        'loaders' => $loaders,
        'mc_versions' => $mc_versions,
        'files' => $files,
    ],
    'resource' => $resource ? [
        'id' => (string)$resource['id'],
        'slug' => $resource['slug'],
        'title' => $resource['title'],
        'summary' => $resource['summary'],
        'type' => $resource['type'],
        'cover_image' => $resource['cover_image'],
        'license' => $resource['license'],
        'author' => [
            'id' => (string)$resource['author_id'],
            'username' => $resource['author_username'],
            'avatar_url' => $resource['author_avatar_url'],
        ],
    ] : null,
]);
