<?php
// 版本列表 API - 公开访问
// 接收 ?id=xxx（resource_id）
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

$db = getDBConnection();

$resource_id = isset($_GET['id']) ? intval($_GET['id']) : 0;
if ($resource_id <= 0) {
    json_response(['success' => false, 'error' => '缺少 id 参数'], 400);
}

// 查询所有版本（按 created_at 倒序）
$stmt = $db->prepare('SELECT id, version_number, version_type, changelog, downloads_count, created_at '
    . 'FROM resource_versions WHERE resource_id = ? ORDER BY created_at DESC');
$stmt->bind_param('i', $resource_id);
$stmt->execute();
$res = $stmt->get_result();

$versions = [];
while ($row = $res->fetch_assoc()) {
    $version_id = (int)$row['id'];

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

    $versions[] = [
        'id' => (string)$row['id'],
        'resource_id' => (string)$resource_id,
        'version_number' => $row['version_number'],
        'version_type' => $row['version_type'],
        'changelog' => $row['changelog'],
        'downloads_count' => (int)$row['downloads_count'],
        'created_at' => $row['created_at'],
        'loaders' => $loaders,
        'mc_versions' => $mc_versions,
        'files' => $files,
    ];
}
$stmt->close();

json_response([
    'success' => true,
    'versions' => $versions,
]);
