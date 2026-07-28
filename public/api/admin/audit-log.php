<?php
require_once __DIR__ . '/../config.php';

// 仅允许 GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

$admin_id = require_admin();
$db = getDBConnection();

// 参数
$q = trim($_GET['q'] ?? '');
$action_filter = trim($_GET['action'] ?? '');
$target_type = trim($_GET['target_type'] ?? '');
$admin_filter = $_GET['admin_id'] ?? '';
$p = get_pagination_params();

$where = [];
$params = [];
$types = '';
if ($q !== '') {
    $where[] = '(al.detail LIKE ? OR al.action LIKE ? OR u.username LIKE ?)';
    $kw = '%' . $q . '%';
    $params[] = $kw; $params[] = $kw; $params[] = $kw;
    $types .= 'sss';
}
if ($action_filter !== '') {
    $where[] = 'al.action = ?';
    $params[] = $action_filter;
    $types .= 's';
}
if ($target_type !== '') {
    $where[] = 'al.target_type = ?';
    $params[] = $target_type;
    $types .= 's';
}
if ($admin_filter !== '') {
    $where[] = 'al.admin_id = ?';
    $params[] = (int)$admin_filter;
    $types .= 'i';
}
$where_sql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

// 总数
$sql = "SELECT COUNT(*) AS cnt FROM admin_audit_logs al LEFT JOIN users u ON u.id = al.admin_id $where_sql";
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
$sql = "SELECT al.id, al.admin_id, al.action, al.target_type, al.target_id, al.detail, al.ip, al.user_agent, al.created_at, u.username AS admin_username FROM admin_audit_logs al LEFT JOIN users u ON u.id = al.admin_id $where_sql ORDER BY al.created_at DESC LIMIT ? OFFSET ?";
$stmt = $db->prepare($sql);
$list_types = $types . 'ii';
$list_params = array_merge($params, [$p['size'], $p['offset']]);
$stmt->bind_param($list_types, ...$list_params);
$stmt->execute();
$res = $stmt->get_result();
$logs = [];
while ($row = $res->fetch_assoc()) {
    $logs[] = [
        'id' => (string)$row['id'],
        'admin_id' => (string)$row['admin_id'],
        'admin_username' => $row['admin_username'],
        'action' => $row['action'],
        'target_type' => $row['target_type'],
        'target_id' => $row['target_id'] ? (string)$row['target_id'] : null,
        'detail' => $row['detail'],
        'ip' => $row['ip'],
        'user_agent' => $row['user_agent'],
        'created_at' => $row['created_at'],
    ];
}
$stmt->close();

// 聚合：按 action 分组统计
$action_stats = [];
$sql = 'SELECT action, COUNT(*) AS cnt FROM admin_audit_logs WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY action ORDER BY cnt DESC';
$res = $db->query($sql);
if ($res) {
    while ($row = $res->fetch_assoc()) {
        $action_stats[] = ['action' => $row['action'], 'count' => (int)$row['cnt']];
    }
}

json_response([
    'success' => true,
    'logs' => $logs,
    'total' => $total,
    'page' => $p['page'],
    'size' => $p['size'],
    'action_stats_30d' => $action_stats,
]);
