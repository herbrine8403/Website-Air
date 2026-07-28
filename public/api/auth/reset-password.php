<?php
require_once __DIR__ . '/../config.php';

// 仅允许 POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

// 接收 { email } 但不处理
$input = get_input_json();
$email = trim($input['email'] ?? '');

json_response(['success' => true, 'message' => '邮件服务暂未开通，请联系管理员重置密码']);
