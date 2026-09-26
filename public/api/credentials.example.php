<?php
/**
 * 敏感凭据模板：复制为 credentials.php 并填入真实值。
 * credentials.php 已被 .gitignore 忽略，不会进入版本库。
 * 部署时需要把 credentials.php 一并上传到服务器 public/api/ 目录。
 */
return [
    'DB_HOST' => 'your_db_host',
    'DB_NAME' => 'your_db_name',
    'DB_USER' => 'your_db_user',
    'DB_PASS' => 'your_db_password',

    'JWT_SECRET' => 'change_me_to_a_random_32_chars_string',

    'GITHUB_CLIENT_SECRET' => 'your_github_oauth_client_secret',

    'TOS_ACCESS_KEY' => 'your_tos_access_key',
    'TOS_SECRET_KEY' => 'your_tos_secret_key',
];
