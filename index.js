import express from 'express';
import cors from 'cors';
import { router as stockAssetsRouter } from './server/routes/stockAssetsRoute.js';
import { router as cashAssetsRouter } from './server/routes/cashAssetsRoute.js';
import { router as portfolioAssetsRouter } from './server/routes/portfolioAssets.js';
import { router as portfolioRoutes} from './server/routes/portfolioRoutes.js';
import { router as allAssetsRouter } from './server/routes/allAssetsRoute.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// 配置静态文件服务 - 提供前端页面访问
app.use(express.static(path.join(__dirname, 'client')));

// 挂载路由
app.use('/api', portfolioRoutes);
app.use('/api', stockAssetsRouter);
app.use('/api', cashAssetsRouter);
app.use('/api', portfolioAssetsRouter);
app.use('/api', allAssetsRouter);

// 设置根路径重定向到前端页面
app.get('/', (req, res) => {
  res.redirect('/index.html');
});

const PORT = 8088;

app.listen(PORT, () => {
  console.log(`服务器已启动：http://localhost:${PORT}`);
  console.log(`前端页面访问地址：http://localhost:${PORT}/index.html`);
});