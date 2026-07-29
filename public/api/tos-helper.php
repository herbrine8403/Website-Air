<?php
// TOS 预签名 URL 生成工具（纯 PHP 实现，不依赖 SDK）
// 使用火山引擎 TOS Signature V4 算法（注意：TOS 签名与 AWS S3 不完全兼容）
//
// 官方文档：
// - URL 中包含签名: https://docs.volcengine.com/docs/6349/129226
// - 403 错误排查: https://www.volcengine.com/docs/6349/651318
//
// 关键差异（TOS vs AWS S3）：
// - 算法名: TOS4-HMAC-SHA256 (不是 AWS4-HMAC-SHA256)
// - 参数前缀: X-Tos-* (不是 X-Amz-*)
// - Scope 终止符: request (不是 aws4_request)
// - SigningKey 初始值: SK (不是 "AWS4"+SK)
// - StringToSign 前缀: TOS4-HMAC-SHA256

/**
 * 生成 TOS 预签名 URL（用于前端直传或下载）
 *
 * 注意：预签名 URL 只签 host 头，不签 Content-Type
 * 原因：浏览器发送 PUT 时可能会修改 Content-Type（如自动加 charset），
 *       导致签名不匹配。TOS 预签名 URL 的标准做法是只签 host。
 *
 * @param string $http_method HTTP 方法（'GET' 或 'PUT'）
 * @param string $key 对象 key（如 resources/123/456/file.zip）
 * @param int $expires URL 有效期（秒），默认 3600（1小时）
 * @param array $extra_headers 额外的签名头（已废弃，预签名 URL 只签 host）
 * @return string 预签名 URL
 */
function tos_presigned_url($http_method, $key, $expires = 3600, $extra_headers = []) {
    $ak = TOS_ACCESS_KEY;
    $sk = TOS_SECRET_KEY;
    $bucket = TOS_BUCKET;
    $endpoint = TOS_ENDPOINT;
    $region = TOS_REGION;
    $service = TOS_SERVICE; // 'tos'

    // 时间戳（UTC）
    $now = time();
    $date = gmdate('Ymd', $now);
    $datetime = gmdate('Ymd\THis\Z', $now);

    // Host 和 URL
    $host = "{$bucket}.{$endpoint}";
    $object_key = ltrim($key, '/');
    $url = "https://{$host}/{$object_key}";

    // ============ 1. 构建 CanonicalRequest ============
    $canonical_uri = '/' . $object_key;

    // 签名头：只签 host（预签名 URL 的标准做法）
    // 避免浏览器自动修改 Content-Type 导致签名不匹配
    $signed_headers_list = ['host'];
    $canonical_headers = "host:{$host}\n";

    // 注意：忽略 $extra_headers，预签名 URL 中不签其他头
    // 如果需要前端设置 Content-Type，通过返回的 headers 字段告知前端
    // 但 Content-Type 不参与签名计算

    $signed_headers = implode(';', $signed_headers_list);

    // 查询参数（注意：TOS 使用 X-Tos-* 前缀，不是 X-Amz-*）
    $query_params = [
        'X-Tos-Algorithm' => 'TOS4-HMAC-SHA256',
        'X-Tos-Credential' => "{$ak}/{$date}/{$region}/{$service}/request",
        'X-Tos-Date' => $datetime,
        'X-Tos-Expires' => (string)$expires,
        'X-Tos-SignedHeaders' => $signed_headers,
    ];

    // 按字典序排序
    ksort($query_params);

    // 构建 canonical query string（参数名和值都要 URI 编码）
    // 注意：CanonicalQueryString 中不包含 X-Tos-Signature
    $canonical_query = '';
    foreach ($query_params as $k => $v) {
        if ($canonical_query !== '') {
            $canonical_query .= '&';
        }
        $canonical_query .= rawurlencode($k) . '=' . rawurlencode($v);
    }

    // CanonicalRequest = HTTPMethod + \n + CanonicalURI + \n + CanonicalQueryString + \n + CanonicalHeaders + \n + SignedHeaders + \n + HashedPayload
    // 预签名 URL 使用 UNSIGNED-PAYLOAD 代替 HashedPayload
    $canonical_request = $http_method . "\n"
                       . $canonical_uri . "\n"
                       . $canonical_query . "\n"
                       . $canonical_headers . "\n"
                       . $signed_headers . "\n"
                       . 'UNSIGNED-PAYLOAD';

    // ============ 2. 构建 StringToSign ============
    // 注意：TOS 使用 "TOS4-HMAC-SHA256" 前缀，不是 "AWS4-HMAC-SHA256"
    // Scope 格式：{date}/{region}/{service}/request（不是 aws4_request）
    $scope = "{$date}/{$region}/{$service}/request";
    $string_to_sign = "TOS4-HMAC-SHA256\n{$datetime}\n{$scope}\n" . hash('sha256', $canonical_request);

    // ============ 3. 计算 SigningKey ============
    // 注意：TOS 的 SigningKey 派生与 AWS S3 不同
    // - AWS S3: HMAC(HMAC(HMAC(HMAC("AWS4"+SK, date), region), service), "aws4_request")
    // - TOS:     HMAC(HMAC(HMAC(HMAC(SK, date), region), service), "request")
    // 即：TOS 不在 SK 前加 "AWS4"，terminator 是 "request" 而非 "aws4_request"
    $kDate = hash_hmac('sha256', $date, $sk, true);
    $kRegion = hash_hmac('sha256', $region, $kDate, true);
    $kService = hash_hmac('sha256', $service, $kRegion, true);
    $kSigning = hash_hmac('sha256', 'request', $kService, true);

    // ============ 4. 计算 Signature ============
    $signature = hash_hmac('sha256', $string_to_sign, $kSigning);

    // ============ 5. 构建最终 URL ============
    // 将 X-Tos-Signature 追加到查询参数末尾
    return "{$url}?{$canonical_query}&X-Tos-Signature={$signature}";
}

