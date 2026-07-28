<?php
// 问题详情 API - 公开访问
// 接收 ?id=xxx
// 自增 views_count，返回问题完整信息 + author + 回答列表（最佳答案置顶）
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

$db = getDBConnection();

$id = isset($_GET['id']) && $_GET['id'] !== '' ? intval($_GET['id']) : 0;
if ($id <= 0) {
    json_response(['success' => false, 'error' => 'id 为必填字段'], 400);
}

// 查询问题
$stmt = $db->prepare('SELECT q.*, u.id AS author_id, u.username AS author_username, u.avatar_url AS author_avatar_url '
    . 'FROM forum_questions q LEFT JOIN users u ON u.id = q.user_id WHERE q.id = ? LIMIT 1');
$stmt->bind_param('i', $id);
$stmt->execute();
$res = $stmt->get_result();
$question = $res->fetch_assoc();
$stmt->close();

if (!$question) {
    json_response(['success' => false, 'error' => '问题不存在'], 404);
}

$question_id = (int)$question['id'];

// 自增 views_count
$db->begin_transaction();
try {
    $stmt = $db->prepare('UPDATE forum_questions SET views_count = views_count + 1 WHERE id = ?');
    $stmt->bind_param('i', $question_id);
    $stmt->execute();
    $stmt->close();
    $db->commit();
} catch (Exception $e) {
    $db->rollback();
}

// 查询回答列表（最佳答案置顶：is_accepted DESC，其次 votes_up - votes_down DESC，最后 created_at ASC）
$stmt = $db->prepare('SELECT a.id, a.question_id, a.content, a.votes_up, a.votes_down, a.is_accepted, a.created_at, a.updated_at, '
    . 'u.id AS author_id, u.username AS author_username, u.avatar_url AS author_avatar_url '
    . 'FROM forum_answers a LEFT JOIN users u ON u.id = a.user_id '
    . 'WHERE a.question_id = ? '
    . 'ORDER BY a.is_accepted DESC, (a.votes_up - a.votes_down) DESC, a.created_at ASC');
$stmt->bind_param('i', $question_id);
$stmt->execute();
$res = $stmt->get_result();

$answers = [];
while ($row = $res->fetch_assoc()) {
    $answers[] = [
        'id' => (string)$row['id'],
        'question_id' => (string)$row['question_id'],
        'content' => $row['content'],
        'votes_up' => (int)$row['votes_up'],
        'votes_down' => (int)$row['votes_down'],
        'is_accepted' => (bool)$row['is_accepted'],
        'created_at' => $row['created_at'],
        'updated_at' => $row['updated_at'],
        'author' => [
            'id' => (string)$row['author_id'],
            'username' => $row['author_username'],
            'avatar_url' => $row['author_avatar_url'],
        ],
    ];
}
$stmt->close();

// tags 字段转数组
$tags_raw = $question['tags'];
$tags = [];
if ($tags_raw !== null && $tags_raw !== '') {
    $tags = array_map('trim', explode(',', $tags_raw));
}

json_response([
    'success' => true,
    'question' => [
        'id' => (string)$question['id'],
        'title' => $question['title'],
        'content' => $question['content'],
        'tags' => $tags,
        'bounty' => (int)$question['bounty'],
        'views_count' => (int)$question['views_count'] + 1,
        'answers_count' => (int)$question['answers_count'],
        'followers_count' => (int)$question['followers_count'],
        'has_accepted' => (bool)$question['has_accepted'],
        'status' => $question['status'],
        'created_at' => $question['created_at'],
        'updated_at' => $question['updated_at'],
        'author' => [
            'id' => (string)$question['author_id'],
            'username' => $question['author_username'],
            'avatar_url' => $question['author_avatar_url'],
        ],
    ],
    'answers' => $answers,
]);
