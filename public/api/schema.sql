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

-- ===== 用户与会话表 =====

-- 用户主表：存储账号信息，支持邮箱密码与 GitHub OAuth 登录
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(32) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    password_enabled BOOLEAN DEFAULT TRUE,
    github_id BIGINT,
    github_username VARCHAR(64),
    bilibili_username VARCHAR(64),
    avatar_url VARCHAR(512),
    bio TEXT,
    email_verified BOOLEAN DEFAULT TRUE,
    role VARCHAR(16) DEFAULT 'user',
    is_admin BOOLEAN DEFAULT FALSE,
    status VARCHAR(16) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login_at DATETIME,
    INDEX idx_github_id (github_id),
    INDEX idx_status (status),
    INDEX idx_is_admin (is_admin)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 管理员审计日志表：记录所有管理员操作
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    admin_id BIGINT NOT NULL,
    action VARCHAR(64) NOT NULL,
    target_type VARCHAR(32),
    target_id BIGINT,
    detail MEDIUMTEXT,
    ip VARCHAR(64),
    user_agent VARCHAR(512),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_admin (admin_id),
    INDEX idx_action (action),
    INDEX idx_target (target_type, target_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 用户会话表：管理 refresh token，支持多设备登录与踢出
CREATE TABLE IF NOT EXISTS user_sessions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    refresh_token_hash VARCHAR(255) NOT NULL,
    ip VARCHAR(64),
    user_agent VARCHAR(512),
    last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    INDEX idx_user (user_id),
    INDEX idx_token (refresh_token_hash),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 个人访问令牌（PAT）：用于 API 调用鉴权，替代 JWT 长期凭证
CREATE TABLE IF NOT EXISTS pat_tokens (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(64),
    token_hash VARCHAR(255) NOT NULL,
    scopes VARCHAR(255),
    last_used_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    INDEX idx_user (user_id),
    INDEX idx_token (token_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== 资源表 =====

-- 资源主表：Mod / 整合包 / 光影 / 材质包 / 世界 / 启动器等
CREATE TABLE IF NOT EXISTS resources (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(128) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    summary VARCHAR(512),
    description MEDIUMTEXT,
    type VARCHAR(32) NOT NULL,
    user_id BIGINT NOT NULL,
    cover_image VARCHAR(512),
    downloads_count INT DEFAULT 0,
    followers_count INT DEFAULT 0,
    rating_avg DECIMAL(3,2) DEFAULT 0,
    rating_count INT DEFAULT 0,
    license VARCHAR(64),
    status VARCHAR(16) DEFAULT 'published',
    featured BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_type (type),
    INDEX idx_status (status),
    INDEX idx_featured (featured),
    INDEX idx_created (created_at),
    INDEX idx_downloads (downloads_count)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 资源标签表：tag_type 可为 category/loader/game_version/environment/ios
CREATE TABLE IF NOT EXISTS resource_tags (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    resource_id BIGINT NOT NULL,
    tag_type VARCHAR(32) NOT NULL,
    tag_value VARCHAR(64) NOT NULL,
    UNIQUE KEY unique_resource_tag (resource_id, tag_type, tag_value),
    INDEX idx_resource (resource_id),
    INDEX idx_tag (tag_type, tag_value)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 资源版本表：每个资源可发布多个版本
CREATE TABLE IF NOT EXISTS resource_versions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    resource_id BIGINT NOT NULL,
    version_number VARCHAR(64) NOT NULL,
    version_type VARCHAR(16) DEFAULT 'release',
    changelog MEDIUMTEXT,
    downloads_count INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_resource (resource_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 资源版本加载器关联表：版本与 loader 的多对多关系
CREATE TABLE IF NOT EXISTS resource_version_loaders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    version_id BIGINT NOT NULL,
    loader VARCHAR(32) NOT NULL,
    UNIQUE KEY unique_version_loader (version_id, loader),
    INDEX idx_version (version_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 资源版本 MC 版本关联表：版本支持的 MC 版本
CREATE TABLE IF NOT EXISTS resource_version_mc_versions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    version_id BIGINT NOT NULL,
    mc_version VARCHAR(32) NOT NULL,
    UNIQUE KEY unique_version_mc (version_id, mc_version),
    INDEX idx_version (version_id),
    INDEX idx_mc (mc_version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 资源文件表：source_type 可为 modrinth/curseforge/github/air
CREATE TABLE IF NOT EXISTS resource_files (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    version_id BIGINT NOT NULL,
    source_type VARCHAR(16) NOT NULL,
    source_url VARCHAR(512),
    file_path VARCHAR(512),
    file_size BIGINT,
    file_name VARCHAR(255),
    downloads_count INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_version (version_id),
    INDEX idx_source (source_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 资源画廊表：资源详情页展示的截图集合
CREATE TABLE IF NOT EXISTS resource_gallery (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    resource_id BIGINT NOT NULL,
    image_url VARCHAR(512) NOT NULL,
    caption VARCHAR(255),
    sort_order INT DEFAULT 0,
    INDEX idx_resource (resource_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 资源依赖表：声明资源运行所需的其他 Mod / 加载器 / 库
CREATE TABLE IF NOT EXISTS resource_dependencies (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    resource_id BIGINT NOT NULL,
    dep_type VARCHAR(32),
    dep_name VARCHAR(255),
    dep_version VARCHAR(64),
    dep_url VARCHAR(512),
    INDEX idx_resource (resource_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 资源评论表：支持楼中楼回复（parent_id 自关联）与评分
CREATE TABLE IF NOT EXISTS resource_comments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    resource_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    parent_id BIGINT,
    content MEDIUMTEXT NOT NULL,
    rating TINYINT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_resource (resource_id),
    INDEX idx_user (user_id),
    INDEX idx_parent (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 资源关注表：用户关注资源以接收更新通知
CREATE TABLE IF NOT EXISTS resource_follows (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    resource_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_resource_follower (resource_id, user_id),
    INDEX idx_resource (resource_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== 论坛表 =====

-- 话题表：论坛讨论帖，支持回复、关注、投票
CREATE TABLE IF NOT EXISTS forum_topics (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content MEDIUMTEXT NOT NULL,
    user_id BIGINT NOT NULL,
    category VARCHAR(32),
    views_count INT DEFAULT 0,
    replies_count INT DEFAULT 0,
    followers_count INT DEFAULT 0,
    status VARCHAR(16) DEFAULT 'published',
    featured BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_reply_at DATETIME,
    INDEX idx_user (user_id),
    INDEX idx_category (category),
    INDEX idx_status (status),
    INDEX idx_created (created_at),
    INDEX idx_last_reply (last_reply_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 文章表：长文形式内容，带封面与摘要
CREATE TABLE IF NOT EXISTS forum_articles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content MEDIUMTEXT NOT NULL,
    summary VARCHAR(512),
    cover_image VARCHAR(512),
    user_id BIGINT NOT NULL,
    views_count INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    followers_count INT DEFAULT 0,
    status VARCHAR(16) DEFAULT 'published',
    featured BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_status (status),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 问题表：问答型帖子，支持悬赏与采纳最佳答案
CREATE TABLE IF NOT EXISTS forum_questions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content MEDIUMTEXT NOT NULL,
    user_id BIGINT NOT NULL,
    tags VARCHAR(255),
    bounty INT DEFAULT 0,
    views_count INT DEFAULT 0,
    answers_count INT DEFAULT 0,
    followers_count INT DEFAULT 0,
    has_accepted BOOLEAN DEFAULT FALSE,
    status VARCHAR(16) DEFAULT 'published',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_status (status),
    INDEX idx_has_accepted (has_accepted),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 回答表：问题的回答，支持投票与采纳
CREATE TABLE IF NOT EXISTS forum_answers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    question_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    content MEDIUMTEXT NOT NULL,
    votes_up INT DEFAULT 0,
    votes_down INT DEFAULT 0,
    is_accepted BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_question (question_id),
    INDEX idx_user (user_id),
    INDEX idx_accepted (is_accepted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 回复表：target_type 可为 topic/article，支持楼中楼
CREATE TABLE IF NOT EXISTS forum_replies (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    target_type VARCHAR(16) NOT NULL,
    target_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    parent_id BIGINT,
    content MEDIUMTEXT NOT NULL,
    votes_up INT DEFAULT 0,
    votes_down INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_target (target_type, target_id),
    INDEX idx_user (user_id),
    INDEX idx_parent (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 论坛标签表：全局标签字典，usage_count 维护使用计数
CREATE TABLE IF NOT EXISTS forum_tags (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(32) NOT NULL UNIQUE,
    description VARCHAR(255),
    usage_count INT DEFAULT 0,
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 投票表：target_type 可为 topic/article/question/answer/reply，value=1 或 -1
CREATE TABLE IF NOT EXISTS forum_votes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    target_type VARCHAR(16) NOT NULL,
    target_id BIGINT NOT NULL,
    value TINYINT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_vote (user_id, target_type, target_id),
    INDEX idx_target (target_type, target_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 关注表：target_type 可为 topic/article/question
CREATE TABLE IF NOT EXISTS forum_follows (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    target_type VARCHAR(16) NOT NULL,
    target_id BIGINT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_follow (user_id, target_type, target_id),
    INDEX idx_target (target_type, target_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== 消息表 =====

-- 通知表：type 可为 resource_comment/forum_reply/system/follow
CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    type VARCHAR(32) NOT NULL,
    title VARCHAR(255),
    content VARCHAR(512),
    source_type VARCHAR(32),
    source_id BIGINT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_is_read (is_read),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 私信会话表：user1_id < user2_id 保证唯一性
CREATE TABLE IF NOT EXISTS inbox_conversations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user1_id BIGINT NOT NULL,
    user2_id BIGINT NOT NULL,
    last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_pair (user1_id, user2_id),
    INDEX idx_user1 (user1_id),
    INDEX idx_user2 (user2_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 私信消息表：会话内的具体消息
CREATE TABLE IF NOT EXISTS inbox_messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    conversation_id BIGINT NOT NULL,
    sender_id BIGINT NOT NULL,
    content MEDIUMTEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_conversation (conversation_id),
    INDEX idx_sender (sender_id),
    INDEX idx_is_read (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== 管理员控制台迁移（已有部署升级用） =====
-- 说明：MySQL 8.0.29 以下版本和 phpMyAdmin sql-parser 不支持
--       ALTER TABLE ... ADD COLUMN IF NOT EXISTS 语法，
--       因此使用存储过程进行幂等迁移，可重复执行。

DELIMITER //
DROP PROCEDURE IF EXISTS migrate_add_is_admin//
CREATE PROCEDURE migrate_add_is_admin()
BEGIN
    -- 1. 检查并添加 is_admin 列
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'users'
          AND COLUMN_NAME = 'is_admin'
    ) THEN
        ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE AFTER role;
    END IF;

    -- 2. 检查并添加 idx_is_admin 索引
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'users'
          AND INDEX_NAME = 'idx_is_admin'
    ) THEN
        ALTER TABLE users ADD INDEX idx_is_admin (is_admin);
    END IF;
END//
DELIMITER ;

CALL migrate_add_is_admin();
DROP PROCEDURE IF EXISTS migrate_add_is_admin;

-- 给邮箱为 weishixvn@outlook.com 的用户预置管理员
UPDATE users SET is_admin = 1 WHERE email = 'weishixvn@outlook.com';
