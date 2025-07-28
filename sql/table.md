# 📊 投资组合资产管理数据库表结构说明 | Portfolio Asset Management Database Schema

## 1. `portfolios` - 投资组合表 | Portfolio Table
用于管理投资组合基本信息。

| 字段名       | 类型        | 中文说明         | English Description         |
|--------------|-------------|------------------|-----------------------------|
| id           | INT         | 组合唯一 ID      | Unique portfolio ID         |
| name         | VARCHAR(100)| 组合名称         | Portfolio name              |
| created_at   | DATETIME    | 创建时间         | Creation timestamp          |
| updated_at   | DATETIME    | 最后更新时间     | Last update timestamp       |

---

## 2. `stock_assets` - 股票资产表 | Stock Assets Table
记录所有持仓股票的详细信息。

| 字段名           | 类型          | 中文说明           | English Description              |
|------------------|---------------|--------------------|----------------------------------|
| id               | INT           | 股票资产唯一 ID    | Unique stock asset ID            |
| ticker           | VARCHAR(20)   | 股票代码           | Stock ticker (e.g. AAPL)         |
| name             | VARCHAR(100)  | 股票名称           | Stock name (e.g. Apple Inc.)     |
| quantity         | DECIMAL(18,4) | 当前持有数量       | Quantity held                    |
| purchase_price   | DECIMAL(18,4) | 买入价格（每单位） | Purchase price per unit          |
| current_price    | DECIMAL(18,4) | 当前市场价格       | Current market price per unit    |
| purchase_date    | DATE          | 买入日期           | Purchase date                    |
| created_at       | DATETIME      | 创建时间           | Creation timestamp               |
| updated_at       | DATETIME      | 最后更新时间       | Last update timestamp            |

---

## 3. `cash_assets` - 现金资产表 | Cash Assets Table
记录现金或银行资产信息。

| 字段名         | 类型          | 中文说明           | English Description              |
|----------------|---------------|--------------------|----------------------------------|
| id             | INT           | 现金资产唯一 ID    | Unique cash asset ID             |
| cash_amount    | DECIMAL(18,4) | 当前金额           | Cash amount                      |
| currency_code  | VARCHAR(10)   | 货币代码           | Currency code (e.g. USD, SGD)    |
| bank_name      | VARCHAR(100)  | 银行名称           | Bank name                        |
| notes          | TEXT          | 备注信息           | Additional notes                 |
| created_at     | DATETIME      | 创建时间           | Creation timestamp               |
| updated_at     | DATETIME      | 最后更新时间       | Last update timestamp            |

---

## 4. `portfolio_assets` - 组合资产关联表 | Portfolio-Asset Link Table
连接组合与资产，并记录持仓信息。

| 字段名         | 类型                        | 中文说明             | English Description                    |
|----------------|-----------------------------|----------------------|----------------------------------------|
| id             | INT                         | 记录唯一 ID          | Unique record ID                       |
| portfolio_id   | INT                         | 所属组合 ID          | Associated portfolio ID                |
| asset_type     | ENUM('stock', 'cash')       | 资产类型             | Asset type (stock or cash)             |
| asset_id       | INT                         | 对应资产 ID          | Asset reference ID                     |
| quantity       | DECIMAL(18,4)               | 数量或金额           | Quantity or cash amount                |
| created_at     | DATETIME                    | 创建时间             | Creation timestamp                     |
| updated_at     | DATETIME                    | 最后更新时间         | Last update timestamp                  |

---

## 5. `stocks_assets_history` - 个人资产股票价格历史表 | Personal Stock Price History
记录持仓股票每日价格用于分析。

| 字段名         | 类型          | 中文说明             | English Description                  |
|----------------|---------------|----------------------|--------------------------------------|
| id             | INT           | 记录唯一 ID          | Unique record ID                     |
| stock_id       | INT           | 股票资产 ID          | Stock asset reference ID             |
| record_date    | DATE          | 记录日期             | Date of price record                 |
| purchase_price | DECIMAL(18,4) | 冗余买入价           | Redundant purchase price             |
| current_price  | DECIMAL(18,4) | 当日市场价           | Market price of the day              |
| created_at     | DATETIME      | 创建时间             | Creation timestamp                   |
| updated_at     | DATETIME      | 最后更新时间         | Last update timestamp                |

---

## 6. `stocks_history` - 总体市场股票历史表 | Overall Market Stock History
所有股票每日价格快照。

| 字段名        | 类型          | 中文说明           | English Description               |
|---------------|---------------|--------------------|-----------------------------------|
| id            | INT           | 记录唯一 ID        | Unique record ID                  |
| stock_id      | INT           | 股票资产 ID        | Stock asset reference ID          |
| record_date   | DATE          | 价格记录日期       | Price record date                 |
| current_price | DECIMAL(18,4) | 市场价格           | Market price                      |
| created_at    | DATETIME      | 创建时间           | Creation timestamp                |
| updated_at    | DATETIME      | 最后更新时间       | Last update timestamp             |

---

## 7. `all_stocks` - 总股票信息表 | All Stocks Master Table
所有可投资股票及每日价格记录。

| 字段名        | 类型          | 中文说明           | English Description               |
|---------------|---------------|--------------------|-----------------------------------|
| id            | INT           | 股票记录唯一 ID    | Unique stock record ID            |
| ticker        | VARCHAR(20)   | 股票代码           | Stock ticker                      |
| record_date   | DATE          | 记录日期           | Record date                       |
| market_price  | DECIMAL(18,4) | 市场价格           | Market price                      |
| name          | VARCHAR(100)  | 股票名称           | Stock name                        |
| created_at    | DATETIME      | 创建时间           | Creation timestamp                |
| updated_at    | DATETIME      | 最后更新时间       | Last update timestamp             |
