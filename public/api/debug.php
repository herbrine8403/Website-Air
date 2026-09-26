<?php
/**
 * 调试脚本：诊断 InfinityFree 环境下的 Authorization 头问题
 * 
 * 使用方法：
 * 1. 在浏览器中访问 https://newamethyst.ct.ws/api/debug.php?access_token=test_token
 * 2. 或者使用 curl 命令：curl -H "Authorization: Bearer test_token" https://newamethyst.ct.ws/api/debug.php
 * 
 * 该脚本会输出：
 * - PHP 版本和运行环境（CGI / FastCGI / mod_php / PHP-FPM）
 * - $_SERVER 变量中所有与 Authorization 相关的键
 * - getallheaders() 函数的输出（如果可用）
 * - apache_request_headers() 函数的输出（如果可用）
 * - getenv('HTTP_AUTHORIZATION') 的输出
 * - $_COOKIE 变量中所有与 token 相关的键
 * - $_GET 和 $_POST 变量中所有与 token 相关的键
 */

// 设置错误报告（用于调试）
error_reporting(E_ALL);
ini_set('display_errors', '1');

// 设置 JSON 响应头
header('Content-Type: application/json; charset=utf-8');

// 引入 config.php（用于测试 extract_bearer_token() 函数）
// 注意：config.php 中会调用 session_start() 和 rate_limit() 等函数，可能会影响调试结果
// 所以我们只引入 extract_bearer_token() 函数，而不引入其他函数
// 但为了简化，我们直接引入 config.php
try {
    require_once __DIR__ . '/config.php';
} catch (Exception $e) {
    // 忽略错误
}

// 收集所有 Authorization 头相关的信息
$auth_info = [
    'php_version' => PHP_VERSION,
    'sapi_name' => php_sapi_name(),
    'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
    'request_method' => $_SERVER['REQUEST_METHOD'] ?? 'unknown',
    'request_uri' => $_SERVER['REQUEST_URI'] ?? 'unknown',
    'https' => $_SERVER['HTTPS'] ?? 'off',
    'remote_addr' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
    'http_host' => $_SERVER['HTTP_HOST'] ?? 'unknown',
];

// 1. $_SERVER 变量中所有与 Authorization 相关的键
$auth_related_keys = [];
foreach ($_SERVER as $key => $value) {
    if (stripos($key, 'auth') !== false || stripos($key, 'token') !== false) {
        $auth_related_keys[$key] = $value;
    }
}
$auth_info['server_auth_keys'] = $auth_related_keys;

// 2. getenv('HTTP_AUTHORIZATION') 的输出
$auth_info['getenv_http_authorization'] = getenv('HTTP_AUTHORIZATION') ?: null;

// 3. getallheaders() 函数的输出（如果可用）
if (function_exists('getallheaders')) {
    $all_headers = @getallheaders();
    $auth_info['getallheaders'] = is_array($all_headers) ? $all_headers : 'not array';
} else {
    $auth_info['getallheaders'] = 'function not exists';
}

// 4. apache_request_headers() 函数的输出（如果可用）
if (function_exists('apache_request_headers')) {
    $apache_headers = @apache_request_headers();
    $auth_info['apache_request_headers'] = is_array($apache_headers) ? $apache_headers : 'not array';
} else {
    $auth_info['apache_request_headers'] = 'function not exists';
}

// 5. $_COOKIE 变量中所有与 token 相关的键
$cookie_token_keys = [];
foreach ($_COOKIE as $key => $value) {
    if (stripos($key, 'token') !== false || stripos($key, 'auth') !== false) {
        $cookie_token_keys[$key] = substr($value, 0, 20) . '...(truncated)';
    }
}
$auth_info['cookie_token_keys'] = $cookie_token_keys;

// 6. $_GET 和 $_POST 变量中所有与 token 相关的键
$auth_info['get_token_keys'] = [];
foreach ($_GET as $key => $value) {
    if (stripos($key, 'token') !== false || stripos($key, 'auth') !== false) {
        $auth_info['get_token_keys'][$key] = substr($value, 0, 20) . '...(truncated)';
    }
}
$auth_info['post_token_keys'] = [];
foreach ($_POST as $key => $value) {
    if (stripos($key, 'token') !== false || stripos($key, 'auth') !== false) {
        $auth_info['post_token_keys'][$key] = substr($value, 0, 20) . '...(truncated)';
    }
}

// 7. 所有 $_SERVER 变量（用于调试）
$auth_info['all_server_keys'] = array_keys($_SERVER);

// 8. 所有 $_ENV 变量（用于调试）
$auth_info['all_env_keys'] = array_keys($_ENV);

// 9. 所有请求头（通过多种方式获取）
$all_request_headers = [];
if (function_exists('getallheaders')) {
    $all_request_headers = array_merge($all_request_headers, @getallheaders() ?: []);
}
if (function_exists('apache_request_headers')) {
    $all_request_headers = array_merge($all_request_headers, @apache_request_headers() ?: []);
}
foreach ($_SERVER as $key => $value) {
    if (strpos($key, 'HTTP_') === 0) {
        $header_name = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($key, 5))))));
        $all_request_headers[$header_name] = $value;
    }
}
$auth_info['all_request_headers'] = $all_request_headers;

// 10. 测试 extract_bearer_token() 函数是否可用
if (function_exists('extract_bearer_token')) {
    $auth_info['extract_bearer_token_result'] = extract_bearer_token() ?: 'null';
} else {
    $auth_info['extract_bearer_token_result'] = 'function not exists';
}

// 输出 JSON 响应
echo json_encode($auth_info, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