/**
 * 生成上传用预签名 URL（PUT 方法）
 *
 * @param string $key 对象 key
 * @param int $expires 有效期（秒）
 * @param string $content_type 文件 MIME 类型（可选，用于设置 Content-Type 头）
 * @return string 预签名上传 URL
 */
function tos_presigned_upload_url($key, $expires = 3600, $content_type = null) {
    $extra_headers = [];
    if ($content_type) {
        $extra_headers['Content-Type'] = $content_type;
    }
    return tos_presigned_url('PUT', $key, $expires, $extra_headers);
}

/**
 * 生成下载用预签名 URL（GET 方法）
 *
 * @param string $key 对象 key
 * @param int $expires 有效期（秒），默认 7200（2小时）
 * @return string 预签名下载 URL
 */
function tos_presigned_download_url($key, $expires = 7200) {
    return tos_presigned_url('GET', $key, $expires);
}

/**
 * 生成资源的 TOS 对象 key
 * 格式：resources/{resource_id}/versions/{version_id}/{filename}
 *
 * @param int|string $resource_id 资源 ID
 * @param int|string $version_id 版本 ID
 * @param string $filename 文件名
 * @return string 对象 key
 */
function tos_object_key($resource_id, $version_id, $filename) {
    $safe_filename = basename($filename);
    return "resources/{$resource_id}/versions/{$version_id}/{$safe_filename}";
}

/**
 * 验证 TOS 配置是否完整
 * @return bool
 */
function tos_configured() {
    return defined('TOS_ACCESS_KEY') && TOS_ACCESS_KEY
        && defined('TOS_SECRET_KEY') && TOS_SECRET_KEY
        && defined('TOS_BUCKET') && TOS_BUCKET
        && defined('TOS_ENDPOINT') && TOS_ENDPOINT;
}

/**
 * 生成 TOS 对象的公共 URL（直接访问，无需签名）
 * 注意：要求 bucket 或对应前缀配置为公共读，否则会返回 403
 *
 * @param string $key 对象 key
 * @return string 公共 URL
 */
function tos_public_url($key) {
    $object_key = ltrim($key, '/');
    return 'https://' . TOS_BUCKET . '.' . TOS_ENDPOINT . '/' . $object_key;
}

/**
 * 生成封面图片的 TOS 对象 key
 * 格式：covers/{user_id}/{timestamp}_{random}_{filename}
 *
 * @param int|string $user_id 用户 ID
 * @param string $filename 文件名
 * @return string 对象 key
 */
function tos_cover_key($user_id, $filename) {
    $safe_filename = basename($filename);
    $safe_filename = preg_replace('/[^\p{Han}\w.\-]/u', '_', $safe_filename);
    if (strlen($safe_filename) > 200) {
        $ext = pathinfo($safe_filename, PATHINFO_EXTENSION);
        $safe_filename = substr($safe_filename, 0, 190) . ($ext ? '.' . $ext : '');
    }
    $timestamp = time();
    $random = bin2hex(random_bytes(4));
    return "covers/{$user_id}/{$timestamp}_{$random}_{$safe_filename}";
}
