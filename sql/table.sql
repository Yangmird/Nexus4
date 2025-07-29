-- 删除并重新创建数据库
DROP DATABASE IF EXISTS portfolio_manager;
CREATE DATABASE portfolio_manager;
USE portfolio_manager;

-- 投资组合表
DROP TABLE IF EXISTS portfolios;
CREATE TABLE portfolios (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 股票资产表
DROP TABLE IF EXISTS stock_assets;
CREATE TABLE stock_assets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  ticker VARCHAR(20),
  name VARCHAR(100),
  quantity DECIMAL(18,4),
  purchase_price DECIMAL(18,4),
  current_price DECIMAL(18,4),
  purchase_date DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 现金资产表
DROP TABLE IF EXISTS cash_assets;
CREATE TABLE cash_assets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  cash_amount DECIMAL(18,4),
  currency_code VARCHAR(10),
  bank_name VARCHAR(100),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 投资组合与资产关联表
DROP TABLE IF EXISTS portfolio_assets;
CREATE TABLE portfolio_assets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  portfolio_id INT,
  asset_type ENUM('stock', 'cash'),
  asset_id INT,
  quantity DECIMAL(18,4),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (portfolio_id) REFERENCES portfolios(id)
);

-- 个人股票价格记录表
DROP TABLE IF EXISTS stocks_assets_history;
CREATE TABLE stocks_assets_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  stock_id INT,
  record_date DATE,
  purchase_price DECIMAL(18,4),
  current_price DECIMAL(18,4),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (stock_id) REFERENCES stock_assets(id)
);

-- 市场整体股票价格记录表
DROP TABLE IF EXISTS stocks_history;
CREATE TABLE stocks_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  stock_id INT,
  record_date DATE,
  current_price DECIMAL(18,4),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 总股票信息表（每日快照）
DROP TABLE IF EXISTS all_stocks;
CREATE TABLE all_stocks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  ticker VARCHAR(20),
  record_date DATE,
  market_price DECIMAL(18,4),
  name VARCHAR(100),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);