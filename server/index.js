// // 服务器入口文件
// import express from 'express';
// // import ViteExpress from 'vite-express';
// // import { fileURLToPath } from 'url';
// import { dirname } from 'path';

// // const __filename = fileURLToPath(import.meta.url);
// // const __dirname = dirname(__filename);

// const app = express();

// // API路由
// app.get('/api/hello', (req, res) => {
//   res.json({ message: '欢迎使用Vite+Express模板' });
// });

// // 启动服务器，集成Vite
// const PORT = process.env.PORT || 3000;
// ViteExpress.listen(app, PORT, () => {
//   console.log(`服务器运行在 http://localhost:${PORT}`);
// });


// server.js
import express from 'express';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();

// 提供静态资源服务（test 文件夹）
app.use(express.static(resolve(__dirname, '../test')));

// API 示例
app.get('/api/hello', (req, res) => {
  res.json({ message: '欢迎使用 Express 模板' });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});