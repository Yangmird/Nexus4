import express from 'express';
import * as allAssetsController from '../controllers/allAssetsController.js';

export const router = express.Router();

router.get('/all-assets', allAssetsController.getAllAssets);
router.get('/all-stocks', allAssetsController.getAllStocks);
router.get('/bank-distribution', allAssetsController.getBankAssetsDistribution);
router.get('/bank-details/:bankName', allAssetsController.getBankDetails);
router.get('/stock-distribution', allAssetsController.getStockAssetsDistribution);
router.get('/stock-details/:ticker', allAssetsController.getStockDetails);