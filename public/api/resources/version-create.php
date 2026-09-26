<?php
// 创建新版本 API - 需要登录
// 接收 JSON: { resource_id, version_number, version_type, changelog, loaders?, mc_versions?, files: [{source_type, source_url?}] }
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

$user_id = require_auth();
$input = get_input_json();

$db = getDBConnection();

$resource_id = isset($input['resource_id']) ? intval($input['resource_id']) : 0;
if ($resource_id <= 0) {
    json_response(['success' => false, 'error' => 'resource_id 为必填字段'], 400);
}

$version_number = isset($input['version_number']) && is_string($input['version_number']) ? trim($input['version_number']) : '';
if ($version_number === '') {
    json_response(['success' => false, 'error' => 'version_number 为必填字段'], 400);
}

$version_type = isset($input['version_type']) && is_string($input['version_type']) ? trim($input['version_type']) : 'release';
$changelog = isset($input['changelog']) && is_string($input['changelog']) ? $input['changelog'] : null;
$loaders = isset($input['loaders']) && is_array($input['loaders']) ? $input['loaders'] : [];
$mc_versions = isset($input['mc_versions']) && is_array($input['mc_versions']) ? $input['mc_versions'] : [];
$files = isset($input['files']) && is_array($input['files']) ? $input['files'] : [];

if (empty($files)) {
    json_response(['success' => false, 'error' => '至少需要一个 file'], 400);
}

// 校验当前用户是资源所有者
$stmt = $db->prepare('SELECT id, user_id FROM resources WHERE id = ? LIMIT 1');
$stmt->bind_param('i', $resource_id);
$stmt->execute();
$res = $stmt->get_result();
$resource = $res->fetch_assoc();
$stmt->close();

if (!$resource) {
    json_response(['success' => false, 'error' => '资源不存在'], 404);
}

if ((int)$resource['user_id'] !== $user_id) {
    json_response(['success' => false, 'error' => '无权操作：仅所有者可创建版本'], 403);
}

$db->begin_transaction();

try {
    // 创建 resource_versions 记录
    $v_stmt = $db->prepare('INSERT INTO resource_versions (resource_id, version_number, version_type, changelog, created_at) VALUES (?, ?, ?, ?, NOW())');
    $v_stmt->bind_param('isss', $resource_id, $version_number, $version_type, $changelog);
    $v_stmt->execute();
    $version_id = (int)$db->insert_id;
    $v_stmt->close();

    // 创建 resource_version_loaders
    if (!empty($loaders)) {
        $vl_stmt = $db->prepare('INSERT INTO resource_version_loaders (version_id, loader) VALUES (?, ?)');
        foreach ($loaders as $loader) {
            $loader_str = (string)$loader;
            $vl_stmt->bind_param('is', $version_id, $loader_str);
            $vl_stmt->execute();
        }
        $vl_stmt->close();
    }

    // 创建 resource_version_mc_versions
    if (!empty($mc_versions)) {
        $mv_stmt = $db->prepare('INSERT INTO resource_version_mc_versions (version_id, mc_version) VALUES (?, ?)');
        foreach ($mc_versions as $mc_ver) {
            $mc_ver_str = (string)$mc_ver;
            $mv_stmt->bind_param('is', $version_id, $mc_ver_str);
            $mv_stmt->execute();
        }
        $mv_stmt->close();
    }

    // 创建 resource_files 记录
    // 注意：file_size 列允许 NULL，但 bind_param 'i' 类型在 PHP 8.1+ 不允许 null
    // 解决方案：file_size 不存在时默认为 0（语义：0 表示未知大小，与 NULL 等价）
    $f_stmt = $db->prepare('INSERT INTO resource_files (version_id, source_type, source_url, file_path, file_size, file_name, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())');
    foreach ($files as $file) {
        if (!isset($file['source_type'])) {
            continue;
        }
        $f_source_type = (string)$file['source_type'];
        $f_source_url = isset($file['source_url']) ? (string)$file['source_url'] : null;
        // Air 官网下载源使用 file_path（TOS 对象 key），其他源使用 source_url
        if ($f_source_type === 'air') {
            $f_file_path = isset($file['file_path']) ? (string)$file['file_path'] : null;
            // 如果只传了 file_name 没传 file_path，可以后续补充
        } else {
            $f_file_path = null;
        }
        // file_size 兼容 null：默认 0
        $f_file_size_raw = isset($file['file_size']) ? $file['file_size'] : 0;
        $f_file_size = is_numeric($f_file_size_raw) ? (int)$f_file_size_raw : 0;
        $f_file_name = isset($file['file_name']) ? (string)$file['file_name'] : null;
        $f_stmt->bind_param('isssis', $version_id, $f_source_type, $f_source_url, $f_file_path, $f_file_size, $f_file_name);
        $f_stmt->execute();
    }
    $f_stmt->close();

    $db->commit();
} catch (Exception $e) {
    $db->rollback();
    json_response(['success' => false, 'error' => '创建版本失败：' . $e->getMessage()], 500);
}

json_response([
    'success' => true,
    'version' => [
        'id' => (string)$version_id,
        'resource_id' => (string)$resource_id,
        'version_number' => $version_number,
        'version_type' => $version_type,
        'changelog' => $changelog,
        'loaders' => $loaders,
        'mc_versions' => $mc_versions,
    ],
], 201);
