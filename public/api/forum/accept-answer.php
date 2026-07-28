<?php
// 采纳回答 API - 需要登录
// 接收 JSON: { answer_id }
// 校验当前用户是问题作者（仅提问者可采纳）
// 设置 forum_answers.is_accepted = true
// 更新 forum_questions.has_accepted = true
// 清除其他回答的 is_accepted（保证唯一）
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

$user_id = require_auth();
$input = get_input_json();

$db = getDBConnection();

$answer_id = isset($input['answer_id']) ? intval($input['answer_id']) : 0;
if ($answer_id <= 0) {
    json_response(['success' => false, 'error' => 'answer_id 为必填字段'], 400);
}

// 查询回答及其对应问题的作者
$stmt = $db->prepare('SELECT a.id AS answer_id, a.question_id, q.user_id AS question_author_id '
    . 'FROM forum_answers a INNER JOIN forum_questions q ON q.id = a.question_id '
    . 'WHERE a.id = ? LIMIT 1');
$stmt->bind_param('i', $answer_id);
$stmt->execute();
$res = $stmt->get_result();
$row = $res->fetch_assoc();
$stmt->close();

if (!$row) {
    json_response(['success' => false, 'error' => '回答不存在'], 404);
}

$question_id = (int)$row['question_id'];
$question_author_id = (int)$row['question_author_id'];

// 校验当前用户是问题作者
if ($user_id !== $question_author_id) {
    json_response(['success' => false, 'error' => '仅提问者可采纳回答'], 403);
}

$db->begin_transaction();

try {
    // 清除该问题下其他回答的 is_accepted
    $stmt = $db->prepare('UPDATE forum_answers SET is_accepted = 0 WHERE question_id = ?');
    $stmt->bind_param('i', $question_id);
    $stmt->execute();
    $stmt->close();

    // 设置当前回答为已采纳
    $stmt = $db->prepare('UPDATE forum_answers SET is_accepted = 1, updated_at = NOW() WHERE id = ?');
    $stmt->bind_param('i', $answer_id);
    $stmt->execute();
    $stmt->close();

    // 更新问题 has_accepted
    $stmt = $db->prepare('UPDATE forum_questions SET has_accepted = 1 WHERE id = ?');
    $stmt->bind_param('i', $question_id);
    $stmt->execute();
    $stmt->close();

    $db->commit();
} catch (Exception $e) {
    $db->rollback();
    json_response(['success' => false, 'error' => '采纳失败：' . $e->getMessage()], 500);
}

json_response([
    'success' => true,
]);
