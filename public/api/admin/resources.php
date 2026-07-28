<?php
require_once __DIR__ . '/../config.php';

$method = $_SERVER['REQUEST_METHOD'];
if (!in_array($method, ['GET', 'POST', 'PUT', 'DELETE'], true)) {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

$admin_id = require_admin();
$db = getDBConnection();

if ($method === 'GET') {
    // 资源列表（支持搜索、类型、状态、分页）
    $q = trim($_GET['q'] ?? '');
    $type = trim($_GET['type'] ?? '');
    $status = trim($_GET['status'] ?? '');
    $featured = $_GET['featured'] ?? '';
    $p = get_pagination_params();

    $where = [];
    $params = [];
    $types = '';
    if ($q !== '') {
        $where[] = '(r.title LIKE ? OR r.slug LIKE ? OR r.summary LIKE ?)';
        $kw = '%' . $q . '%';
        $params[] = $kw; $params[] = $kw; $params[] = $kw;
        $types .= 'sss';
    }
    if ($type !== '') {
        $where[] = 'r.type = ?';
        $params[] = $type;
        $types .= 's';
    }
    if ($status !== '') {
        $where[] = 'r.status = ?';
        $params[] = $status;
        $types .= 's';
    }
    if ($featured === '1' || $featured === '0') {
        $where[] = 'r.featured = ?';
        $params[] = (int)$featured;
        $types .= 'i';
    }
    $where_sql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

    // 总数
    $sql = "SELECT COUNT(*) AS cnt FROM resources r $where_sql";
    $stmt = $db->prepare($sql);
    if ($types) {
        $stmt->bind_param($types, ...$params);
    }
    $stmt->execute();
    $res = $stmt->get_result();
    $total = 0;
    if ($row = $res->fetch_assoc()) {
        $total = (int)$row['cnt'];
    }
    $stmt->close();

    // 列表
    $sql = "SELECT r.id, r.slug, r.title, r.summary, r.type, r.user_id, r.cover_image, r.downloads_count, r.followers_count, r.rating_avg, r.rating_count, r.status, r.featured, r.created_at, r.updated_at, u.username AS author_name FROM resources r LEFT JOIN users u ON u.id = r.user_id $where_sql ORDER BY r.created_at DESC LIMIT ? OFFSET ?";
    $stmt = $db->prepare($sql);
    $list_types = $types . 'ii';
    $list_params = array_merge($params, [$p['size'], $p['offset']]);
    $stmt->bind_param($list_types, ...$list_params);
    $stmt->execute();
    $res = $stmt->get_result();
    $resources = [];
    while ($row = $res->fetch_assoc()) {
        $resources[] = [
            'id' => (string)$row['id'],
            'slug' => $row['slug'],
            'title' => $row['title'],
            'summary' => $row['summary'],
            'type' => $row['type'],
            'user_id' => (string)$row['user_id'],
            'author_name' => $row['author_name'],
            'cover_image' => $row['cover_image'],
            'downloads_count' => (int)$row['downloads_count'],
            'followers_count' => (int)$row['followers_count'],
            'rating_avg' => (float)$row['rating_avg'],
            'rating_count' => (int)$row['rating_count'],
            'status' => $row['status'],
            'featured' => (bool)$row['featured'],
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at'],
        ];
    }
    $stmt->close();

    json_response([
        'success' => true,
        'resources' => $resources,
        'total' => $total,
        'page' => $p['page'],
        'size' => $p['size'],
    ]);
}

// POST/PUT/DELETE：修改资源
$input = get_input_json();
$resource_id = (int)($input['resource_id'] ?? ($_GET['resource_id'] ?? 0));
if ($resource_id <= 0) {
    json_response(['success' => false, 'error' => '缺少 resource_id'], 400);
}

$stmt = $db->prepare('SELECT id, slug, title, status, featured FROM resources WHERE id = ? LIMIT 1');
$stmt->bind_param('i', $resource_id);
$stmt->execute();
$res = $stmt->get_result();
$target = $res->fetch_assoc();
$stmt->close();
if (!$target) {
    json_response(['success' => false, 'error' => '资源不存在'], 404);
}

$action = $input['action'] ?? '';
$detail_notes = [];

if ($action === 'set_status') {
    $new_status = $input['status'] ?? '';
    if (!in_array($new_status, ['published', 'pending', 'draft', 'removed'], true)) {
        json_response(['success' => false, 'error' => '无效状态'], 400);
    }
    $stmt = $db->prepare('UPDATE resources SET status = ? WHERE id = ?');
    $stmt->bind_param('si', $new_status, $resource_id);
    $stmt->execute();
    $stmt->close();
    $detail_notes[] = "状态更新为 $new_status";
} elseif ($action === 'set_featured') {
    $new_featured = !empty($input['featured']) ? 1 : 0;
    $stmt = $db->prepare('UPDATE resources SET featured = ? WHERE id = ?');
    $stmt->bind_param('ii', $new_featured, $resource_id);
    $stmt->execute();
    $stmt->close();
    $detail_notes[] = $new_featured ? '设为精选' : '取消精选';
} elseif ($action === 'delete_resource') {
    // 物理删除资源（含子表）
    $db->begin_transaction();
    try {
        // 先获取版本 ID 列表
        $version_ids = [];
        $stmt = $db->prepare('SELECT id FROM resource_versions WHERE resource_id = ?');
        $stmt->bind_param('i', $resource_id);
        $stmt->execute();
        $res = $stmt->get_result();
        while ($row = $res->fetch_assoc()) {
            $version_ids[] = (int)$row['id'];
        }
        $stmt->close();

        if (!empty($version_ids)) {
            $in = implode(',', array_fill(0, count($version_ids), '?'));
            $types = str_repeat('i', count($version_ids));
            foreach (['resource_files', 'resource_version_loaders', 'resource_version_mc_versions'] as $table) {
                $stmt = $db->prepare("DELETE FROM $table WHERE version_id IN ($in)");
                $stmt->bind_param($types, ...$version_ids);
                $stmt->execute();
                $stmt->close();
            }
        }
        foreach (['resource_tags', 'resource_gallery', 'resource_dependencies', 'resource_comments', 'resource_follows'] as $table) {
            $stmt = $db->prepare("DELETE FROM $table WHERE resource_id = ?");
            $stmt->bind_param('i', $resource_id);
            $stmt->execute();
            $stmt->close();
        }
        $stmt = $db->prepare('DELETE FROM resource_versions WHERE resource_id = ?');
        $stmt->bind_param('i', $resource_id);
        $stmt->execute();
        $stmt->close();
        $stmt = $db->prepare('DELETE FROM resources WHERE id = ?');
        $stmt->bind_param('i', $resource_id);
        $stmt->execute();
        $stmt->close();
        $db->commit();
        $detail_notes[] = '物理删除资源及所有子表数据';
    } catch (Exception $e) {
        $db->rollback();
        json_response(['success' => false, 'error' => '删除失败：' . $e->getMessage()], 500);
    }
} else {
    json_response(['success' => false, 'error' => '未知 action'], 400);
}

log_admin_action($db, $admin_id, $action, 'resource', $resource_id, implode('; ', $detail_notes) . ' (target: ' . $target['title'] . ')');

json_response([
    'success' => true,
    'resource_id' => (string)$resource_id,
]);
