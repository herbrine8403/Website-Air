<?php
// 简单的 PHP 测试脚本
header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'status' => 'ok',
    'message' => 'PHP is working correctly',
    'timestamp' => date('Y-m-d H:i:s'),
    'php_version' => PHP_VERSION,
    'sapi' => php_sapi_name(),
], JSON_PRETTY_PRINT);
