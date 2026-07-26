/**
 * Air 启动器 Vercel Serverless 反向代理
 *
 * 作用：
 *   将启动器与官网对 InfinityFree API 的请求反向代理到 https://newamethyst.ct.ws
 *   绕过 InfinityFree 浏览器安全系统对非浏览器客户端的拦截。
 *
 * 部署步骤：
 *   1. 注册 Vercel 账号：https://vercel.com/signup（支持 GitHub 登录）
 *   2. Add New Project → Import Git Repository → 选择 Website-Air 仓库
 *   3. Framework Preset 选 Vite（自动检测），其他默认，Deploy
 *   4. 部署完成后进入项目 Settings → General → Project Name 改为 air-api
 *   5. 访问 https://air-api.vercel.app/api/announcements.php 验证返回 JSON
 *   6. 将 Vercel 域名填入启动器 4 处 URL 和官网 StatsPage.tsx
 *   7. 若将来购买自定义域名，可在 Vercel → Settings → Domains 绑定，
 *      然后全局替换代码中的 air-api.vercel.app 即可
 *
 * 路由设计：
 *   使用 Vercel catch-all route `api/[...path].js`，匹配所有 /api/* 请求
 *   例如 /api/announcements.php → req.query.path = ['announcements.php']
 *   再拼接到 InfinityFree 后端：https://newamethyst.ct.ws/api/announcements.php
 *
 * 免费额度：
 *   - 100 万次 Serverless Function 调用/月
 *   - 100 GB-hours 资源
 *   - 1000 DAU + 5 分钟心跳约 39 万次/月，余量充足
 */

const BACKEND_HOST = 'newamethyst.ct.ws';
const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, User-Agent',
};

export default async function handler(req, res) {
  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  // catch-all route：req.query.path 是路径段数组
  // 例如 /api/announcements.php → ['announcements.php']
  // 例如 /api/sub/foo.php → ['sub', 'foo.php']
  const pathSegments = Array.isArray(req.query.path) ? req.query.path : [req.query.path];
  const path = pathSegments.filter(Boolean).join('/');
  if (!path) {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS });
    res.end(JSON.stringify({ error: 'Missing path' }));
    return;
  }

  const targetUrl = `https://${BACKEND_HOST}/api/${path}${req.url.includes('?') ? '?' + req.url.split('?')[1] : ''}`;

  // 构造转发请求头
  const forwardHeaders = {
    'User-Agent': BROWSER_UA,
    'Accept': 'application/json, text/html;q=0.9, */*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  };
  if (req.headers['content-type']) {
    forwardHeaders['Content-Type'] = req.headers['content-type'];
  }

  const fetchOptions = {
    method: req.method,
    headers: forwardHeaders,
  };

  // POST/PUT/PATCH 等带 body 的请求转发 body
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
    fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  }

  try {
    const upstreamResponse = await fetch(targetUrl, fetchOptions);
    const responseBody = await upstreamResponse.text();

    // 复制原响应头，追加 CORS 头
    const responseHeaders = {
      'Content-Type': upstreamResponse.headers.get('content-type') || 'application/json; charset=utf-8',
      ...CORS_HEADERS,
    };

    res.writeHead(upstreamResponse.status, responseHeaders);
    res.end(responseBody);
  } catch (err) {
    res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS });
    res.end(
      JSON.stringify({
        error: 'Vercel upstream fetch failed',
        message: String(err),
      })
    );
  }
}
