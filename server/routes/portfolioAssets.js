import express from 'express';
import * as portfolioAssetController from '../controllers/portfolioAssetController.js';

export const router = express.Router();

router.get('/:portfolioId/assets', portfolioAssetController.getPortfolioAssets);
router.put('/portfolio-assets/:id', portfolioAssetController.updatePortfolioAsset);
router.post('/:portfolioId/assets', portfolioAssetController.addPortfolioAsset);
router.get('/:portfolioId/asset-allocation', portfolioAssetController.getPortfolioAssetAllocation);

