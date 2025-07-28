-- 插入投资组合
INSERT INTO portfolios (name) VALUES
('退休计划2025'),
('成长型投资组合'),
('短期现金管理');

-- 插入股票资产
INSERT INTO stock_assets (ticker, name, quantity, purchase_price, current_price, purchase_date)
VALUES
('AAPL', 'Apple Inc.', 150.0000, 145.0000, 188.3500, '2024-11-21'),
('MSFT', 'Microsoft Corporation', 80.0000, 310.0000, 425.7600, '2025-02-10'),
('TSLA', 'Tesla Inc.', 35.0000, 620.0000, 875.2900, '2025-03-15'),
('NVDA', 'NVIDIA Corporation', 60.0000, 715.0000, 950.0000, '2025-01-30'),
('GOOG', 'Alphabet Inc.', 45.0000, 135.0000, 152.8800, '2025-02-28'),
('META', 'Meta Platforms Inc.', 70.0000, 265.0000, 312.5400, '2025-04-01');

-- 插入现金资产
INSERT INTO cash_assets (cash_amount, currency_code, bank_name, notes)
VALUES
(50000.0000, 'USD', 'JPMorgan Chase', '美股投资备用资金'),
(120000.0000, 'SGD', 'DBS Bank', '新加坡本地流动资金'),
(25000.0000, 'USD', 'Bank of America', '紧急备用金');

-- 插入组合资产关联
INSERT INTO portfolio_assets (portfolio_id, asset_type, asset_id, quantity)
VALUES
(1, 'stock', 1, 150.0000),
(1, 'stock', 2, 80.0000),
(1, 'cash', 1, 50000.0000),
(2, 'stock', 3, 35.0000),
(2, 'stock', 4, 60.0000),
(2, 'stock', 5, 45.0000),
(2, 'cash', 2, 120000.0000),
(3, 'stock', 6, 70.0000),
(3, 'cash', 3, 25000.0000);

-- 插入股票资产历史记录（多天）
INSERT INTO stocks_assets_history (stock_id, record_date, purchase_price, current_price)
VALUES
(1, '2025-07-25', 145.0000, 188.3500),
(1, '2025-07-26', 145.0000, 189.1000),
(1, '2025-07-27', 145.0000, 190.6000),
(3, '2025-07-25', 620.0000, 875.2900),
(3, '2025-07-26', 620.0000, 878.5000),
(3, '2025-07-27', 620.0000, 882.4000),
(6, '2025-07-25', 265.0000, 312.5400),
(6, '2025-07-26', 265.0000, 315.1000),
(6, '2025-07-27', 265.0000, 317.8000);

-- 插入市场股票历史记录（多天）
INSERT INTO stocks_history (stock_id, record_date, current_price)
VALUES
(4, '2025-07-25', 950.0000),
(4, '2025-07-26', 955.2000),
(4, '2025-07-27', 961.5000),
(5, '2025-07-25', 152.8800),
(5, '2025-07-26', 154.5000),
(5, '2025-07-27', 156.1000);

-- 插入当天股票快照（符合 all_stocks 日期唯一性要求）
INSERT INTO all_stocks (ticker, record_date, market_price, name)
VALUES
('AAPL', '2025-07-25', 188.3500, 'Apple Inc.'),
('MSFT', '2025-07-25', 425.7600, 'Microsoft Corporation'),
('TSLA', '2025-07-25', 875.2900, 'Tesla Inc.'),
('NVDA', '2025-07-25', 950.0000, 'NVIDIA Corporation'),
('GOOG', '2025-07-25', 152.8800, 'Alphabet Inc.'),
('META', '2025-07-25', 312.5400, 'Meta Platforms Inc.');
