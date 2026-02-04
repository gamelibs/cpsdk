
// server.js
import express from 'express';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();

// 提供静态资源服务（test 文件夹）
app.use(express.static(resolve(__dirname, '../')));

// API 示例
app.get('/api/hello', (req, res) => {
  res.json({ message: '欢迎使用 Express 模板' });
});

// 启动服务器
const PORT = process.env.PORT || 13600;
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});