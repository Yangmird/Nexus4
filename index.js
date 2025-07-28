import express from 'express';
import cors from 'cors';

import {router as portfolioRoutes} from './server/routes/portfolioRoutes.js';


const app = express();
app.use(cors());
app.use(express.json());


// 挂载路由
app.use('/api', portfolioRoutes);

const PORT = 8082;
app.listen(PORT, () => {
  console.log(`服务器已启动：http://localhost:${PORT}`);
});