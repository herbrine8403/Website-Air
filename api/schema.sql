-- 设备基础信息（每次心跳更新）
CREATE TABLE IF NOT EXISTS devices (
    device_id VARCHAR(64) PRIMARY KEY,
    device_model VARCHAR(32),
    device_model_label VARCHAR(64),
    ios_version VARCHAR(16),
    launcher_version VARCHAR(16),
    jailbreak_status VARCHAR(16) DEFAULT 'none',
    has_original_amethyst BOOLEAN DEFAULT FALSE,
    total_mc_launches INT DEFAULT 0,
    total_crashes INT DEFAULT 0,
    launcher_opens INT DEFAULT 0,
    total_play_time_seconds INT DEFAULT 0,
    is_online BOOLEAN DEFAULT FALSE,
    first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- MC 各版本启动次数和游戏时长
CREATE TABLE IF NOT EXISTS mc_version_usage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_id VARCHAR(64) NOT NULL,
    mc_version VARCHAR(32) NOT NULL,
    launch_count INT DEFAULT 0,
    play_time_seconds INT DEFAULT 0,
    crash_count INT DEFAULT 0,
    last_played DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_device_version (device_id, mc_version),
    INDEX idx_mc_version (mc_version)
);

-- 启动器事件日志（崩溃等）
CREATE TABLE IF NOT EXISTS launcher_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_id VARCHAR(64) NOT NULL,
    event_type VARCHAR(32) NOT NULL,
    event_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_device (device_id),
    INDEX idx_event_type (event_type)
);
