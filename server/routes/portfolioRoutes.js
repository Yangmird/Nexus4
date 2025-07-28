import express from "express";
import {
  getPortfolioOptions,
  createPortfolio,
  updatePortfolio,
  deletePortfolioWithRelations
} from "../controllers/portfolioController.js";

export const router = express.Router();

router.get("/portfolios/options", getPortfolioOptions); // 获取下拉框选项
router.post("/portfolios/create", createPortfolio);           // 新建 portfolio
router.put("/portfolios/update/:id", updatePortfolio);        // 修改名称
router.delete("/portfolios/delete/:id", deletePortfolioWithRelations); // 删除组合及相关表记录
