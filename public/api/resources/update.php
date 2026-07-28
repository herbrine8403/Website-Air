<?php
// 更新资源 API - 需要登录
// 接收 ?id=xxx + JSON body
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

$user_id = require_auth();
$input = get_input_json();

$db = getDBConnection();

$resource_id = isset($_GET['id']) ? intval($_GET['id']) : 0;
if ($resource_id <= 0) {
    json_response(['success' => false, 'error' => '缺少 id 参数'], 400);
}

// 查询资源并校验所有者
$stmt = $db->prepare('SELECT id, user_id FROM resources WHERE id = ? LIMIT 1');
$stmt->bind_param('i', $resource_id);
$stmt->execute();
$res = $stmt->get_result();
$resource = $res->fetch_assoc();
$stmt->close();

if (!$resource) {
    json_response(['success' => false, 'error' => '资源不存在'], 404);
}

if ((int)$resource['user_id'] !== $user_id) {
    json_response(['success' => false, 'error' => '无权操作：仅所有者可更新'], 403);
}

// 可更新字段
$title = isset($input['title']) && is_string($input['title']) ? trim($input['title']) : null;
$summary = isset($input['summary']) && is_string($input['summary']) ? trim($input['summary']) : null;
$description = isset($input['description']) && is_string($input['description']) ? $input['description'] : null;
$license = isset($input['license']) && is_string($input['license']) ? trim($input['license']) : null;
$cover_image = isset($input['cover_image']) && is_string($input['cover_image']) ? trim($input['cover_image']) : null;

$tags = isset($input['tags']) && is_array($input['tags']) ? $input['tags'] : null;
$gallery = isset($input['gallery']) && is_array($input['gallery']) ? $input['gallery'] : null;
$dependencies = isset($input['dependencies']) && is_array($input['dependencies']) ? $input['dependencies'] : null;

$db->begin_transaction();

try {
    // 更新基础字段（动态构建）
    $updates = [];
    $types = '';
    $params = [];

    if ($title !== null) {
        $updates[] = 'title = ?';
        $types .= 's';
        $params[] = $title;
    }
    if ($summary !== null) {
        $updates[] = 'summary = ?';
        $types .= 's';
        $params[] = $summary;
    }
    if ($description !== null) {
        $updates[] = 'description = ?';
        $types .= 's';
        $params[] = $description;
    }
    if ($license !== null) {
        $updates[] = 'license = ?';
        $types .= 's';
        $params[] = $license;
    }
    if ($cover_image !== null) {
        $updates[] = 'cover_image = ?';
        $types .= 's';
        $params[] = $cover_image;
    }

    if (!empty($updates)) {
        $updates[] = 'updated_at = NOW()';
        $types .= 'i';
        $params[] = $resource_id;
        $set_clause = implode(', ', $updates);
        $sql = "UPDATE resources SET $set_clause WHERE id = ?";
        $stmt = $db->prepare($sql);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $stmt->close();
    }

    // 同步 resource_tags（先删后插）
    if ($tags !== null) {
        $del_stmt = $db->prepare('DELETE FROM resource_tags WHERE resource_id = ?');
        $del_stmt->bind_param('i', $resource_id);
        $del_stmt->execute();
        $del_stmt->close();

        $tag_stmt = $db->prepare('INSERT INTO resource_tags (resource_id, tag_type, tag_value) VALUES (?, ?, ?)');
        foreach ($tags as $tag) {
            if (!isset($tag['type'], $tag['value'])) {
                continue;
            }
            $t_type = (string)$tag['type'];
            $t_value = (string)$tag['value'];
            $tag_stmt->bind_param('iss', $resource_id, $t_type, $t_value);
            $tag_stmt->execute();
        }
        $tag_stmt->close();
    }

    // 同步 resource_gallery
    if ($gallery !== null) {
        $del_stmt = $db->prepare('DELETE FROM resource_gallery WHERE resource_id = ?');
        $del_stmt->bind_param('i', $resource_id);
        $del_stmt->execute();
        $del_stmt->close();

        $g_stmt = $db->prepare('INSERT INTO resource_gallery (resource_id, image_url, caption, sort_order) VALUES (?, ?, ?, ?)');
        $sort_idx = 0;
        foreach ($gallery as $g_item) {
            if (!isset($g_item['url'])) {
                continue;
            }
            $g_url = (string)$g_item['url'];
            $g_caption = isset($g_item['caption']) ? (string)$g_item['caption'] : null;
            $g_sort = isset($g_item['sort_order']) ? (int)$g_item['sort_order'] : $sort_idx;
            $g_stmt->bind_param('issi', $resource_id, $g_url, $g_caption, $g_sort);
            $g_stmt->execute();
            $sort_idx++;
        }
        $g_stmt->close();
    }

    // 同步 resource_dependencies
    if ($dependencies !== null) {
        $del_stmt = $db->prepare('DELETE FROM resource_dependencies WHERE resource_id = ?');
        $del_stmt->bind_param('i', $resource_id);
        $del_stmt->execute();
        $del_stmt->close();

        $d_stmt = $db->prepare('INSERT INTO resource_dependencies (resource_id, dep_type, dep_name, dep_version, dep_url) VALUES (?, ?, ?, ?, ?)');
        foreach ($dependencies as $dep) {
            $d_type = isset($dep['dep_type']) ? (string)$dep['dep_type'] : null;
            $d_name = isset($dep['dep_name']) ? (string)$dep['dep_name'] : null;
            $d_version = isset($dep['dep_version']) ? (string)$dep['dep_version'] : null;
            $d_url = isset($dep['dep_url']) ? (string)$dep['dep_url'] : null;
            $d_stmt->bind_param('issss', $resource_id, $d_type, $d_name, $d_version, $d_url);
            $d_stmt->execute();
        }
        $d_stmt->close();
    }

    $db->commit();
} catch (Exception $e) {
    $db->rollback();
    json_response(['success' => false, 'error' => '更新资源失败：' . $e->getMessage()], 500);
}

// 返回更新后的资源
$stmt = $db->prepare('SELECT id, slug, title, summary, description, type, cover_image, license, status, created_at, updated_at FROM resources WHERE id = ? LIMIT 1');
$stmt->bind_param('i', $resource_id);
$stmt->execute();
$res = $stmt->get_result();
$updated = $res->fetch_assoc();
$stmt->close();

json_response([
    'success' => true,
    'resource' => [
        'id' => (string)$updated['id'],
        'slug' => $updated['slug'],
        'title' => $updated['title'],
        'summary' => $updated['summary'],
        'description' => $updated['description'],
        'type' => $updated['type'],
        'cover_image' => $updated['cover_image'],
        'license' => $updated['license'],
        'status' => $updated['status'],
        'created_at' => $updated['created_at'],
        'updated_at' => $updated['updated_at'],
    ],
]);
