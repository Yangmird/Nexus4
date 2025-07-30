import express from 'express';
import * as portfolioAssetController from '../controllers/portfolioAssetController.js';

export const router = express.Router();

// 投资组合特定的资产路由
router.get('/:portfolioId/assets', portfolioAssetController.getPortfolioAssets);
router.put('/portfolio-assets/:id', portfolioAssetController.updatePortfolioAsset);
router.post('/:portfolioId/assets', portfolioAssetController.addPortfolioAsset);
router.get('/portfolio-performance/:id', portfolioAssetController.portfolioPerformance);

// 通用的投资组合资产路由（用于前端调用）
router.post('/portfolio-assets', portfolioAssetController.addPortfolioAsset);

// 购买验证路由
router.post('/portfolio-assets/validate', portfolioAssetController.validatePurchase);

router.get('/available-shares/:ticker', portfolioAssetController.getAvailableShares);

