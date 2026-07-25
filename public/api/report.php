<?php
require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$json = file_get_contents('php://input');
$data = json_decode($json, true);

if (!$data || !isset($data['device_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid request body']);
    exit;
}

$db = getDBConnection();
$deviceId = $db->real_escape_string($data['device_id']);
$action = $data['action'] ?? 'heartbeat';

if ($action === 'crash') {
    // 崩溃上报
    $crashType = $db->real_escape_string($data['crash_type'] ?? 'Unknown');
    $crashStack = $db->real_escape_string($data['crash_stack'] ?? '');
    $mcVersion = $db->real_escape_string($data['mc_version'] ?? '');
    $deviceModel = $db->real_escape_string($data['device_model'] ?? '');
    $iosVersion = $db->real_escape_string($data['ios_version'] ?? '');
    $launcherVersion = $db->real_escape_string($data['launcher_version'] ?? '');

    $eventData = json_encode([
        'crash_type' => $crashType,
        'crash_stack' => $crashStack,
        'mc_version' => $mcVersion,
        'device_model' => $deviceModel,
        'ios_version' => $iosVersion,
        'launcher_version' => $launcherVersion
    ], JSON_UNESCAPED_UNICODE);

    $db->query("INSERT INTO launcher_events (device_id, event_type, event_data) VALUES ('$deviceId', 'crash', '" . $db->real_escape_string($eventData) . "')");

    // 递增崩溃计数
    $db->query("INSERT INTO devices (device_id, total_crashes, is_online) VALUES ('$deviceId', 1, TRUE) ON DUPLICATE KEY UPDATE total_crashes = total_crashes + 1, is_online = TRUE, last_seen = NOW()");

    // 递增 MC 版本崩溃计数
    if (!empty($mcVersion)) {
        $db->query("INSERT INTO mc_version_usage (device_id, mc_version, crash_count) VALUES ('$deviceId', '$mcVersion', 1) ON DUPLICATE KEY UPDATE crash_count = crash_count + 1");
    }

    echo json_encode(['status' => 'ok']);
    exit;
}

// online / heartbeat / offline
$deviceModel = $db->real_escape_string($data['device_model'] ?? '');
$deviceModelLabel = $db->real_escape_string(deviceModelToLabel($data['device_model'] ?? ''));
$iosVersion = $db->real_escape_string($data['ios_version'] ?? '');
$launcherVersion = $db->real_escape_string($data['launcher_version'] ?? '');
$jailbreakStatus = $db->real_escape_string($data['jailbreak_status'] ?? 'none');
$hasOriginalAmethyst = !empty($data['has_original_amethyst']) ? 1 : 0;
$totalMcLaunches = intval($data['total_mc_launches'] ?? 0);
$totalCrashes = intval($data['total_crashes'] ?? 0);
$launcherOpens = intval($data['launcher_opens'] ?? 0);
$totalPlayTime = intval($data['total_play_time_seconds'] ?? 0);
$isOnline = ($action !== 'offline') ? 1 : 0;

// 更新 devices 表
$db->query("INSERT INTO devices (device_id, device_model, device_model_label, ios_version, launcher_version, jailbreak_status, has_original_amethyst, total_mc_launches, total_crashes, launcher_opens, total_play_time_seconds, is_online, first_seen, last_seen) VALUES ('$deviceId', '$deviceModel', '$deviceModelLabel', '$iosVersion', '$launcherVersion', '$jailbreakStatus', $hasOriginalAmethyst, $totalMcLaunches, $totalCrashes, $launcherOpens, $totalPlayTime, $isOnline, NOW(), NOW()) ON DUPLICATE KEY UPDATE device_model = VALUES(device_model), device_model_label = VALUES(device_model_label), ios_version = VALUES(ios_version), launcher_version = VALUES(launcher_version), jailbreak_status = VALUES(jailbreak_status), has_original_amethyst = VALUES(has_original_amethyst), total_mc_launches = VALUES(total_mc_launches), total_crashes = VALUES(total_crashes), launcher_opens = VALUES(launcher_opens), total_play_time_seconds = VALUES(total_play_time_seconds), is_online = VALUES(is_online), last_seen = NOW()");

// 批量更新 mc_version_usage 表
if (!empty($data['mc_versions']) && is_array($data['mc_versions'])) {
    foreach ($data['mc_versions'] as $mc) {
        $ver = $db->real_escape_string($mc['version'] ?? '');
        $launchCount = intval($mc['launch_count'] ?? 0);
        $playTime = intval($mc['play_time_seconds'] ?? 0);
        $crashCount = intval($mc['crash_count'] ?? 0);
        if (empty($ver)) continue;

        $db->query("INSERT INTO mc_version_usage (device_id, mc_version, launch_count, play_time_seconds, crash_count, last_played) VALUES ('$deviceId', '$ver', $launchCount, $playTime, $crashCount, NOW()) ON DUPLICATE KEY UPDATE launch_count = VALUES(launch_count), play_time_seconds = VALUES(play_time_seconds), crash_count = VALUES(crash_count), last_played = NOW()");
    }
}

echo json_encode(['status' => 'ok']);
