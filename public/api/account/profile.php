<?php
require_once __DIR__ . '/../config.php';

// 仅允许 GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

// 公开访问，不需要 require_auth
$db = getDBConnection();

// 接收 ?username=xxx 或 ?id=xxx
$username = isset($_GET['username']) ? trim($_GET['username']) : '';
$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($username !== '') {
    $stmt = $db->prepare('SELECT id, username, avatar_url, bio, github_username, bilibili_username, created_at FROM users WHERE username = ? AND status = "active" LIMIT 1');
    $stmt->bind_param('s', $username);
} elseif ($id > 0) {
    $stmt = $db->prepare('SELECT id, username, avatar_url, bio, github_username, bilibili_username, created_at FROM users WHERE id = ? AND status = "active" LIMIT 1');
    $stmt->bind_param('i', $id);
} else {
    json_response(['success' => false, 'error' => '需要 username 或 id 参数'], 400);
}

$stmt->execute();
$res = $stmt->get_result();
$user = $res->fetch_assoc();
$stmt->close();

if (!$user) {
    json_response(['success' => false, 'error' => '用户不存在', 'code' => 'user_not_found'], 404);
}

$safe_user = [
    'id' => (string)$user['id'],
    'username' => $user['username'],
    'avatar_url' => $user['avatar_url'],
    'bio' => $user['bio'],
    'github_username' => $user['github_username'],
    'bilibili_username' => $user['bilibili_username'],
    'created_at' => $user['created_at'],
];

$target_user_id = (int)$user['id'];

// 统计数据
$stats = [
    'resources_count' => 0,
    'total_downloads' => 0,
    'forum_posts_count' => 0,
    'total_likes' => 0,
];

// resources_count
$stmt = $db->prepare('SELECT COUNT(*) AS cnt FROM resources WHERE user_id = ? AND status = "published"');
$stmt->bind_param('i', $target_user_id);
$stmt->execute();
$res = $stmt->get_result();
if ($row = $res->fetch_assoc()) {
    $stats['resources_count'] = (int)$row['cnt'];
}
$stmt->close();

// total_downloads
$stmt = $db->prepare('SELECT COALESCE(SUM(downloads_count), 0) AS total FROM resources WHERE user_id = ? AND status = "published"');
$stmt->bind_param('i', $target_user_id);
$stmt->execute();
$res = $stmt->get_result();
if ($row = $res->fetch_assoc()) {
    $stats['total_downloads'] = (int)$row['total'];
}
$stmt->close();

// forum_posts_count
$forum_count = 0;
foreach (['forum_topics', 'forum_articles', 'forum_questions'] as $table) {
    $stmt = $db->prepare("SELECT COUNT(*) AS cnt FROM $table WHERE user_id = ? AND status = 'published'");
    $stmt->bind_param('i', $target_user_id);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($row = $res->fetch_assoc()) {
        $forum_count += (int)$row['cnt'];
    }
    $stmt->close();
}
$stats['forum_posts_count'] = $forum_count;

// total_likes: 用户在论坛上收到的点赞（forum_replies + forum_answers 的 votes_up 之和）
$reply_likes = 0;
$stmt = $db->prepare('SELECT COALESCE(SUM(votes_up), 0) AS total FROM forum_replies WHERE user_id = ?');
$stmt->bind_param('i', $target_user_id);
$stmt->execute();
$res = $stmt->get_result();
if ($row = $res->fetch_assoc()) {
    $reply_likes = (int)$row['total'];
}
$stmt->close();

$answer_likes = 0;
$stmt = $db->prepare('SELECT COALESCE(SUM(votes_up), 0) AS total FROM forum_answers WHERE user_id = ?');
$stmt->bind_param('i', $target_user_id);
$stmt->execute();
$res = $stmt->get_result();
if ($row = $res->fetch_assoc()) {
    $answer_likes = (int)$row['total'];
}
$stmt->close();

$stats['total_likes'] = $reply_likes + $answer_likes;

// 最近资源（前 6 个）
$recent_resources = [];
$stmt = $db->prepare('SELECT id, slug, title, summary, type, cover_image, downloads_count, created_at FROM resources WHERE user_id = ? AND status = "published" ORDER BY created_at DESC LIMIT 6');
$stmt->bind_param('i', $target_user_id);
$stmt->execute();
$res = $stmt->get_result();
while ($row = $res->fetch_assoc()) {
    $recent_resources[] = [
        'id' => (string)$row['id'],
        'slug' => $row['slug'],
        'title' => $row['title'],
        'summary' => $row['summary'],
        'type' => $row['type'],
        'cover_image' => $row['cover_image'],
        'downloads_count' => (int)$row['downloads_count'],
        'created_at' => $row['created_at'],
    ];
}
$stmt->close();

json_response([
    'success' => true,
    'user' => $safe_user,
    'stats' => $stats,
    'recent_resources' => $recent_resources,
]);
