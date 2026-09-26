<?php
require_once __DIR__ . '/../config.php';

// 仅允许 GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

$user_id = require_auth();

$db = getDBConnection();

// 查询当前用户完整信息（同 me.php，不返回 password_hash）
$stmt = $db->prepare('SELECT id, username, email, password_enabled, github_id, github_username, bilibili_username, avatar_url, bio, email_verified, role, status, created_at, last_login_at FROM users WHERE id = ? LIMIT 1');
$stmt->bind_param('i', $user_id);
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
    'email' => $user['email'],
    'password_enabled' => (bool)$user['password_enabled'],
    'github_id' => $user['github_id'] ? (string)$user['github_id'] : null,
    'github_username' => $user['github_username'],
    'bilibili_username' => $user['bilibili_username'],
    'avatar_url' => $user['avatar_url'],
    'bio' => $user['bio'],
    'email_verified' => (bool)$user['email_verified'],
    'role' => $user['role'],
    'status' => $user['status'],
    'created_at' => $user['created_at'],
    'last_login_at' => $user['last_login_at'],
];

// 统计数据
$stats = [
    'resources_count' => 0,
    'total_downloads' => 0,
    'forum_posts_count' => 0,
    'total_likes' => 0,
];

// resources_count
$stmt = $db->prepare('SELECT COUNT(*) AS cnt FROM resources WHERE user_id = ?');
$stmt->bind_param('i', $user_id);
$stmt->execute();
$res = $stmt->get_result();
if ($row = $res->fetch_assoc()) {
    $stats['resources_count'] = (int)$row['cnt'];
}
$stmt->close();

// total_downloads
$stmt = $db->prepare('SELECT COALESCE(SUM(downloads_count), 0) AS total FROM resources WHERE user_id = ?');
$stmt->bind_param('i', $user_id);
$stmt->execute();
$res = $stmt->get_result();
if ($row = $res->fetch_assoc()) {
    $stats['total_downloads'] = (int)$row['total'];
}
$stmt->close();

// forum_posts_count: topics + articles + questions（仅已发布）
$forum_count = 0;
foreach (['forum_topics', 'forum_articles', 'forum_questions'] as $table) {
    $stmt = $db->prepare("SELECT COUNT(*) AS cnt FROM $table WHERE user_id = ? AND status = 'published'");
    $stmt->bind_param('i', $user_id);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($row = $res->fetch_assoc()) {
        $forum_count += (int)$row['cnt'];
    }
    $stmt->close();
}
$stats['forum_posts_count'] = $forum_count;

// 各类型帖子数
$stats['topics_count'] = 0;
$stats['articles_count'] = 0;
$stats['questions_count'] = 0;

foreach (['forum_topics' => 'topics_count', 'forum_articles' => 'articles_count', 'forum_questions' => 'questions_count'] as $table => $key) {
    $stmt = $db->prepare("SELECT COUNT(*) AS cnt FROM $table WHERE user_id = ? AND status = 'published'");
    $stmt->bind_param('i', $user_id);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($row = $res->fetch_assoc()) {
        $stats[$key] = (int)$row['cnt'];
    }
    $stmt->close();
}

// total_likes: 用户在论坛上收到的点赞（forum_replies + forum_answers 的 votes_up 之和）
$reply_likes = 0;
$stmt = $db->prepare('SELECT COALESCE(SUM(votes_up), 0) AS total FROM forum_replies WHERE user_id = ?');
$stmt->bind_param('i', $user_id);
$stmt->execute();
$res = $stmt->get_result();
if ($row = $res->fetch_assoc()) {
    $reply_likes = (int)$row['total'];
}
$stmt->close();

$answer_likes = 0;
$stmt = $db->prepare('SELECT COALESCE(SUM(votes_up), 0) AS total FROM forum_answers WHERE user_id = ?');
$stmt->bind_param('i', $user_id);
$stmt->execute();
$res = $stmt->get_result();
if ($row = $res->fetch_assoc()) {
    $answer_likes = (int)$row['total'];
}
$stmt->close();

$stats['total_likes'] = $reply_likes + $answer_likes;

// recent_activities: 最近 10 条活动（资源上传/发帖/回复/回答等，按 created_at 倒序）
$activities = [];
$sql = '(SELECT "resource" AS activity_type, id, title AS display_text, created_at FROM resources WHERE user_id = ? AND status = "published")'
    . ' UNION ALL'
    . ' (SELECT "topic" AS activity_type, id, title AS display_text, created_at FROM forum_topics WHERE user_id = ? AND status = "published")'
    . ' UNION ALL'
    . ' (SELECT "article" AS activity_type, id, title AS display_text, created_at FROM forum_articles WHERE user_id = ? AND status = "published")'
    . ' UNION ALL'
    . ' (SELECT "question" AS activity_type, id, title AS display_text, created_at FROM forum_questions WHERE user_id = ? AND status = "published")'
    . ' UNION ALL'
    . ' (SELECT "reply" AS activity_type, id, content AS display_text, created_at FROM forum_replies WHERE user_id = ?)'
    . ' UNION ALL'
    . ' (SELECT "answer" AS activity_type, id, content AS display_text, created_at FROM forum_answers WHERE user_id = ?)'
    . ' ORDER BY created_at DESC'
    . ' LIMIT 10';

$stmt = $db->prepare($sql);
$stmt->bind_param('iiiiii', $user_id, $user_id, $user_id, $user_id, $user_id, $user_id);
$stmt->execute();
$res = $stmt->get_result();
while ($row = $res->fetch_assoc()) {
    $text = $row['display_text'];
    if ($text !== null && mb_strlen($text) > 80) {
        $text = mb_substr($text, 0, 80) . '...';
    }
    $activities[] = [
        'type' => $row['activity_type'],
        'id' => (string)$row['id'],
        'title' => $text,
        'created_at' => $row['created_at'],
    ];
}
$stmt->close();

// my_resources: 用户上传的资源列表（前 5 个，按 created_at 倒序，仅已发布）
$my_resources = [];
$stmt = $db->prepare('SELECT id, slug, title, summary, type, cover_image, downloads_count, followers_count, created_at FROM resources WHERE user_id = ? AND status = "published" ORDER BY created_at DESC LIMIT 5');
$stmt->bind_param('i', $user_id);
$stmt->execute();
$res = $stmt->get_result();
while ($row = $res->fetch_assoc()) {
    $my_resources[] = [
        'id' => (string)$row['id'],
        'slug' => $row['slug'],
        'title' => $row['title'],
        'summary' => $row['summary'],
        'type' => $row['type'],
        'cover_image' => $row['cover_image'],
        'downloads_count' => (int)$row['downloads_count'],
        'followers_count' => (int)$row['followers_count'],
        'created_at' => $row['created_at'],
    ];
}
$stmt->close();

json_response([
    'success' => true,
    'user' => $safe_user,
    'stats' => $stats,
    'recent_activities' => $activities,
    'my_resources' => $my_resources,
]);
