<?php
require_once __DIR__ . '/config.php';

$db = getDBConnection();

// 在线用户数（5分钟内活跃）
$result = $db->query("SELECT COUNT(*) as cnt FROM devices WHERE last_seen >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)");
$onlineUsers = $result ? intval($result->fetch_assoc()['cnt']) : 0;

// 总用户数
$result = $db->query("SELECT COUNT(*) as cnt FROM devices");
$totalUsers = $result ? intval($result->fetch_assoc()['cnt']) : 0;

// MC 启动总次数
$result = $db->query("SELECT SUM(total_mc_launches) as total FROM devices");
$totalMcLaunches = $result ? intval($result->fetch_assoc()['total'] ?? 0) : 0;

// 崩溃总次数
$result = $db->query("SELECT SUM(total_crashes) as total FROM devices");
$totalCrashes = $result ? intval($result->fetch_assoc()['total'] ?? 0) : 0;

// 游戏总时长（小时）
$result = $db->query("SELECT SUM(total_play_time_seconds) as total FROM devices");
$totalPlayTimeHours = $result ? round(intval($result->fetch_assoc()['total'] ?? 0) / 3600, 1) : 0;

// 启动器开启次数
$result = $db->query("SELECT SUM(launcher_opens) as total FROM devices");
$launcherOpens = $result ? intval($result->fetch_assoc()['total'] ?? 0) : 0;

// 设备型号分布
$deviceModels = [];
$result = $db->query("SELECT device_model, device_model_label, COUNT(*) as cnt FROM devices WHERE device_model != '' GROUP BY device_model ORDER BY cnt DESC");
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $deviceModels[] = ['model' => $row['device_model'], 'count' => intval($row['cnt']), 'label' => $row['device_model_label'] ?: $row['device_model']];
    }
}

// iOS 版本分布
$iosVersions = [];
$result = $db->query("SELECT ios_version, COUNT(*) as cnt FROM devices WHERE ios_version != '' GROUP BY ios_version ORDER BY cnt DESC");
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $iosVersions[] = ['version' => $row['ios_version'], 'count' => intval($row['cnt'])];
    }
}

// 启动器版本分布
$launcherVersions = [];
$result = $db->query("SELECT launcher_version, COUNT(*) as cnt FROM devices WHERE launcher_version != '' GROUP BY launcher_version ORDER BY cnt DESC");
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $launcherVersions[] = ['version' => $row['launcher_version'], 'count' => intval($row['cnt'])];
    }
}

// 越狱状态分布
$jailbreakDistribution = [];
$result = $db->query("SELECT jailbreak_status, COUNT(*) as cnt FROM devices GROUP BY jailbreak_status ORDER BY cnt DESC");
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $jailbreakDistribution[] = ['status' => $row['jailbreak_status'] ?: 'none', 'count' => intval($row['cnt'])];
    }
}

// 原版 Amethyst 安装数
$result = $db->query("SELECT COUNT(*) as cnt FROM devices WHERE has_original_amethyst = 1");
$originalAmethystInstalled = $result ? intval($result->fetch_assoc()['cnt']) : 0;

// MC 各版本统计
$mcVersionStats = [];
$result = $db->query("SELECT mc_version, SUM(launch_count) as total_launches, SUM(play_time_seconds) as total_play, SUM(crash_count) as total_crashes FROM mc_version_usage GROUP BY mc_version ORDER BY total_launches DESC");
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $mcVersionStats[] = [
            'version' => $row['mc_version'],
            'launch_count' => intval($row['total_launches']),
            'play_time_hours' => round(intval($row['total_play']) / 3600, 1),
            'crash_count' => intval($row['total_crashes'])
        ];
    }
}

// 近期崩溃统计（最近7天，按 crash_type + mc_version + device_model 聚合）
// 为兼容不支持 JSON_EXTRACT 的 MySQL，先取原始 event_data 再用 PHP json_decode 聚合
$recentCrashes = [];
$result = $db->query("SELECT event_data FROM launcher_events WHERE event_type = 'crash' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)");
if ($result) {
    $agg = [];
    while ($row = $result->fetch_assoc()) {
        $decoded = json_decode($row['event_data'], true);
        if (!is_array($decoded)) {
            $decoded = [];
        }
        $crashType = $decoded['crash_type'] ?? 'Unknown';
        $mcVersion = $decoded['mc_version'] ?? '';
        $deviceModel = $decoded['device_model'] ?? '';
        $key = $crashType . '||' . $mcVersion . '||' . $deviceModel;
        if (!isset($agg[$key])) {
            $agg[$key] = [
                'crash_type' => $crashType,
                'mc_version' => $mcVersion,
                'device_model' => $deviceModel,
                'count' => 0,
            ];
        }
        $agg[$key]['count']++;
    }
    // 按次数降序，取前 20
    usort($agg, function ($a, $b) {
        return $b['count'] <=> $a['count'];
    });
    $recentCrashes = array_slice(array_map(function ($item) {
        return [
            'crash_type' => $item['crash_type'],
            'mc_version' => $item['mc_version'],
            'device_model' => $item['device_model'],
            'count' => intval($item['count']),
        ];
    }, $agg), 0, 20);
}

echo json_encode([
    'online_users' => $onlineUsers,
    'total_users' => $totalUsers,
    'total_mc_launches' => $totalMcLaunches,
    'total_crashes' => $totalCrashes,
    'total_play_time_hours' => $totalPlayTimeHours,
    'launcher_opens' => $launcherOpens,
    'device_models' => $deviceModels,
    'ios_versions' => $iosVersions,
    'launcher_versions' => $launcherVersions,
    'jailbreak_distribution' => $jailbreakDistribution,
    'original_amethyst_installed' => $originalAmethystInstalled,
    'mc_version_stats' => $mcVersionStats,
    'recent_crashes' => $recentCrashes,
    'last_updated' => gmdate('Y-m-d\TH:i:s\Z')
], JSON_UNESCAPED_UNICODE);
