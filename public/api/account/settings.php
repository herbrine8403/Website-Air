<?php
require_once __DIR__ . '/../config.php';

$user_id = require_auth();

$method = $_SERVER['REQUEST_METHOD'];
$db = getDBConnection();

// 公共：拉取当前用户完整信息（同 me.php，附带 notify_email 偏好）
function fetch_user_settings($db, $user_id) {
    $stmt = $db->prepare('SELECT id, username, email, password_enabled, github_id, github_username, bilibili_username, avatar_url, bio, email_verified, role, status, created_at, last_login_at FROM users WHERE id = ? LIMIT 1');
    $stmt->bind_param('i', $user_id);
    $stmt->execute();
    $res = $stmt->get_result();
    $user = $res->fetch_assoc();
    $stmt->close();

    if (!$user) {
        return null;
    }

    return [
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
        // notify_email 列不在当前 schema 中，默认为 true
        // 待 schema 扩展后可持久化
        'notify_email' => true,
    ];
}

if ($method === 'GET') {
    $safe_user = fetch_user_settings($db, $user_id);
    if (!$safe_user) {
        json_response(['success' => false, 'error' => '用户不存在', 'code' => 'user_not_found'], 404);
    }
    json_response(['success' => true, 'user' => $safe_user]);
} elseif ($method === 'PUT') {
    $input = get_input_json();

    $updates = [];
    $types = '';
    $values = [];

    // username: 3-20 字母/数字/下划线，唯一
    if (array_key_exists('username', $input)) {
        $username = trim((string)$input['username']);
        if ($username === '') {
            json_response(['success' => false, 'error' => '用户名不能为空'], 400);
        }
        if (!preg_match('/^[a-zA-Z0-9_]{3,20}$/', $username)) {
            json_response(['success' => false, 'error' => '用户名必须为 3-20 位字母、数字或下划线'], 400);
        }
        // 唯一性校验（排除自身）
        $stmt = $db->prepare('SELECT id FROM users WHERE username = ? AND id != ? LIMIT 1');
        $stmt->bind_param('si', $username, $user_id);
        $stmt->execute();
        $res = $stmt->get_result();
        $conflict = $res->fetch_assoc();
        $stmt->close();
        if ($conflict) {
            json_response(['success' => false, 'error' => '用户名已被占用', 'code' => 'username_taken'], 409);
        }
        $updates[] = 'username = ?';
        $types .= 's';
        $values[] = $username;
    }

    // email: 合法邮箱，唯一
    if (array_key_exists('email', $input)) {
        $email = trim((string)$input['email']);
        if ($email === '') {
            json_response(['success' => false, 'error' => '邮箱不能为空'], 400);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            json_response(['success' => false, 'error' => '邮箱格式不合法'], 400);
        }
        if (strlen($email) > 255) {
            json_response(['success' => false, 'error' => '邮箱过长'], 400);
        }
        $stmt = $db->prepare('SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1');
        $stmt->bind_param('si', $email, $user_id);
        $stmt->execute();
        $res = $stmt->get_result();
        $conflict = $res->fetch_assoc();
        $stmt->close();
        if ($conflict) {
            json_response(['success' => false, 'error' => '邮箱已被注册', 'code' => 'email_taken'], 409);
        }
        $updates[] = 'email = ?';
        $types .= 's';
        $values[] = $email;
    }

    // bio: <=500 字符
    if (array_key_exists('bio', $input)) {
        $bio = $input['bio'];
        if ($bio !== null) {
            $bio = (string)$bio;
            if (mb_strlen($bio) > 500) {
                json_response(['success' => false, 'error' => '个人简介不能超过 500 字符'], 400);
            }
        }
        $updates[] = 'bio = ?';
        $types .= 's';
        $values[] = $bio;
    }

    // avatar_url
    if (array_key_exists('avatar_url', $input)) {
        $avatar = $input['avatar_url'];
        if ($avatar !== null) {
            $avatar = (string)$avatar;
            if (strlen($avatar) > 512) {
                json_response(['success' => false, 'error' => '头像 URL 过长'], 400);
            }
        }
        $updates[] = 'avatar_url = ?';
        $types .= 's';
        $values[] = $avatar;
    }

    // github_username
    if (array_key_exists('github_username', $input)) {
        $gh = $input['github_username'];
        if ($gh !== null) {
            $gh = (string)$gh;
            if (strlen($gh) > 64) {
                json_response(['success' => false, 'error' => 'GitHub 用户名过长'], 400);
            }
        }
        $updates[] = 'github_username = ?';
        $types .= 's';
        $values[] = $gh;
    }

    // bilibili_username
    if (array_key_exists('bilibili_username', $input)) {
        $bili = $input['bilibili_username'];
        if ($bili !== null) {
            $bili = (string)$bili;
            if (strlen($bili) > 64) {
                json_response(['success' => false, 'error' => 'B 站用户名过长'], 400);
            }
        }
        $updates[] = 'bilibili_username = ?';
        $types .= 's';
        $values[] = $bili;
    }

    // notify_email: 接受布尔值，但当前 schema 无对应列，仅在响应中回显
    if (array_key_exists('notify_email', $input)) {
        if (!is_bool($input['notify_email'])) {
            json_response(['success' => false, 'error' => 'notify_email 必须为布尔值'], 400);
        }
    }

    // 不可更新字段（id, password_hash, role, status, created_at）—显式拒绝避免误传
    foreach (['id', 'password_hash', 'role', 'status', 'created_at'] as $forbidden) {
        if (array_key_exists($forbidden, $input)) {
            json_response(['success' => false, 'error' => "字段 $forbidden 不可更新"], 400);
        }
    }

    // 执行更新
    if (!empty($updates)) {
        $sql = 'UPDATE users SET ' . implode(', ', $updates) . ' WHERE id = ?';
        $types .= 'i';
        $values[] = $user_id;

        $stmt = $db->prepare($sql);
        if (!$stmt) {
            json_response(['success' => false, 'error' => '数据库准备失败'], 500);
        }
        // 使用引用绑定以兼容更多 PHP 版本
        $refs = [];
        foreach ($values as $k => $v) {
            $refs[$k] = &$values[$k];
        }
        array_unshift($refs, $types);
        call_user_func_array([$stmt, 'bind_param'], $refs);
        $ok = $stmt->execute();
        $affected = $stmt->affected_rows;
        $err = $stmt->error;
        $stmt->close();

        if (!$ok) {
            json_response(['success' => false, 'error' => '更新失败：' . $err], 500);
        }
    }

    // 返回更新后的用户信息
    $safe_user = fetch_user_settings($db, $user_id);
    if (!$safe_user) {
        json_response(['success' => false, 'error' => '用户不存在'], 404);
    }

    // 若客户端传入了 notify_email，回显客户端的值
    if (array_key_exists('notify_email', $input)) {
        $safe_user['notify_email'] = (bool)$input['notify_email'];
    }

    json_response(['success' => true, 'user' => $safe_user]);
} else {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}
