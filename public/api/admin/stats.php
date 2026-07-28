<?php
require_once __DIR__ . '/../config.php';

// 仅允许 GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

$admin_id = require_admin();
$db = getDBConnection();

$stats = [
    'users' => ['total' => 0, 'active' => 0, 'admins' => 0, 'new_today' => 0],
    'resources' => ['total' => 0, 'published' => 0, 'pending' => 0, 'draft' => 0, 'removed' => 0, 'total_downloads' => 0],
    'forum' => ['topics' => 0, 'articles' => 0, 'questions' => 0, 'answers' => 0, 'replies' => 0, 'solved' => 0],
    'system' => ['announcements' => 0, 'audit_logs_24h' => 0],
];

// 用户统计
$stmt = $db->prepare('SELECT COUNT(*) AS cnt, SUM(status = "active") AS active_cnt, SUM(is_admin = 1) AS admin_cnt, SUM(DATE(created_at) = CURDATE()) AS today_cnt FROM users');
$stmt->execute();
$res = $stmt->get_result();
if ($row = $res->fetch_assoc()) {
    $stats['users']['total'] = (int)$row['cnt'];
    $stats['users']['active'] = (int)$row['active_cnt'];
    $stats['users']['admins'] = (int)$row['admin_cnt'];
    $stats['users']['new_today'] = (int)$row['today_cnt'];
}
$stmt->close();

// 资源统计
$stmt = $db->prepare('SELECT COUNT(*) AS cnt, SUM(status = "published") AS pub, SUM(status = "pending") AS pend, SUM(status = "draft") AS draft, SUM(status = "removed") AS removed, COALESCE(SUM(downloads_count), 0) AS dls FROM resources');
$stmt->execute();
$res = $stmt->get_result();
if ($row = $res->fetch_assoc()) {
    $stats['resources']['total'] = (int)$row['cnt'];
    $stats['resources']['published'] = (int)$row['pub'];
    $stats['resources']['pending'] = (int)$row['pend'];
    $stats['resources']['draft'] = (int)$row['draft'];
    $stats['resources']['removed'] = (int)$row['removed'];
    $stats['resources']['total_downloads'] = (int)$row['dls'];
}
$stmt->close();

// 论坛统计
$tables = [
    'topics' => 'forum_topics',
    'articles' => 'forum_articles',
    'questions' => 'forum_questions',
    'answers' => 'forum_answers',
    'replies' => 'forum_replies',
];
foreach ($tables as $key => $table) {
    $stmt = $db->prepare("SELECT COUNT(*) AS cnt FROM $table");
    $stmt->execute();
    $res = $stmt->get_result();
    if ($row = $res->fetch_assoc()) {
        $stats['forum'][$key] = (int)$row['cnt'];
    }
    $stmt->close();
}

$stmt = $db->prepare('SELECT COUNT(*) AS cnt FROM forum_questions WHERE has_accepted = 1');
$stmt->execute();
$res = $stmt->get_result();
if ($row = $res->fetch_assoc()) {
    $stats['forum']['solved'] = (int)$row['cnt'];
}
$stmt->close();

// 系统：审计日志 24h
$stmt = $db->prepare('SELECT COUNT(*) AS cnt FROM admin_audit_logs WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)');
$stmt->execute();
$res = $stmt->get_result();
if ($row = $res->fetch_assoc()) {
    $stats['system']['audit_logs_24h'] = (int)$row['cnt'];
}
$stmt->close();

// 公告条数（如果存在公告表，否则返回 0；这里使用 announcements JSON 接口的本地缓存计数）
$announcements_count = 0;
$cache_file = __DIR__ . '/../../api_cache/announcements_cache.plist';
if (is_file($cache_file)) {
    $content = @file_get_contents($cache_file);
    if ($content !== false) {
        $data = json_decode($content, true);
        if (is_array($data) && isset($data['announcements']) && is_array($data['announcements'])) {
            $announcements_count = count($data['announcements']);
        }
    }
}
$stats['system']['announcements'] = $announcements_count;

// 最近 7 天用户注册趋势
$trend = [];
$stmt = $db->prepare('SELECT DATE(created_at) AS d, COUNT(*) AS cnt FROM users WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) GROUP BY DATE(created_at) ORDER BY d ASC');
$stmt->execute();
$res = $stmt->get_result();
while ($row = $res->fetch_assoc()) {
    $trend[] = ['date' => $row['d'], 'count' => (int)$row['cnt']];
}
$stmt->close();

// 最近 5 条审计日志
$recent_logs = [];
$stmt = $db->prepare('SELECT al.id, al.admin_id, al.action, al.target_type, al.target_id, al.detail, al.ip, al.created_at, u.username AS admin_username FROM admin_audit_logs al LEFT JOIN users u ON u.id = al.admin_id ORDER BY al.created_at DESC LIMIT 5');
$stmt->execute();
$res = $stmt->get_result();
while ($row = $res->fetch_assoc()) {
    $recent_logs[] = [
        'id' => (string)$row['id'],
        'admin_id' => (string)$row['admin_id'],
        'admin_username' => $row['admin_username'],
        'action' => $row['action'],
        'target_type' => $row['target_type'],
        'target_id' => $row['target_id'] ? (string)$row['target_id'] : null,
        'detail' => $row['detail'],
        'ip' => $row['ip'],
        'created_at' => $row['created_at'],
    ];
}
$stmt->close();

json_response([
    'success' => true,
    'stats' => $stats,
    'user_trend_7d' => $trend,
    'recent_audit_logs' => $recent_logs,
]);
