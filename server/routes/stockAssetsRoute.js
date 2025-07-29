import express from 'express';
import * as stockAssetsController from '../controllers/stockAssetsController.js';

export const router = express.Router();

router.get('/stock-assets', stockAssetsController.getStockAssets);
router.get('/stock-assets/:id', stockAssetsController.getStockAsset);
router.post('/stock-assets', stockAssetsController.addStockAsset);
router.put('/stock-assets/:id', stockAssetsController.updateStockAsset);
router.delete('/stock-assets/:id', stockAssetsController.deleteStockAsset);