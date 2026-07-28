<?php
// 下载 API - 需要登录
// 接收 JSON: { version_id, source_type }
// 自增下载计数并返回下载 URL（Air 源返回 503）
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

$user_id = require_auth();
$input = get_input_json();

$db = getDBConnection();

$version_id = isset($input['version_id']) ? intval($input['version_id']) : 0;
$source_type = isset($input['source_type']) && is_string($input['source_type']) ? trim($input['source_type']) : '';

if ($version_id <= 0 || $source_type === '') {
    json_response(['success' => false, 'error' => 'version_id 和 source_type 为必填字段'], 400);
}

// Air 官网下载源直接返回 503 占位
// TODO: 对象存储配置后启用
if ($source_type === 'air') {
    json_response(['success' => false, 'error' => '对象存储尚未配置'], 503);
}

// 校验 source_type
$allowed_sources = ['modrinth', 'curseforge', 'github', 'air'];
if (!in_array($source_type, $allowed_sources, true)) {
    json_response(['success' => false, 'error' => 'source_type 必须为 modrinth/curseforge/github/air'], 400);
}

// 查询版本及关联的 resource_id
$stmt = $db->prepare('SELECT id, resource_id FROM resource_versions WHERE id = ? LIMIT 1');
$stmt->bind_param('i', $version_id);
$stmt->execute();
$res = $stmt->get_result();
$version = $res->fetch_assoc();
$stmt->close();

if (!$version) {
    json_response(['success' => false, 'error' => '版本不存在'], 404);
}

$resource_id = (int)$version['resource_id'];

// 查询对应的 file 记录
$stmt = $db->prepare('SELECT id, source_url FROM resource_files WHERE version_id = ? AND source_type = ? ORDER BY id ASC LIMIT 1');
$stmt->bind_param('is', $version_id, $source_type);
$stmt->execute();
$res = $stmt->get_result();
$file = $res->fetch_assoc();
$stmt->close();

if (!$file) {
    json_response(['success' => false, 'error' => '未找到对应的下载文件'], 404);
}

$file_id = (int)$file['id'];
$source_url = $file['source_url'];

// 自增下载计数
$db->begin_transaction();
try {
    // resource_files.downloads_count
    $stmt = $db->prepare('UPDATE resource_files SET downloads_count = downloads_count + 1 WHERE id = ?');
    $stmt->bind_param('i', $file_id);
    $stmt->execute();
    $stmt->close();

    // resource_versions.downloads_count
    $stmt = $db->prepare('UPDATE resource_versions SET downloads_count = downloads_count + 1 WHERE id = ?');
    $stmt->bind_param('i', $version_id);
    $stmt->execute();
    $stmt->close();

    // resources.downloads_count
    $stmt = $db->prepare('UPDATE resources SET downloads_count = downloads_count + 1 WHERE id = ?');
    $stmt->bind_param('i', $resource_id);
    $stmt->execute();
    $stmt->close();

    $db->commit();
} catch (Exception $e) {
    $db->rollback();
    json_response(['success' => false, 'error' => '更新下载计数失败：' . $e->getMessage()], 500);
}

json_response([
    'success' => true,
    'url' => $source_url,
]);
