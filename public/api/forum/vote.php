<?php
// 投票 API - 需要登录
// 接收 JSON: { target_type: "topic"|"article"|"question"|"answer"|"reply", target_id, value: 1|-1 }
// 逻辑：
//   已投同方向：取消投票（删除记录，回滚计数）
//   已投反方向：切换投票（更新 value，调整计数）
//   未投票：创建新记录
// 根据目标类型更新对应表的 votes_up/votes_down（answer/reply 有字段；其他从 forum_votes 聚合）
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

$user_id = require_auth();
$input = get_input_json();

$db = getDBConnection();

$target_type = isset($input['target_type']) && is_string($input['target_type']) ? trim($input['target_type']) : '';
$target_id = isset($input['target_id']) ? intval($input['target_id']) : 0;
$value = isset($input['value']) ? intval($input['value']) : 0;

$valid_types = ['topic', 'article', 'question', 'answer', 'reply'];
if (!in_array($target_type, $valid_types, true)) {
    json_response(['success' => false, 'error' => 'target_type 无效'], 400);
}

if ($target_id <= 0) {
    json_response(['success' => false, 'error' => 'target_id 为必填字段'], 400);
}

if ($value !== 1 && $value !== -1) {
    json_response(['success' => false, 'error' => 'value 必须为 1 或 -1'], 400);
}

// 校验目标存在
$check_table_map = [
    'topic' => 'forum_topics',
    'article' => 'forum_articles',
    'question' => 'forum_questions',
    'answer' => 'forum_answers',
    'reply' => 'forum_replies',
];
$check_table = $check_table_map[$target_type];
$stmt = $db->prepare("SELECT id FROM $check_table WHERE id = ? LIMIT 1");
$stmt->bind_param('i', $target_id);
$stmt->execute();
$res = $stmt->get_result();
$target = $res->fetch_assoc();
$stmt->close();

if (!$target) {
    json_response(['success' => false, 'error' => '目标不存在'], 404);
}

// 查询当前用户是否已对该目标投过票
$stmt = $db->prepare('SELECT id, value FROM forum_votes WHERE user_id = ? AND target_type = ? AND target_id = ? LIMIT 1');
$stmt->bind_param('isi', $user_id, $target_type, $target_id);
$stmt->execute();
$res = $stmt->get_result();
$existing_vote = $res->fetch_assoc();
$stmt->close();

$new_value = 0; // 0 表示取消投票

// 是否需要更新对应表的 votes_up/votes_down 字段（仅 answer/reply 有这些字段）
$has_vote_fields = in_array($target_type, ['answer', 'reply'], true);

$db->begin_transaction();

try {
    if ($existing_vote) {
        $existing_value = (int)$existing_vote['value'];
        $existing_id = (int)$existing_vote['id'];

        if ($existing_value === $value) {
            // 已投同方向：取消投票
            $stmt = $db->prepare('DELETE FROM forum_votes WHERE id = ?');
            $stmt->bind_param('i', $existing_id);
            $stmt->execute();
            $stmt->close();
            $new_value = 0;

            // 回滚计数
            if ($has_vote_fields) {
                if ($value === 1) {
                    $stmt = $db->prepare("UPDATE $check_table SET votes_up = GREATEST(0, votes_up - 1) WHERE id = ?");
                } else {
                    $stmt = $db->prepare("UPDATE $check_table SET votes_down = GREATEST(0, votes_down - 1) WHERE id = ?");
                }
                $stmt->bind_param('i', $target_id);
                $stmt->execute();
                $stmt->close();
            }
        } else {
            // 已投反方向：切换投票
            $stmt = $db->prepare('UPDATE forum_votes SET value = ? WHERE id = ?');
            $stmt->bind_param('ii', $value, $existing_id);
            $stmt->execute();
            $stmt->close();
            $new_value = $value;

            // 调整计数：旧方向 -1，新方向 +1
            if ($has_vote_fields) {
                if ($value === 1) {
                    // 从 -1 切换到 1：votes_down -1, votes_up +1
                    $stmt = $db->prepare("UPDATE $check_table SET votes_up = votes_up + 1, votes_down = GREATEST(0, votes_down - 1) WHERE id = ?");
                } else {
                    // 从 1 切换到 -1：votes_up -1, votes_down +1
                    $stmt = $db->prepare("UPDATE $check_table SET votes_down = votes_down + 1, votes_up = GREATEST(0, votes_up - 1) WHERE id = ?");
                }
                $stmt->bind_param('i', $target_id);
                $stmt->execute();
                $stmt->close();
            }
        }
    } else {
        // 未投票：创建新记录
        $stmt = $db->prepare('INSERT INTO forum_votes (user_id, target_type, target_id, value, created_at) VALUES (?, ?, ?, ?, NOW())');
        $stmt->bind_param('isii', $user_id, $target_type, $target_id, $value);
        $stmt->execute();
        $stmt->close();
        $new_value = $value;

        // 增加计数
        if ($has_vote_fields) {
            if ($value === 1) {
                $stmt = $db->prepare("UPDATE $check_table SET votes_up = votes_up + 1 WHERE id = ?");
            } else {
                $stmt = $db->prepare("UPDATE $check_table SET votes_down = votes_down + 1 WHERE id = ?");
            }
            $stmt->bind_param('i', $target_id);
            $stmt->execute();
            $stmt->close();
        }
    }

    $db->commit();
} catch (Exception $e) {
    $db->rollback();
    json_response(['success' => false, 'error' => '投票失败：' . $e->getMessage()], 500);
}

// 查询最新 votes_up 和 votes_down
// 对于 answer/reply，直接从对应表读取；其他从 forum_votes 聚合
if ($has_vote_fields) {
    $stmt = $db->prepare("SELECT votes_up, votes_down FROM $check_table WHERE id = ? LIMIT 1");
    $stmt->bind_param('i', $target_id);
    $stmt->execute();
    $res = $stmt->get_result();
    $row = $res->fetch_assoc();
    $stmt->close();
    $votes_up = (int)$row['votes_up'];
    $votes_down = (int)$row['votes_down'];
} else {
    $stmt = $db->prepare("SELECT SUM(CASE WHEN value = 1 THEN 1 ELSE 0 END) AS up, SUM(CASE WHEN value = -1 THEN 1 ELSE 0 END) AS down FROM forum_votes WHERE target_type = ? AND target_id = ?");
    $stmt->bind_param('si', $target_type, $target_id);
    $stmt->execute();
    $res = $stmt->get_result();
    $row = $res->fetch_assoc();
    $stmt->close();
    $votes_up = (int)$row['up'];
    $votes_down = (int)$row['down'];
}

json_response([
    'success' => true,
    'value' => $new_value,
    'votes_up' => $votes_up,
    'votes_down' => $votes_down,
]);
