import express from 'express';
import cors from 'cors';
import { router as stockAssetsRouter } from './server/routes/stockAssetsRoutes.js';
const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', stockAssetsRouter);

const PORT = 8088;
app.listen(PORT, () => {
  console.log(`服务器已启动：http://localhost:${PORT}`);
});