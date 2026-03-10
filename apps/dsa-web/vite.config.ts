import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      react({
        babel: {
          plugins: [['babel-plugin-react-compiler']],
        },
      }),
    ],
    server: {
      host: '0.0.0.0',  // 允许公网访问
      port: 6060,       // 固定端口
      strictPort: true, // 端口被占用时直接退出，不尝试下一个可用端口
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://127.0.0.1:8000', // 默认回退到本地后端
          changeOrigin: true,
          // rewrite: (path) => path.replace(/^\/api/, ''), // 不再重写路径，直接转发 /api/...
        },
      },
    },
    build: {
      // 打包输出到项目根目录的 static 文件夹
      outDir: path.resolve(__dirname, '../../static'),
      emptyOutDir: true,
    },
  }
})
