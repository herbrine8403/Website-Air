<?php
// 统一发帖 API - 需要登录
// 接收 JSON: { type: "topic"|"article"|"question", title, content, ... }
//   topic: 可选 category
//   article: 可选 summary, cover_image
//   question: 可选 tags, bounty
// status 直接为 'published'（无需审核）
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

$user_id = require_auth();
$input = get_input_json();

$db = getDBConnection();

$type = isset($input['type']) && is_string($input['type']) ? trim($input['type']) : '';
$title = isset($input['title']) && is_string($input['title']) ? trim($input['title']) : '';
$content = isset($input['content']) && is_string($input['content']) ? trim($input['content']) : '';

if (!in_array($type, ['topic', 'article', 'question'], true)) {
    json_response(['success' => false, 'error' => 'type 必须为 topic/article/question'], 400);
}

if ($title === '') {
    json_response(['success' => false, 'error' => 'title 为必填字段'], 400);
}

if ($content === '') {
    json_response(['success' => false, 'error' => 'content 为必填字段'], 400);
}

$status = 'published';
$new_id = 0;

$db->begin_transaction();

try {
    if ($type === 'topic') {
        $category = isset($input['category']) && is_string($input['category']) ? trim($input['category']) : null;
        $stmt = $db->prepare('INSERT INTO forum_topics (title, content, user_id, category, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())');
        if ($category === null) {
            $null = null;
            $stmt->bind_param('ssiss', $title, $content, $user_id, $null, $status);
        } else {
            $stmt->bind_param('ssiss', $title, $content, $user_id, $category, $status);
        }
        $stmt->execute();
        $new_id = (int)$db->insert_id;
        $stmt->close();
    } elseif ($type === 'article') {
        $summary = isset($input['summary']) && is_string($input['summary']) ? trim($input['summary']) : null;
        $cover_image = isset($input['cover_image']) && is_string($input['cover_image']) ? trim($input['cover_image']) : null;
        $stmt = $db->prepare('INSERT INTO forum_articles (title, content, summary, cover_image, user_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())');
        if ($summary === null && $cover_image === null) {
            $n1 = null;
            $n2 = null;
            $stmt->bind_param('sssiis', $title, $content, $n1, $n2, $user_id, $status);
        } elseif ($summary === null) {
            $n1 = null;
            $stmt->bind_param('sssiis', $title, $content, $n1, $cover_image, $user_id, $status);
        } elseif ($cover_image === null) {
            $n2 = null;
            $stmt->bind_param('sssiis', $title, $content, $summary, $n2, $user_id, $status);
        } else {
            $stmt->bind_param('sssiis', $title, $content, $summary, $cover_image, $user_id, $status);
        }
        $stmt->execute();
        $new_id = (int)$db->insert_id;
        $stmt->close();
    } else { // question
        $tags_input = isset($input['tags']) ? $input['tags'] : null;
        // tags 可为数组或逗号分隔字符串，统一转为逗号分隔字符串
        $tags_str = null;
        if (is_array($tags_input)) {
            $tags_clean = [];
            foreach ($tags_input as $t) {
                if (is_string($t)) {
                    $t = trim($t);
                    if ($t !== '') {
                        $tags_clean[] = $t;
                    }
                }
            }
            if (count($tags_clean) > 0) {
                $tags_str = implode(',', $tags_clean);
            }
        } elseif (is_string($tags_input)) {
            $tags_str = trim($tags_input);
            if ($tags_str === '') {
                $tags_str = null;
            }
        }

        $bounty = isset($input['bounty']) ? intval($input['bounty']) : 0;
        if ($bounty < 0) {
            $bounty = 0;
        }

        $stmt = $db->prepare('INSERT INTO forum_questions (title, content, user_id, tags, bounty, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())');
        if ($tags_str === null) {
            $null = null;
            $stmt->bind_param('ssiisi', $title, $content, $user_id, $null, $bounty, $status);
        } else {
            $stmt->bind_param('ssiisi', $title, $content, $user_id, $tags_str, $bounty, $status);
        }
        $stmt->execute();
        $new_id = (int)$db->insert_id;
        $stmt->close();

        // 如有 tags，更新 forum_tags.usage_count
        if ($tags_str !== null) {
            $tag_list = explode(',', $tags_str);
            foreach ($tag_list as $tag_name) {
                $tag_name = trim($tag_name);
                if ($tag_name === '') {
                    continue;
                }
                // 插入或更新 usage_count
                $t_stmt = $db->prepare('INSERT INTO forum_tags (name, usage_count) VALUES (?, 1) ON DUPLICATE KEY UPDATE usage_count = usage_count + 1');
                $t_stmt->bind_param('s', $tag_name);
                $t_stmt->execute();
                $t_stmt->close();
            }
        }
    }

    $db->commit();
} catch (Exception $e) {
    $db->rollback();
    json_response(['success' => false, 'error' => '创建失败：' . $e->getMessage()], 500);
}

json_response([
    'success' => true,
    'id' => (string)$new_id,
    'type' => $type,
], 201);
