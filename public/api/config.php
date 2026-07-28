<?php
// MySQL 数据库连接配置
// InfinityFree 数据库凭据从环境变量读取，回退到硬编码（部署后修改）
define('DB_HOST', getenv('DB_HOST') ?: 'sql301.infinityfree.com');
define('DB_NAME', getenv('DB_NAME') ?: 'REMOVED_DB_NAME');
define('DB_USER', getenv('DB_USER') ?: 'REMOVED_DB_USER');
define('DB_PASS', getenv('DB_PASS') ?: 'REMOVED_DB_PASS');

// 公告系统基础 URL（用于设备型号映射等）
define('BASE_URL', 'https://newamethyst.ct.ws');

// JWT 配置
define('JWT_SECRET', getenv('JWT_SECRET') ?: 'air_default_jwt_secret_change_in_production_please_32chars');
define('JWT_ACCESS_TTL', 7200);   // 2 小时
define('JWT_REFRESH_TTL', 2592000); // 30 天
define('JWT_ALG', 'HS256');

// GitHub OAuth
define('GITHUB_CLIENT_ID', 'Ov23ctExKxAIGEjm97mv');
define('GITHUB_CLIENT_SECRET', getenv('GITHUB_CLIENT_SECRET') ?: '');
define('GITHUB_REDIRECT_URI', 'https://newamethyst.ct.ws/api/auth/github-callback.php');

// CORS 配置：基于白名单的 Origin 校验
$cors_allowed_origins = [
    'https://newamethyst.ct.ws',
    'http://localhost:5173',
    'http://localhost:4173',
    'http://127.0.0.1:5173',
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin && in_array($origin, $cors_allowed_origins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Credentials: true');
}
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, User-Agent, Authorization');
header('Content-Type: application/json; charset=utf-8');

// 处理 OPTIONS 预检请求
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// 数据库连接函数
function getDBConnection() {
    static $conn = null;
    if ($conn === null) {
        $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        if ($conn->connect_error) {
            http_response_code(500);
            echo json_encode(['error' => 'Database connection failed']);
            exit;
        }
        $conn->set_charset('utf8mb4');
    }
    return $conn;
}

// 设备型号映射到人类可读名称
function deviceModelToLabel($model) {
    $mapping = [
        'iPhone16,2' => 'iPhone 15 Pro Max',
        'iPhone16,1' => 'iPhone 15 Pro',
        'iPhone15,2' => 'iPhone 14 Pro Max',
        'iPhone15,3' => 'iPhone 14 Pro',
        'iPhone14,7' => 'iPhone 14',
        'iPhone14,8' => 'iPhone 14 Plus',
        'iPhone13,4' => 'iPhone 13 Pro Max',
        'iPhone13,3' => 'iPhone 13 Pro',
        'iPhone13,2' => 'iPhone 13',
        'iPhone13,1' => 'iPhone 13 mini',
        'iPhone12,8' => 'iPhone 12 mini',
        'iPhone12,1' => 'iPhone 12',
        'iPhone12,3' => 'iPhone 12 Pro',
        'iPhone12,5' => 'iPhone 12 Pro Max',
        'iPhone11,8' => 'iPhone XR',
        'iPhone11,2' => 'iPhone XS',
        'iPhone11,4' => 'iPhone XS Max',
        'iPhone11,6' => 'iPhone XS Max',
        'iPhone10,6' => 'iPhone X',
        'iPhone10,3' => 'iPhone X',
        'iPhone10,1' => 'iPhone 8',
        'iPhone10,4' => 'iPhone 8',
        'iPhone10,2' => 'iPhone 8 Plus',
        'iPhone10,5' => 'iPhone 8 Plus',
        'iPad13,1' => 'iPad Air (4th gen)',
        'iPad13,2' => 'iPad Air (4th gen)',
        'iPad13,4' => 'iPad Pro 11" (3rd gen)',
        'iPad13,8' => 'iPad Pro 12.9" (5th gen)',
        'iPad14,1' => 'iPad (10th gen)',
        'iPad14,2' => 'iPad (10th gen)',
    ];
    return $mapping[$model] ?? $model;
}

// ============================================================
// 辅助函数
// ============================================================

/**
 * 输出 JSON 响应并退出
 */
function json_response($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * 获取 PUT/POST 请求的 JSON body
 */
function get_input_json() {
    $raw = file_get_contents('php://input');
    if (empty($raw)) {
        return [];
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        return [];
    }
    return $data;
}

/**
 * base64url 编码
 */
function base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

/**
 * base64url 解码
 */
function base64url_decode($str) {
    $pad = strlen($str) % 4;
    if ($pad) {
        $str .= str_repeat('=', 4 - $pad);
    }
    return base64_decode(strtr($str, '-_', '+/'));
}

/**
 * HS256 JWT 编码（手写，不依赖 composer）
 * header: {"alg":"HS256","typ":"JWT"}
 * payload: 传入数组 + iat + exp（若未提供 exp 则使用 JWT_ACCESS_TTL）
 */
function jwt_encode($payload) {
    $header = ['alg' => JWT_ALG, 'typ' => 'JWT'];
    $headerB64 = base64url_encode(json_encode($header, JSON_UNESCAPED_UNICODE));
    $payload['iat'] = time();
    if (!isset($payload['exp'])) {
        $payload['exp'] = time() + JWT_ACCESS_TTL;
    }
    $payloadB64 = base64url_encode(json_encode($payload, JSON_UNESCAPED_UNICODE));
    $signature = hash_hmac('sha256', "$headerB64.$payloadB64", JWT_SECRET, true);
    $signatureB64 = base64url_encode($signature);
    return "$headerB64.$payloadB64.$signatureB64";
}

/**
 * HS256 JWT 解码
 * 返回 payload 数组或 null
 */
function jwt_decode($token) {
    if (!$token || !is_string($token)) {
        return null;
    }
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return null;
    }
    list($headerB64, $payloadB64, $signatureB64) = $parts;
    $expectedSignature = base64url_encode(hash_hmac('sha256', "$headerB64.$payloadB64", JWT_SECRET, true));
    if (!hash_equals($expectedSignature, $signatureB64)) {
        return null;
    }
    $payload = json_decode(base64url_decode($payloadB64), true);
    if (!is_array($payload)) {
        return null;
    }
    if (isset($payload['exp']) && $payload['exp'] < time()) {
        return null;
    }
    return $payload;
}

/**
 * 从 Authorization 头提取 Bearer token
 * 返回 token 字符串或 null
 */
function extract_bearer_token() {
    $authHeader = null;
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    } elseif (getenv('HTTP_AUTHORIZATION')) {
        $authHeader = getenv('HTTP_AUTHORIZATION');
    } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    }
    if (!$authHeader) {
        return null;
    }
    if (preg_match('/Bearer\s+(.+)/i', $authHeader, $matches)) {
        return trim($matches[1]);
    }
    return null;
}

