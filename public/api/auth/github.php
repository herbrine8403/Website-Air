<?php
require_once __DIR__ . '/../config.php';

// 仅允许 GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

// 开启 session
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// 生成随机 state（32 字符）
$state = generate_random_token(32);
$_SESSION['oauth_state'] = $state;

// 构建 GitHub OAuth 授权 URL
$params = http_build_query([
    'client_id' => GITHUB_CLIENT_ID,
    'scope' => 'user:email',
    'redirect_uri' => GITHUB_REDIRECT_URI,
    'state' => $state,
]);
$authorize_url = 'https://github.com/login/oauth/authorize?' . $params;

// 移除 JSON Content-Type，发送 302 跳转
header_remove('Content-Type');
header('Location: ' . $authorize_url, true, 302);
exit;
