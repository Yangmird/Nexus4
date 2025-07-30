import express from 'express';
import * as portfolioAssetController from '../controllers/portfolioAssetController.js';

export const router = express.Router();

// 投资组合特定的资产路由
router.get('/:portfolioId/assets', portfolioAssetController.getPortfolioAssets);
router.post('/:portfolioId/assets', portfolioAssetController.addPortfolioAsset);
router.get('/portfolio-performance/:id', portfolioAssetController.portfolioPerformance);

// 通用的投资组合资产路由（用于前端调用）
router.post('/portfolio-assets', portfolioAssetController.addPortfolioAsset);

// 购买验证路由
router.post('/portfolio-assets/validate', portfolioAssetController.validatePurchase);

// 删除资产路由
router.delete('/portfolio-assets/delete-cash/:assetId', portfolioAssetController.deleteCashAsset);
router.delete('/portfolio-assets/delete-stock/:assetId', portfolioAssetController.deleteStockAsset);

// 更新投资组合中的现金分配（必须在通用路由之前）
router.put('/portfolio-assets/update-cash', portfolioAssetController.updateCashAllocation);

// 获取投资组合中特定股票的分配记录ID
router.get('/portfolio-assets/:portfolioId/stock/:stockId', portfolioAssetController.getPortfolioStockAsset);

// 更新投资组合中的股票分配（必须在通用路由之前）
router.put('/portfolio-assets/update-stock', portfolioAssetController.updateStockAllocation);

// 通用的投资组合资产更新路由（必须在特定路由之后）
router.put('/portfolio-assets/:id', portfolioAssetController.updatePortfolioAsset);

router.get('/available-shares/:ticker', portfolioAssetController.getAvailableShares);

