import express from 'express';
import { 
    getPortfolioOptions, 
    createPortfolio, 
    updatePortfolio, 
    deletePortfolioWithRelations,
    getPortfolioHistory,
    getPortfolioReturns,
    getPortfolioAllocation,
    getPortfolioAssets,
    updatePortfolioName,
    deletePortfolio,
    getAllPortfoliosAssets
} from '../controllers/portfolioController.js';

export const router = express.Router();

// 投资组合基础路由
router.get("/portfolios", getPortfolioOptions); // 获取所有投资组合
router.post("/portfolios", createPortfolio);           // 新建 portfolio
router.put("/portfolios/:id", updatePortfolio);        // 修改名称
router.delete("/portfolios/:id", deletePortfolioWithRelations); // 删除组合及相关表记录

// 投资组合数据分析路由
router.get("/portfolios/:portfolioId/history", getPortfolioHistory); // 获取历史数据
router.get("/portfolios/:portfolioId/returns", getPortfolioReturns); // 获取收益统计
router.get("/portfolios/:portfolioId/allocation", getPortfolioAllocation); // 获取资产分配
router.get("/portfolios/:portfolioId/assets", getPortfolioAssets); // 获取原始资产数据

// 新增的投资组合管理路由
router.put("/portfolios/:portfolioId/name", updatePortfolioName); // 修改投资组合名称
router.delete("/portfolios/:portfolioId/delete", deletePortfolio); // 删除投资组合及其资产

// 获取所有投资组合及其资产（用于新页面布局）
router.get("/portfolios-all-assets", getAllPortfoliosAssets);
