<?php
// 创建资源 API - 需要登录
// 资源上传无需审核，status 直接为 'published'
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

$user_id = require_auth();
$input = get_input_json();

$db = getDBConnection();

// 校验必填字段
$title = isset($input['title']) && is_string($input['title']) ? trim($input['title']) : '';
$summary = isset($input['summary']) && is_string($input['summary']) ? trim($input['summary']) : '';
$description = isset($input['description']) && is_string($input['description']) ? $input['description'] : '';
$type = isset($input['type']) && is_string($input['type']) ? trim($input['type']) : '';

if ($title === '' || $type === '') {
    json_response(['success' => false, 'error' => 'title 和 type 为必填字段'], 400);
}

// 校验 type
$allowed_types = ['modpack', 'mod', 'shader', 'renderer', 'software', 'other'];
if (!in_array($type, $allowed_types, true)) {
    json_response(['success' => false, 'error' => 'type 必须为 modpack/mod/shader/renderer/software/other'], 400);
}

$license = isset($input['license']) && is_string($input['license']) ? trim($input['license']) : null;
$cover_image = isset($input['cover_image']) && is_string($input['cover_image']) ? trim($input['cover_image']) : null;

// 生成 slug（slugify title + 随机后缀防冲突）
$base_slug = slugify($title);
$slug = $base_slug . '-' . substr(md5(uniqid('', true)), 0, 6);

// 校验 version 字段
$version_input = isset($input['version']) && is_array($input['version']) ? $input['version'] : null;
if ($version_input === null || empty($version_input['number'])) {
    json_response(['success' => false, 'error' => 'version.number 为必填字段'], 400);
}

$version_number = trim((string)$version_input['number']);
$version_type = isset($version_input['type']) && is_string($version_input['type']) ? trim($version_input['type']) : 'release';
$changelog = isset($version_input['changelog']) && is_string($version_input['changelog']) ? $version_input['changelog'] : null;
$loaders = isset($version_input['loaders']) && is_array($version_input['loaders']) ? $version_input['loaders'] : [];
$mc_versions = isset($version_input['mc_versions']) && is_array($version_input['mc_versions']) ? $version_input['mc_versions'] : [];
$files = isset($version_input['files']) && is_array($version_input['files']) ? $version_input['files'] : [];

if (empty($files)) {
    json_response(['success' => false, 'error' => '至少需要一个 file'], 400);
}

// 开启事务
$db->begin_transaction();

try {
    // 创建 resources 记录
    $stmt = $db->prepare('INSERT INTO resources (slug, title, summary, description, type, user_id, cover_image, license, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, "published", NOW(), NOW())');
    $stmt->bind_param('sssssiss', $slug, $title, $summary, $description, $type, $user_id, $cover_image, $license);
    $stmt->execute();
    $resource_id = (int)$db->insert_id;
    $stmt->close();

    // 创建 resource_tags 记录
    $tags_input = isset($input['tags']) && is_array($input['tags']) ? $input['tags'] : [];
    $tag_stmt = $db->prepare('INSERT INTO resource_tags (resource_id, tag_type, tag_value) VALUES (?, ?, ?)');
    foreach ($tags_input as $tag) {
        if (!isset($tag['type'], $tag['value'])) {
            continue;
        }
        $t_type = (string)$tag['type'];
        $t_value = (string)$tag['value'];
        $tag_stmt->bind_param('iss', $resource_id, $t_type, $t_value);
        $tag_stmt->execute();
    }
    $tag_stmt->close();

    // 创建 resource_gallery 记录
    $gallery_input = isset($input['gallery']) && is_array($input['gallery']) ? $input['gallery'] : [];
    $g_stmt = $db->prepare('INSERT INTO resource_gallery (resource_id, image_url, caption, sort_order) VALUES (?, ?, ?, ?)');
    $sort_idx = 0;
    foreach ($gallery_input as $g_item) {
        if (!isset($g_item['url'])) {
            continue;
        }
        $g_url = (string)$g_item['url'];
        $g_caption = isset($g_item['caption']) ? (string)$g_item['caption'] : null;
        $g_sort = isset($g_item['sort_order']) ? (int)$g_item['sort_order'] : $sort_idx;
        $g_stmt->bind_param('issi', $resource_id, $g_url, $g_caption, $g_sort);
        $g_stmt->execute();
        $sort_idx++;
    }
    $g_stmt->close();

    // 创建 resource_dependencies 记录
    $deps_input = isset($input['dependencies']) && is_array($input['dependencies']) ? $input['dependencies'] : [];
    $d_stmt = $db->prepare('INSERT INTO resource_dependencies (resource_id, dep_type, dep_name, dep_version, dep_url) VALUES (?, ?, ?, ?, ?)');
    foreach ($deps_input as $dep) {
        $d_type = isset($dep['dep_type']) ? (string)$dep['dep_type'] : null;
        $d_name = isset($dep['dep_name']) ? (string)$dep['dep_name'] : null;
        $d_version = isset($dep['dep_version']) ? (string)$dep['dep_version'] : null;
        $d_url = isset($dep['dep_url']) ? (string)$dep['dep_url'] : null;
        $d_stmt->bind_param('issss', $resource_id, $d_type, $d_name, $d_version, $d_url);
        $d_stmt->execute();
    }
    $d_stmt->close();

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
    // 注意：file_size 列在 schema.sql 中为 BIGINT 允许 NULL。
    // mysqli_stmt::bind_param 的 'i' 类型在 PHP 8.1+ 传 null 会报 TypeError。
    // 解决方案：file_size 不存在时设为 0（数据库语义：0 表示未知大小，与 NULL 等价）
    $f_stmt = $db->prepare('INSERT INTO resource_files (version_id, source_type, source_url, file_path, file_size, file_name, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())');
    foreach ($files as $file) {
        if (!isset($file['source_type'])) {
            continue;
        }
        $f_source_type = (string)$file['source_type'];
        $f_source_url = isset($file['source_url']) ? (string)$file['source_url'] : null;
        // Air 源使用前端传来的 file_path（TOS 对象 key）
        // 外部源（modrinth/curseforge/github）file_path 留空，只用 source_url
        $f_file_path = isset($file['file_path']) ? (string)$file['file_path'] : null;
        // file_size 不存在或非数字时默认为 0（兼容 PHP 8.1+ bind_param 'i' 类型限制）
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
    json_response(['success' => false, 'error' => '创建资源失败：' . $e->getMessage()], 500);
}

// 返回结果
json_response([
    'success' => true,
    'resource' => [
        'id' => (string)$resource_id,
        'slug' => $slug,
        'title' => $title,
        'type' => $type,
        'status' => 'published',
    ],
    'version' => [
        'id' => (string)$version_id,
        'resource_id' => (string)$resource_id,
        'version_number' => $version_number,
        'version_type' => $version_type,
    ],
], 201);
