<?php
// Air 官网对象存储上传 API - 生成 TOS 预签名上传 URL
// 前端拿到 URL 后直接 PUT 文件到 TOS，不经过 PHP 服务器
//
// 流程：
// 1. 前端 POST /api/resources/air-upload.php 传入 filename, content_type, file_size, resource_id?, version_id?
// 2. 后端基于 (user_id, file_size, filename) 生成确定性 key，实现去重
// 3. 后端先用 HEAD 请求检查对象是否已存在
//    - 已存在：返回 exists=true 和 key/public_url，前端跳过 PUT 直接复用
//    - 不存在：生成预签名 PUT URL 返回，前端上传
// 4. 上传成功后前端调用 version-create.php 创建版本记录，传入 file_path（TOS key）
//
// 注意：
// - 临时上传使用 key: uploads/{user_id}/{size}_{filename}
// - 封面图片使用 key: covers/{user_id}/{size}_{filename}
// - 已绑定资源使用 key: resources/{resource_id}/versions/{version_id}/{filename}
// - 预签名 URL 默认有效期 1 小时
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../tos-helper.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

$user_id = require_auth();

if (!tos_configured()) {
    json_response(['success' => false, 'error' => '对象存储尚未配置'], 503);
}

$input = get_input_json();
$filename = isset($input['filename']) && is_string($input['filename']) ? trim($input['filename']) : '';
$content_type = isset($input['content_type']) && is_string($input['content_type']) ? trim($input['content_type']) : 'application/octet-stream';
$resource_id = isset($input['resource_id']) ? intval($input['resource_id']) : 0;
$version_id = isset($input['version_id']) ? intval($input['version_id']) : 0;
// upload_type: file（默认，资源文件）/ cover（封面图片）
$upload_type = isset($input['upload_type']) && is_string($input['upload_type']) ? trim($input['upload_type']) : 'file';
// file_size：文件字节数，用于生成去重 key
$file_size = isset($input['file_size']) ? intval($input['file_size']) : 0;

if ($filename === '') {
    json_response(['success' => false, 'error' => 'filename 为必填字段'], 400);
}

// 安全检查文件名：移除路径穿越字符
$safe_filename = basename($filename);
// 移除特殊字符，保留中文、字母、数字、点、下划线、减号
$safe_filename = preg_replace('/[^\p{Han}\w.\-]/u', '_', $safe_filename);
if (strlen($safe_filename) > 200) {
    $ext = pathinfo($safe_filename, PATHINFO_EXTENSION);
    $safe_filename = substr($safe_filename, 0, 190) . ($ext ? '.' . $ext : '');
}

// 根据上传类型生成 TOS 对象 key
if ($upload_type === 'cover') {
    // 封面图片：去重 key
    if ($file_size > 0) {
        $key = tos_cover_key_dedup($user_id, $safe_filename, $file_size);
    } else {
        // 兼容旧前端：没传 file_size 时回退到带随机数的 key
        $key = tos_cover_key($user_id, $safe_filename);
    }
} elseif ($resource_id > 0 && $version_id > 0) {
    // 已绑定资源：使用正式路径（这个路径天然确定，多次上传同文件会覆盖，等于去重）
    $key = tos_object_key($resource_id, $version_id, $safe_filename);
} else {
    // 临时上传：去重 key
    if ($file_size > 0) {
        $key = tos_upload_key_dedup($user_id, $safe_filename, $file_size);
    } else {
        // 兼容旧前端：没传 file_size 时回退到带时间戳的 key（无法去重）
        $timestamp = time();
        $random = bin2hex(random_bytes(4));
        $key = "uploads/{$user_id}/{$timestamp}_{$random}_{$safe_filename}";
    }
}

// ============ 去重检查：先 HEAD 查对象是否已存在 ============
$already_exists = tos_object_exists($key);

if ($already_exists) {
    // 对象已存在，直接返回复用标记，前端跳过 PUT
    $response = [
        'success' => true,
        'exists' => true,
        'key' => $key,
        'upload_type' => $upload_type,
        'message' => '文件已存在，直接复用',
        'free_test' => defined('AIR_SOURCE_FREE_TEST') ? AIR_SOURCE_FREE_TEST : false,
    ];
    if ($upload_type === 'cover') {
        // 封面返回预签名下载 URL（7 天有效）
        $response['public_url'] = tos_presigned_download_url($key, 7 * 24 * 3600);
    }
    json_response($response);
}

// ============ 对象不存在，生成预签名上传 URL ============
$expires = 3600;
$presigned_url = tos_presigned_upload_url($key, $expires, $content_type);

$response = [
    'success' => true,
    'exists' => false,
    'upload_url' => $presigned_url,
    'key' => $key,
    'expires_in' => $expires,
    'method' => 'PUT',
    'headers' => [
        'Content-Type' => $content_type,
    ],
    'free_test' => defined('AIR_SOURCE_FREE_TEST') ? AIR_SOURCE_FREE_TEST : false,
];
if ($upload_type === 'cover') {
    // 封面图片返回预签名下载 URL（有效期 7 天，最大值）
    // 不使用公共 URL，因为桶是私有的，直接访问会 403
    $response['public_url'] = tos_presigned_download_url($key, 7 * 24 * 3600);
    $response['upload_type'] = 'cover';
}

json_response($response);
