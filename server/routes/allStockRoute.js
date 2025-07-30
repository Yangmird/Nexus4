import express from 'express';
import { searchStocks, getStockPrice } from '../controllers/allStockController.js';

export const router = express.Router();

router.get('/search-stocks', searchStocks);
router.get('/stock-price', getStockPrice);