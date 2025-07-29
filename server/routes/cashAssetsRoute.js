import express from 'express';
import * as cashAssetsController from '../controllers/cashAssetsController.js';

export const router = express.Router();

router.get('/cash-assets', cashAssetsController.getCashAssets);
router.get('/cash-assets/:id', cashAssetsController.getCashAsset);
router.post('/cash-assets', cashAssetsController.addCashAsset);
router.put('/cash-assets/:id', cashAssetsController.updateCashAsset);
router.delete('/cash-assets/:id', cashAssetsController.deleteCashAsset);