/**
 * 校验 Authorization 头中的 Bearer token
 * 成功返回 user_id，失败发送 401 退出
 */
function require_auth() {
    $token = extract_bearer_token();
    if (!$token) {
        json_response(['error' => '未授权：缺少 Authorization 头'], 401);
    }
    $payload = jwt_decode($token);
    if (!$payload || !isset($payload['sub'])) {
        json_response(['error' => '未授权：token 无效或已过期'], 401);
    }
    return (int)$payload['sub'];
}

/**
 * 同 require_auth 但失败返回 null 而非退出
 */
function get_current_user_id() {
    $token = extract_bearer_token();
    if (!$token) {
        return null;
    }
    $payload = jwt_decode($token);
    if (!$payload || !isset($payload['sub'])) {
        return null;
    }
    return (int)$payload['sub'];
}

/**
 * 简易限流
 * 使用数据库表 rate_limits 记录
 * 如果当前窗口内 count >= max，发送 429 退出
 * 否则 count++ 返回 true
 */
function rate_limit($key, $max, $window_seconds) {
    $conn = getDBConnection();
    // 确保表存在
    $conn->query("CREATE TABLE IF NOT EXISTS rate_limits (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        rate_key VARCHAR(128) NOT NULL,
        ip VARCHAR(64),
        count INT DEFAULT 1,
        window_start DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_key_ip (rate_key, ip),
        INDEX idx_window (window_start)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $windowStart = date('Y-m-d H:i:s', time() - $window_seconds);

    // 清理过期记录
    $stmt = $conn->prepare("DELETE FROM rate_limits WHERE window_start < ? AND rate_key = ?");
    $stmt->bind_param('ss', $windowStart, $key);
    $stmt->execute();
    $stmt->close();

    // 查找当前窗口内的记录
    $stmt = $conn->prepare("SELECT id, count, window_start FROM rate_limits WHERE rate_key = ? AND ip = ? AND window_start >= ? FOR UPDATE");
    $stmt->bind_param('sss', $key, $ip, $windowStart);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    $stmt->close();

    if ($row) {
        if ((int)$row['count'] >= $max) {
            json_response(['error' => '请求过于频繁，请稍后再试'], 429);
        }
        $newCount = (int)$row['count'] + 1;
        $stmt = $conn->prepare("UPDATE rate_limits SET count = ? WHERE id = ?");
        $stmt->bind_param('ii', $newCount, $row['id']);
        $stmt->execute();
        $stmt->close();
    } else {
        $stmt = $conn->prepare("INSERT INTO rate_limits (rate_key, ip, count, window_start) VALUES (?, ?, 1, NOW())");
        $stmt->bind_param('ss', $key, $ip);
        $stmt->execute();
        $stmt->close();
    }
    return true;
}

/**
 * 从 $_GET 获取分页参数
 * 默认 page=1 size=20，最大 size=100
 */
function get_pagination_params() {
    $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
    $size = isset($_GET['size']) ? (int)$_GET['size'] : 20;
    if ($size < 1) {
        $size = 20;
    }
    if ($size > 100) {
        $size = 100;
    }
    return ['page' => $page, 'size' => $size, 'offset' => ($page - 1) * $size];
}

/**
 * 生成 URL slug
 * 转小写、空格转 -、移除特殊字符
 */
function slugify($text) {
    $text = preg_replace('~[^\pL\d]+~u', '-', $text);
    $text = trim($text, '-');
    $text = mb_strtolower($text);
    $text = preg_replace('~[^-\w]+~', '', $text);
    if (empty($text)) {
        return 'n-a-' . substr(md5(uniqid('', true)), 0, 8);
    }
    return $text;
}

/**
 * 生成随机 token
 */
function generate_random_token($length = 32) {
    if ($length <= 0) {
        return '';
    }
    $bytes = random_bytes((int)ceil($length / 2));
    return substr(bin2hex($bytes), 0, $length);
}

// ============================================================
// 管理员相关辅助函数
// ============================================================

// 管理员邮箱白名单（无需 GitHub 校验即视为管理员）
define('ADMIN_EMAIL_WHITELIST', ['weishixvn@outlook.com']);

// 管理员判定所需的 GitHub 仓库
define('ADMIN_GITHUB_REPO_OWNER', 'herbrine8403');
define('ADMIN_GITHUB_REPO_NAME', 'Amethyst-iOS-MyRemastered');

/**
 * 判定邮箱是否在管理员白名单
 */
function is_admin_email($email) {
    if (!$email) return false;
    return in_array(strtolower(trim($email)), ADMIN_EMAIL_WHITELIST, true);
}

/**
 * 调用 GitHub API 检查用户对仓库的权限级别
 * 返回 'admin' / 'write' / 'read' / 'none' / null（失败）
 */
function check_github_repo_permission($github_access_token, $github_username) {
    if (!$github_access_token || !$github_username) {
        return null;
    }
    $url = sprintf(
        'https://api.github.com/repos/%s/%s/collaborators/%s/permission',
        ADMIN_GITHUB_REPO_OWNER,
        ADMIN_GITHUB_REPO_NAME,
        rawurlencode($github_username)
    );
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $github_access_token,
        'Accept: application/vnd.github+json',
        'User-Agent: Air-Website',
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $resp = curl_exec($ch);
    $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($http !== 200 || !$resp) {
        return null;
    }
    $data = json_decode($resp, true);
    if (!is_array($data) || !isset($data['permission'])) {
        return null;
    }
    return $data['permission']; // admin | write | read | none
}

/**
 * 综合判定当前用户是否为管理员（基于邮箱或 GitHub 仓库权限）
 * 当传入 GitHub access_token 时，会调用 GitHub API；否则只校验邮箱
 * 返回 bool
 */
function determine_is_admin($db, $email, $github_access_token = null, $github_username = null) {
    if (is_admin_email($email)) {
        return true;
    }
    if ($github_access_token && $github_username) {
        $perm = check_github_repo_permission($github_access_token, $github_username);
        if ($perm === 'admin' || $perm === 'write') {
            return true;
        }
    }
    return false;
}

/**
 * 同步用户的 is_admin 字段
 * 返回新值
 */
function sync_user_admin_flag($db, $user_id, $is_admin) {
    $flag = $is_admin ? 1 : 0;
    $stmt = $db->prepare('UPDATE users SET is_admin = ? WHERE id = ?');
    $stmt->bind_param('ii', $flag, $user_id);
    $stmt->execute();
    $stmt->close();
    return $flag;
}

/**
 * 校验当前登录用户是否为管理员
 * 失败发送 403 退出；成功返回 user_id
 */
function require_admin() {
    $user_id = require_auth();
    $db = getDBConnection();
    $stmt = $db->prepare('SELECT is_admin FROM users WHERE id = ? LIMIT 1');
    $stmt->bind_param('i', $user_id);
    $stmt->execute();
    $res = $stmt->get_result();
    $row = $res->fetch_assoc();
    $stmt->close();
    if (!$row || !$row['is_admin']) {
        json_response(['success' => false, 'error' => '需要管理员权限', 'code' => 'forbidden'], 403);
    }
    return $user_id;
}

/**
 * 记录管理员操作到审计日志
 */
function log_admin_action($db, $admin_id, $action, $target_type = null, $target_id = null, $detail = null) {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
    $stmt = $db->prepare('INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, detail, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)');
    // 使用 s 传 null 给 BIGINT 列也可正常写入
    $stmt->bind_param('issssss', $admin_id, $action, $target_type, $target_id, $detail, $ip, $ua);
    $stmt->execute();
    $stmt->close();
}
