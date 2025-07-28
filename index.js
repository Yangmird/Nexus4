import express from 'express';
import cors from 'cors';
import { router as stockAssetsRouter } from './server/routes/stockAssetsRoute.js';
import { router as cashAssetsRouter } from './server/routes/cashAssetsRoute.js';
import { router as portfolioAssetsRouter } from './server/routes/portfolioAssets.js';
const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', stockAssetsRouter);
app.use('/api', cashAssetsRouter);
app.use('/api', portfolioAssetsRouter);


const PORT = 8088;
app.listen(PORT, () => {
  console.log(`服务器已启动：http://localhost:${PORT}`);
});