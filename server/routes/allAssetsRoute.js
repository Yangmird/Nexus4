import express from 'express';
import * as allAssetsController from '../controllers/allAssetsController.js';

export const router = express.Router();
router.get('/all-assets', allAssetsController.getAllAssets);