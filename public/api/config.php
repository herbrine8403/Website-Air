<?php
// MySQL 数据库连接配置
// InfinityFree 数据库凭据从环境变量读取，回退到硬编码（部署后修改）
define('DB_HOST', getenv('DB_HOST') ?: 'sql301.infinityfree.com');
define('DB_NAME', getenv('DB_NAME') ?: 'REMOVED_DB_NAME');
define('DB_USER', getenv('DB_USER') ?: 'REMOVED_DB_USER');
define('DB_PASS', getenv('DB_PASS') ?: 'REMOVED_DB_PASS');

// 公告系统基础 URL（用于设备型号映射等）
define('BASE_URL', 'https://newamethyst.ct.ws');

// CORS 头
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, User-Agent');
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
