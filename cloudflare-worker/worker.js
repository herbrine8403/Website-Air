/**
 * Air 启动器 Cloudflare Worker 反向代理
 *
 * 作用：
 *   将启动器与官网对 InfinityFree API 的请求反向代理到 https://newamethyst.ct.ws
 *   绕过 InfinityFree 浏览器安全系统对非浏览器客户端的拦截。
 *
 * 部署步骤：
 *   1. 注册 Cloudflare 账号：https://dash.cloudflare.com/sign-up
 *   2. 进入 Workers & Pages → Create application → Create Worker
 *   3. 命名 Worker（例如 website-air），点击 Deploy
 *   4. 编辑 Worker 代码，粘贴本文件全部内容，Save and Deploy
 *   5. 测试访问 https://<worker-name>.<account-subdomain>.workers.dev/api/announcements.php
 *      应返回 JSON 公告数据
 *   6. 将 Worker 域名填入启动器 4 处 URL（PLPreferences.m、AnnouncementService.m、
 *      AnalyticsService.m、AnalyticsStatsViewController.m）和官网 StatsPage.tsx
 *   7. 若将来购买自定义域名，可在 Cloudflare Workers → Triggers → Custom Domains 绑定，
 *      然后全局替换代码中的 Worker 域名即可
 *
 * 免费额度：
 *   - 10 万请求/天（约 300 万/月），1000 DAU + 5 分钟心跳实际用量约 13000/天，余量充足
 *   - 10ms CPU/请求，简单转发场景下 CPU 占用极低
 */

const BACKEND_HOST = 'newamethyst.ct.ws';
const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, User-Agent',
};

export default {
  async fetch(request) {
    // 处理 OPTIONS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    const url = new URL(request.url);
    // 保留原 path 和 query，仅替换 host
    const targetUrl = `https://${BACKEND_HOST}${url.pathname}${url.search}`;

    // 构造转发请求头：复制原请求头 + 强制浏览器 UA + 补充 Accept 头
    const forwardHeaders = new Headers(request.headers);
    forwardHeaders.set('User-Agent', BROWSER_UA);
    forwardHeaders.set('Accept', 'application/json, text/html;q=0.9, */*;q=0.8');
    forwardHeaders.set('Accept-Language', 'zh-CN,zh;q=0.9,en;q=0.8');
    // 移除可能引发 InfinityFree 拒绝的 Origin/Referer（Worker 转发时不需要）
    forwardHeaders.delete('Origin');
    forwardHeaders.delete('Referer');
    // 移除 Cloudflare 自动添加的头，避免后端困惑
    forwardHeaders.delete('CF-Connecting-IP');
    forwardHeaders.delete('CF-IPCountry');
    forwardHeaders.delete('CF-Ray');
    forwardHeaders.delete('CF-Visitor');

    const fetchOptions = {
      method: request.method,
      headers: forwardHeaders,
    };

    // POST/PUT 等带 body 的请求转发 body
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      fetchOptions.body = await request.text();
    }

    try {
      const upstreamResponse = await fetch(targetUrl, fetchOptions);

      // 复制原响应头，追加 CORS 头
      const responseHeaders = new Headers(upstreamResponse.headers);
      for (const [key, value] of Object.entries(CORS_HEADERS)) {
        responseHeaders.set(key, value);
      }

      return new Response(upstreamResponse.body, {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        headers: responseHeaders,
      });
    } catch (err) {
      // 上游网络错误（DNS、连接超时等）
      return new Response(JSON.stringify({
        error: 'Worker upstream fetch failed',
        message: String(err),
      }), {
        status: 502,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          ...CORS_HEADERS,
        },
      });
    }
  },
};
