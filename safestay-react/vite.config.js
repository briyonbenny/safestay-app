import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/** Build-time API root; Vite proxy uses the same when set. */
function apiProxyTarget(env) {
  const base = String(env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '')
  if (base) {
    try {
      const u = new URL(base)
      const host = u.hostname === 'localhost' ? '127.0.0.1' : u.hostname
      const port = u.port || (u.protocol === 'https:' ? '443' : '80')
      return `${u.protocol}//${host}:${port}`
    } catch {
      /* fall through */
    }
  }
  return 'http://127.0.0.1:3000'
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = apiProxyTarget(env)

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          timeout: 120_000,
          configure(proxy) {
            proxy.on('proxyReq', (proxyReq, req) => {
              const c = req.headers.cookie;
              if (c) proxyReq.setHeader('Cookie', c);
            });
            proxy.on('proxyRes', (proxyRes) => {
              const cookies = proxyRes.headers['set-cookie'];
              if (!cookies) return;
              const list = Array.isArray(cookies) ? cookies : [cookies];
              proxyRes.headers['set-cookie'] = list.map((cookie) =>
                cookie.replace(/;\s*secure/gi, '')
              );
            });
          },
        },
      },
    },
  }
})
