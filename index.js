import express from 'express';
import cors from 'cors';
import { router as stockAssetsRouter } from './server/routes/stockAssetsRoute.js';
import { router as cashAssetsRouter } from './server/routes/cashAssetsRoute.js';
import { router as portfolioAssetsRouter } from './server/routes/portfolioAssets.js';
import { router as portfolioRoutes} from './server/routes/portfolioRoutes.js';
import { router as allAssetsRouter } from './server/routes/allAssetsRoute.js';
import { router as allStockRouter } from './server/routes/allStockRoute.js';

const app = express();
app.use(cors());
app.use(express.json());

// 挂载路由
app.use('/api', portfolioRoutes);
app.use('/api', stockAssetsRouter);
app.use('/api', cashAssetsRouter);
app.use('/api', portfolioAssetsRouter);
app.use('/api', allAssetsRouter);
app.use('/api', allStockRouter);


const PORT = 8088;


app.listen(PORT, () => {
  console.log(`服务器已启动：http://localhost:${PORT}`);
});