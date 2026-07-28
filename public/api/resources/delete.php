<?php
// 删除资源 API - 需要登录
// 接收 ?id=xxx
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

$user_id = require_auth();

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
    json_response(['success' => false, 'error' => '无权操作：仅所有者可删除'], 403);
}

$db->begin_transaction();

try {
    // 收集所有 version_id
    $version_ids = [];
    $v_stmt = $db->prepare('SELECT id FROM resource_versions WHERE resource_id = ?');
    $v_stmt->bind_param('i', $resource_id);
    $v_stmt->execute();
    $v_res = $v_stmt->get_result();
    while ($v_row = $v_res->fetch_assoc()) {
        $version_ids[] = (int)$v_row['id'];
    }
    $v_stmt->close();

    // 删除 resource_files（按 version_id）
    if (!empty($version_ids)) {
        $placeholders = implode(',', array_fill(0, count($version_ids), '?'));
        $types = str_repeat('i', count($version_ids));
        $f_stmt = $db->prepare("DELETE FROM resource_files WHERE version_id IN ($placeholders)");
        $f_stmt->bind_param($types, ...$version_ids);
        $f_stmt->execute();
        $f_stmt->close();

        // 删除 resource_version_loaders
        $vl_stmt = $db->prepare("DELETE FROM resource_version_loaders WHERE version_id IN ($placeholders)");
        $vl_stmt->bind_param($types, ...$version_ids);
        $vl_stmt->execute();
        $vl_stmt->close();

        // 删除 resource_version_mc_versions
        $mv_stmt = $db->prepare("DELETE FROM resource_version_mc_versions WHERE version_id IN ($placeholders)");
        $mv_stmt->bind_param($types, ...$version_ids);
        $mv_stmt->execute();
        $mv_stmt->close();
    }

    // 删除 resource_versions
    $rv_stmt = $db->prepare('DELETE FROM resource_versions WHERE resource_id = ?');
    $rv_stmt->bind_param('i', $resource_id);
    $rv_stmt->execute();
    $rv_stmt->close();

    // 删除 resource_tags
    $t_stmt = $db->prepare('DELETE FROM resource_tags WHERE resource_id = ?');
    $t_stmt->bind_param('i', $resource_id);
    $t_stmt->execute();
    $t_stmt->close();

    // 删除 resource_gallery
    $g_stmt = $db->prepare('DELETE FROM resource_gallery WHERE resource_id = ?');
    $g_stmt->bind_param('i', $resource_id);
    $g_stmt->execute();
    $g_stmt->close();

    // 删除 resource_dependencies
    $d_stmt = $db->prepare('DELETE FROM resource_dependencies WHERE resource_id = ?');
    $d_stmt->bind_param('i', $resource_id);
    $d_stmt->execute();
    $d_stmt->close();

    // 删除 resource_comments
    $c_stmt = $db->prepare('DELETE FROM resource_comments WHERE resource_id = ?');
    $c_stmt->bind_param('i', $resource_id);
    $c_stmt->execute();
    $c_stmt->close();

    // 删除 resource_follows
    $fl_stmt = $db->prepare('DELETE FROM resource_follows WHERE resource_id = ?');
    $fl_stmt->bind_param('i', $resource_id);
    $fl_stmt->execute();
    $fl_stmt->close();

    // 删除 resources 主表
    $r_stmt = $db->prepare('DELETE FROM resources WHERE id = ?');
    $r_stmt->bind_param('i', $resource_id);
    $r_stmt->execute();
    $r_stmt->close();

    $db->commit();
} catch (Exception $e) {
    $db->rollback();
    json_response(['success' => false, 'error' => '删除资源失败：' . $e->getMessage()], 500);
}

json_response(['success' => true]);
