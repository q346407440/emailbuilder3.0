import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import http from "node:http";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    /**
     * 显式绑定 IPv4 回环，避免默认 host `"localhost"` 在部分环境下只监听 `::1`，
     * 导致 `http://127.0.0.1:5180` 无法访问而 `http://localhost:5180` 仍可访问。
     */
    host: "127.0.0.1",
    /** 开发服务器直接读源码；禁用缓存减少「强刷仍像旧界面」的误判（迭代 UI 请始终用 dev，不要用未重建的 preview） */
    headers: {
      "Cache-Control": "no-store",
    },
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
        /** 多标签 + 多条 SSE 时避免代理连接池耗尽（兜底；开发态 fetch 默认直连 8787） */
        agent: new http.Agent({ keepAlive: true, maxSockets: 64 }),
      },
    },
  },
  preview: {
    /** preview 仍来自上次 build；此处禁用缓存，便于对照构建结果时刷新即拿到最新静态文件 */
    headers: {
      "Cache-Control": "no-store",
    },
  },
});
