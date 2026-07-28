<?php
require_once __DIR__ . '/../config.php';

$user_id = require_auth();

$method = $_SERVER['REQUEST_METHOD'];
$db = getDBConnection();

if ($method === 'GET') {
    $conversation_id = isset($_GET['conversation_id']) ? (int)$_GET['conversation_id'] : 0;

    if ($conversation_id > 0) {
        // 校验当前用户是否为该会话的成员
        $stmt = $db->prepare('SELECT id, user1_id, user2_id FROM inbox_conversations WHERE id = ? LIMIT 1');
        $stmt->bind_param('i', $conversation_id);
        $stmt->execute();
        $res = $stmt->get_result();
        $conv = $res->fetch_assoc();
        $stmt->close();

        if (!$conv) {
            json_response(['success' => false, 'error' => '会话不存在', 'code' => 'conversation_not_found'], 404);
        }
        if ((int)$conv['user1_id'] !== $user_id && (int)$conv['user2_id'] !== $user_id) {
            json_response(['success' => false, 'error' => '无权访问该会话', 'code' => 'forbidden'], 403);
        }

        // 分页参数
        $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
        $size = isset($_GET['size']) ? (int)$_GET['size'] : 50;
        if ($size < 1) $size = 50;
        if ($size > 200) $size = 200;
        $offset = ($page - 1) * $size;

        // 返回该会话的消息列表（按 created_at 升序）
        $stmt = $db->prepare('SELECT id, sender_id, content, is_read, created_at FROM inbox_messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT ? OFFSET ?');
        $stmt->bind_param('iii', $conversation_id, $size, $offset);
        $stmt->execute();
        $res = $stmt->get_result();

        $messages = [];
        while ($row = $res->fetch_assoc()) {
            $messages[] = [
                'id' => (string)$row['id'],
                'sender_id' => (string)$row['sender_id'],
                'content' => $row['content'],
                'is_read' => (bool)$row['is_read'],
                'created_at' => $row['created_at'],
            ];
        }
        $stmt->close();

        // 当前用户查看会话时，将对方发来的未读消息标记为已读
        $stmt = $db->prepare('UPDATE inbox_messages SET is_read = 1 WHERE conversation_id = ? AND sender_id != ? AND is_read = 0');
        $stmt->bind_param('ii', $conversation_id, $user_id);
        $stmt->execute();
        $stmt->close();

        json_response(['success' => true, 'messages' => $messages, 'conversation_id' => (string)$conversation_id]);
    } else {
        // 返回当前用户所有会话列表
        $sql = 'SELECT c.id, c.user1_id, c.user2_id, c.last_message_at, c.created_at,'
            . ' u.id AS other_id, u.username AS other_username, u.avatar_url AS other_avatar_url,'
            . ' (SELECT content FROM inbox_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message_content,'
            . ' (SELECT created_at FROM inbox_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message_created_at,'
            . ' (SELECT COUNT(*) FROM inbox_messages WHERE conversation_id = c.id AND sender_id != ? AND is_read = 0) AS unread_count'
            . ' FROM inbox_conversations c'
            . ' JOIN users u ON u.id = (CASE WHEN c.user1_id = ? THEN c.user2_id ELSE c.user1_id END)'
            . ' WHERE c.user1_id = ? OR c.user2_id = ?'
            . ' ORDER BY c.last_message_at DESC';

        $stmt = $db->prepare($sql);
        $stmt->bind_param('iiii', $user_id, $user_id, $user_id, $user_id);
        $stmt->execute();
        $res = $stmt->get_result();

        $conversations = [];
        while ($row = $res->fetch_assoc()) {
            $conversations[] = [
                'id' => (string)$row['id'],
                'other_user' => [
                    'id' => (string)$row['other_id'],
                    'username' => $row['other_username'],
                    'avatar_url' => $row['other_avatar_url'],
                ],
                'last_message' => [
                    'content' => $row['last_message_content'],
                    'created_at' => $row['last_message_created_at'],
                ],
                'unread_count' => (int)$row['unread_count'],
                'last_message_at' => $row['last_message_at'],
                'created_at' => $row['created_at'],
            ];
        }
        $stmt->close();

        json_response(['success' => true, 'conversations' => $conversations]);
    }
} elseif ($method === 'POST') {
    $input = get_input_json();

    $content = isset($input['content']) ? trim((string)$input['content']) : '';
    if ($content === '') {
        json_response(['success' => false, 'error' => 'content 不能为空', 'code' => 'missing_content'], 400);
    }
    if (mb_strlen($content) > 65535) {
        json_response(['success' => false, 'error' => '消息内容过长'], 400);
    }

    $recipient_id = isset($input['recipient_id']) ? (int)$input['recipient_id'] : 0;
    $conversation_id = isset($input['conversation_id']) ? (int)$input['conversation_id'] : 0;

    // 确定目标会话
    if ($conversation_id > 0) {
        // 通过 conversation_id 找会话，校验当前用户是成员
        $stmt = $db->prepare('SELECT id, user1_id, user2_id FROM inbox_conversations WHERE id = ? LIMIT 1');
        $stmt->bind_param('i', $conversation_id);
        $stmt->execute();
        $res = $stmt->get_result();
        $conv = $res->fetch_assoc();
        $stmt->close();

        if (!$conv) {
            json_response(['success' => false, 'error' => '会话不存在', 'code' => 'conversation_not_found'], 404);
        }
        if ((int)$conv['user1_id'] !== $user_id && (int)$conv['user2_id'] !== $user_id) {
            json_response(['success' => false, 'error' => '无权在该会话中发送消息', 'code' => 'forbidden'], 403);
        }
        $target_conv_id = (int)$conv['id'];
    } elseif ($recipient_id > 0) {
        // 通过 recipient_id 找或创建会话（保证 user1_id < user2_id 唯一）
        if ($recipient_id === $user_id) {
            json_response(['success' => false, 'error' => '不能给自己发私信', 'code' => 'invalid_recipient'], 400);
        }

        // 校验 recipient 是否存在且 active
        $stmt = $db->prepare('SELECT id FROM users WHERE id = ? AND status = "active" LIMIT 1');
        $stmt->bind_param('i', $recipient_id);
        $stmt->execute();
        $res = $stmt->get_result();
        $recipient = $res->fetch_assoc();
        $stmt->close();

        if (!$recipient) {
            json_response(['success' => false, 'error' => '收件人不存在', 'code' => 'recipient_not_found'], 404);
        }

        $user1_id = min($user_id, $recipient_id);
        $user2_id = max($user_id, $recipient_id);

        // 尝试查找已有会话
        $stmt = $db->prepare('SELECT id FROM inbox_conversations WHERE user1_id = ? AND user2_id = ? LIMIT 1');
        $stmt->bind_param('ii', $user1_id, $user2_id);
        $stmt->execute();
        $res = $stmt->get_result();
        $existing = $res->fetch_assoc();
        $stmt->close();

        if ($existing) {
            $target_conv_id = (int)$existing['id'];
        } else {
            // 创建新会话
            $stmt = $db->prepare('INSERT INTO inbox_conversations (user1_id, user2_id, last_message_at) VALUES (?, ?, NOW())');
            $stmt->bind_param('ii', $user1_id, $user2_id);
            $ok = $stmt->execute();
            $err = $stmt->error;
            $new_id = $stmt->insert_id;
            $stmt->close();
            if (!$ok) {
                json_response(['success' => false, 'error' => '创建会话失败：' . $err], 500);
            }
            $target_conv_id = (int)$new_id;
        }
    } else {
        json_response(['success' => false, 'error' => '需要 recipient_id 或 conversation_id', 'code' => 'missing_param'], 400);
    }

    // 插入消息
    $stmt = $db->prepare('INSERT INTO inbox_messages (conversation_id, sender_id, content) VALUES (?, ?, ?)');
    $stmt->bind_param('iis', $target_conv_id, $user_id, $content);
    $ok = $stmt->execute();
    $err = $stmt->error;
    $message_id = $stmt->insert_id;
    $stmt->close();

    if (!$ok) {
        json_response(['success' => false, 'error' => '发送消息失败：' . $err], 500);
    }

    // 更新会话的 last_message_at
    $stmt = $db->prepare('UPDATE inbox_conversations SET last_message_at = NOW() WHERE id = ?');
    $stmt->bind_param('i', $target_conv_id);
    $stmt->execute();
    $stmt->close();

    // 拉取消息创建时间
    $stmt = $db->prepare('SELECT id, sender_id, content, is_read, created_at FROM inbox_messages WHERE id = ? LIMIT 1');
    $stmt->bind_param('i', $message_id);
    $stmt->execute();
    $res = $stmt->get_result();
    $msg = $res->fetch_assoc();
    $stmt->close();

    $message = null;
    if ($msg) {
        $message = [
            'id' => (string)$msg['id'],
            'sender_id' => (string)$msg['sender_id'],
            'content' => $msg['content'],
            'is_read' => (bool)$msg['is_read'],
            'created_at' => $msg['created_at'],
        ];
    }

    json_response([
        'success' => true,
        'message' => $message,
        'conversation_id' => (string)$target_conv_id,
    ]);
} else {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}
