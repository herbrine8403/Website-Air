<?php
require_once __DIR__ . '/../config.php';

$method = $_SERVER['REQUEST_METHOD'];
if (!in_array($method, ['GET', 'POST'], true)) {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

$admin_id = require_admin();
$db = getDBConnection();

// 公告系统当前采用 PHP 静态数组实现（public/api/announcements.php），
// 这里通过内部拉取该端点的输出展示给管理员，并支持刷新缓存。
$cache_file = __DIR__ . '/../../api_cache/announcements_cache.plist';
$cache_dir = dirname($cache_file);
if (!is_dir($cache_dir)) {
    @mkdir($cache_dir, 0755, true);
}

if ($method === 'GET') {
    // 优先读取本地缓存（30 分钟内有效）
    $use_cache = false;
    $data = null;
    if (is_file($cache_file)) {
        $mtime = filemtime($cache_file);
        if ($mtime && (time() - $mtime) < 1800) {
            $content = @file_get_contents($cache_file);
            if ($content !== false) {
                $decoded = json_decode($content, true);
                if (is_array($decoded)) {
                    $data = $decoded;
                    $use_cache = true;
                }
            }
        }
    }

    // 缓存失效则调用本地端点
    if (!$data) {
        $url = BASE_URL . '/api/announcements.php';
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['User-Agent: Air-Admin']);
        $resp = curl_exec($ch);
        $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($http === 200 && $resp) {
            $decoded = json_decode($resp, true);
            if (is_array($decoded)) {
                $data = $decoded;
                @file_put_contents($cache_file, json_encode($data, JSON_UNESCAPED_UNICODE));
            }
        }
    }

    if (!$data) {
        $data = ['announcements' => [], 'last_updated' => null];
    }

    $announcements = $data['announcements'] ?? [];
    foreach ($announcements as &$a) {
        if (!isset($a['id'])) $a['id'] = '';
        if (!isset($a['title'])) $a['title'] = '';
        if (!isset($a['date'])) $a['date'] = '';
        if (!isset($a['summary'])) $a['summary'] = '';
        if (!isset($a['priority'])) $a['priority'] = 'normal';
        if (!isset($a['action_url'])) $a['action_url'] = '';
        if (!isset($a['action_title'])) $a['action_title'] = '';
        if (!isset($a['image_url'])) $a['image_url'] = '';
    }
    unset($a);

    json_response([
        'success' => true,
        'announcements' => $announcements,
        'last_updated' => $data['last_updated'] ?? null,
        'source' => $use_cache ? 'cache' : 'live',
        'note' => '当前公告系统采用 PHP 静态数组实现（announcements.php），如需修改内容请编辑该文件后推送代码。',
    ]);
}

// POST：刷新缓存
$input = get_input_json();
$action = $input['action'] ?? '';
if ($action === 'refresh_cache') {
    if (is_file($cache_file)) {
        @unlink($cache_file);
    }
    log_admin_action($db, $admin_id, 'refresh_announcement_cache', 'announcement', null, '刷新公告缓存');
    json_response(['success' => true, 'message' => '公告缓存已刷新']);
}

json_response(['success' => false, 'error' => '未知 action'], 400);
