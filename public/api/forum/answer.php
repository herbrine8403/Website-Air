<?php
// 回答问题 API - 需要登录
// 接收 JSON: { question_id, content }
// 创建 forum_answers 记录
// 更新 forum_questions.answers_count
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

$user_id = require_auth();
$input = get_input_json();

$db = getDBConnection();

$question_id = isset($input['question_id']) ? intval($input['question_id']) : 0;
$content = isset($input['content']) && is_string($input['content']) ? trim($input['content']) : '';

if ($question_id <= 0) {
    json_response(['success' => false, 'error' => 'question_id 为必填字段'], 400);
}

if ($content === '') {
    json_response(['success' => false, 'error' => 'content 为必填字段'], 400);
}

// 校验问题存在
$stmt = $db->prepare('SELECT id FROM forum_questions WHERE id = ? LIMIT 1');
$stmt->bind_param('i', $question_id);
$stmt->execute();
$res = $stmt->get_result();
$question = $res->fetch_assoc();
$stmt->close();

if (!$question) {
    json_response(['success' => false, 'error' => '问题不存在'], 404);
}

$answer_id = 0;
$created_at = date('Y-m-d H:i:s');

$db->begin_transaction();

try {
    // 创建回答
    $stmt = $db->prepare('INSERT INTO forum_answers (question_id, user_id, content, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())');
    $stmt->bind_param('iis', $question_id, $user_id, $content);
    $stmt->execute();
    $answer_id = (int)$db->insert_id;
    $stmt->close();

    // 更新 answers_count
    $stmt = $db->prepare('UPDATE forum_questions SET answers_count = answers_count + 1 WHERE id = ?');
    $stmt->bind_param('i', $question_id);
    $stmt->execute();
    $stmt->close();

    $db->commit();
} catch (Exception $e) {
    $db->rollback();
    json_response(['success' => false, 'error' => '创建回答失败：' . $e->getMessage()], 500);
}

// 查询作者信息
$stmt = $db->prepare('SELECT u.id, u.username, u.avatar_url FROM users u WHERE u.id = ? LIMIT 1');
$stmt->bind_param('i', $user_id);
$stmt->execute();
$res = $stmt->get_result();
$author = $res->fetch_assoc();
$stmt->close();

json_response([
    'success' => true,
    'answer' => [
        'id' => (string)$answer_id,
        'question_id' => (string)$question_id,
        'content' => $content,
        'votes_up' => 0,
        'votes_down' => 0,
        'is_accepted' => false,
        'created_at' => $created_at,
        'updated_at' => $created_at,
        'author' => [
            'id' => (string)$author['id'],
            'username' => $author['username'],
            'avatar_url' => $author['avatar_url'],
        ],
    ],
], 201);
