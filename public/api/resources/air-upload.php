<?php
// Air 官网对象存储上传 API - 占位
// 对象存储尚未配置，返回 503
// TODO: 对象存储配置后启用
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

require_auth();

json_response(['success' => false, 'error' => '对象存储尚未配置'], 503);
