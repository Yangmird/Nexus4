import connection from '../db_connect.js';

// 获取所有投资组合选项
export function getPortfolioOptions(req, res) {
    const query = 'SELECT * FROM portfolios ORDER BY created_at DESC';
    connection.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching portfolios:', err);
            res.status(500).send('Error fetching portfolios');
            return;
        }
        res.json(results);
    });
}

// 创建新的投资组合
export function createPortfolio(req, res) {
  const { name } = req.body;
    const query = 'INSERT INTO portfolios (name, created_at) VALUES (?, NOW())';
    connection.query(query, [name], (err, result) => {
        if (err) {
            console.error('Error creating portfolio:', err);
            res.status(500).send('Error creating portfolio');
            return;
        }
        res.json({ id: result.insertId, name, message: 'Portfolio created successfully' });
    });
}

// 更新投资组合名称
export function updatePortfolio(req, res) {
    const { id } = req.params;
  const { name } = req.body;
    const query = 'UPDATE portfolios SET name = ? WHERE id = ?';
    connection.query(query, [name, id], (err, result) => {
        if (err) {
            console.error('Error updating portfolio:', err);
            res.status(500).send('Error updating portfolio');
            return;
        }
        if (result.affectedRows === 0) {
            res.status(404).send('Portfolio not found');
            return;
        }
        res.json({ message: 'Portfolio updated successfully' });
    });
}

// 删除投资组合及其关联数据
export function deletePortfolioWithRelations(req, res) {
    const { id } = req.params;
    
    connection.beginTransaction(async (err) => {
        if (err) {
            console.error('Error starting transaction:', err);
            res.status(500).send('Error deleting portfolio');
            return;
        }

        try {
            // 删除投资组合资产关联
            await new Promise((resolve, reject) => {
                connection.query('DELETE FROM portfolio_assets WHERE portfolio_id = ?', [id], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            // 删除投资组合
            await new Promise((resolve, reject) => {
                connection.query('DELETE FROM portfolios WHERE id = ?', [id], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            connection.commit((err) => {
                if (err) {
                    console.error('Error committing transaction:', err);
                    connection.rollback(() => {
                        res.status(500).send('Error deleting portfolio');
                    });
                    return;
                }
                res.json({ message: 'Portfolio and related data deleted successfully' });
            });
        } catch (error) {
            connection.rollback(() => {
                console.error('Error in transaction:', error);
                res.status(500).send('Error deleting portfolio');
            });
        }
    });
}

// 获取投资组合历史数据（近5天）
export function getPortfolioHistory(req, res) {
    const { portfolioId } = req.params;
    
    // 获取投资组合资产
    const assetQuery = `
        SELECT pa.*, 
               sa.ticker, sa.name as stock_name, sa.quantity, sa.current_price, sa.purchase_price,
               ca.bank_name, ca.cash_amount
        FROM portfolio_assets pa
        LEFT JOIN stock_assets sa ON pa.asset_type = 'stock' AND pa.asset_id = sa.id
        LEFT JOIN cash_assets ca ON pa.asset_type = 'cash' AND pa.asset_id = ca.id
        WHERE pa.portfolio_id = ?
    `;
    
    connection.query(assetQuery, [portfolioId], (err, assets) => {
        if (err) {
            console.error('Error fetching portfolio assets:', err);
            res.status(500).send('Error fetching portfolio history');
            return;
        }
        
        // 生成历史数据（模拟5天数据）
        const history = generatePortfolioHistory(assets);
        res.json(history);
    });
}

// 获取投资组合收益统计
export function getPortfolioReturns(req, res) {
    const { portfolioId } = req.params;
    
    const query = `
        SELECT pa.*, 
               sa.ticker, sa.name as stock_name, sa.quantity, sa.current_price, sa.purchase_price,
               ca.bank_name, ca.cash_amount
        FROM portfolio_assets pa
        LEFT JOIN stock_assets sa ON pa.asset_type = 'stock' AND pa.asset_id = sa.id
        LEFT JOIN cash_assets ca ON pa.asset_type = 'cash' AND pa.asset_id = ca.id
        WHERE pa.portfolio_id = ?
    `;
    connection.query(query, [portfolioId], (err, assets) => {
        if (err) {
            console.error('Error fetching portfolio returns:', err);
            res.status(500).send('Error fetching portfolio returns');
            return;
        }
        
        // 计算收益统计
        const returns = calculatePortfolioReturns(assets);
        res.json(returns);
    });
}

// 获取投资组合资产分配
export function getPortfolioAllocation(req, res) {
    const { portfolioId } = req.params;
    
    const query = `
        SELECT pa.*, 
               sa.ticker, sa.name as stock_name, sa.quantity, sa.current_price,
               ca.bank_name, ca.cash_amount
        FROM portfolio_assets pa
        LEFT JOIN stock_assets sa ON pa.asset_type = 'stock' AND pa.asset_id = sa.id
        LEFT JOIN cash_assets ca ON pa.asset_type = 'cash' AND pa.asset_id = ca.id
        WHERE pa.portfolio_id = ?
    `;
    
    connection.query(query, [portfolioId], (err, assets) => {
        if (err) {
            console.error('Error fetching portfolio allocation:', err);
            res.status(500).send('Error fetching portfolio allocation');
            return;
        }
        
        // 计算资产分配
        const allocation = calculatePortfolioAllocation(assets);
        res.json(allocation);
    });
}

// 获取投资组合原始资产数据
export function getPortfolioAssets(req, res) {
    const { portfolioId } = req.params;
    
    const query = `
        SELECT pa.*, 
               sa.ticker, sa.name as stock_name, sa.quantity, sa.current_price, sa.purchase_price,
               ca.bank_name, ca.cash_amount
        FROM portfolio_assets pa
        LEFT JOIN stock_assets sa ON pa.asset_type = 'stock' AND pa.asset_id = sa.id
        LEFT JOIN cash_assets ca ON pa.asset_type = 'cash' AND pa.asset_id = ca.id
        WHERE pa.portfolio_id = ?
    `;
    
    connection.query(query, [portfolioId], (err, assets) => {
        if (err) {
            console.error('Error fetching portfolio assets:', err);
            res.status(500).send('Error fetching portfolio assets');
            return;
        }
        
        // 格式化返回数据
        const formattedAssets = assets.map(asset => {
            if (asset.asset_type === 'stock' && asset.stock_name) {
                return {
                    stock: {
                        ticker: asset.ticker,
                        name: asset.stock_name,
                        quantity: asset.quantity,
                        current_price: asset.current_price,
                        purchase_price: asset.purchase_price
                    }
                };
            } else if (asset.asset_type === 'cash' && asset.bank_name) {
                return {
                    cash: {
                        bank_name: asset.bank_name,
                        cash_amount: asset.cash_amount
                    }
                };
            }
            return null;
        }).filter(asset => asset !== null);
        
        res.json(formattedAssets);
    });
}

// 获取所有投资组合的所有资产（用于左侧列表显示）
export function getAllPortfoliosAssets(req, res) {
    const query = `
        SELECT p.id as portfolio_id, p.name as portfolio_name, p.created_at,
               pa.asset_type, pa.asset_id, pa.quantity as allocated_quantity,
               sa.ticker, sa.name as stock_name, sa.quantity as stock_total_quantity, sa.current_price, sa.purchase_price,
               ca.bank_name, ca.cash_amount as bank_total_amount
        FROM portfolios p
        LEFT JOIN portfolio_assets pa ON p.id = pa.portfolio_id
        LEFT JOIN stock_assets sa ON pa.asset_type = 'stock' AND pa.asset_id = sa.id
        LEFT JOIN cash_assets ca ON pa.asset_type = 'cash' AND pa.asset_id = ca.id
        ORDER BY p.id, pa.asset_type
    `;
    
    connection.query(query, (err, results) => {
    if (err) {
            console.error('Error fetching all portfolios assets:', err);
            res.status(500).send('Error fetching all portfolios assets');
            return;
        }
        
        // 按投资组合分组
        const portfoliosMap = new Map();
        
        results.forEach(row => {
            if (!portfoliosMap.has(row.portfolio_id)) {
                portfoliosMap.set(row.portfolio_id, {
                    id: row.portfolio_id,
                    name: row.portfolio_name,
                    created_at: row.created_at,
                    assets: {
                        cash: [],
                        stock: []
                    }
                });
            }
            
            const portfolio = portfoliosMap.get(row.portfolio_id);
            
            if (row.asset_type === 'stock' && row.stock_name) {
                portfolio.assets.stock.push({
                    id: row.asset_id,
                    ticker: row.ticker,
                    name: row.stock_name,
                    quantity: row.allocated_quantity, // 使用分配到该组合的股数
                    current_price: row.current_price,
                    purchase_price: row.purchase_price
                });
            } else if (row.asset_type === 'cash' && row.bank_name) {
                portfolio.assets.cash.push({
                    id: row.asset_id,
                    bank_name: row.bank_name,
                    cash_amount: row.allocated_quantity // 使用分配到该组合的金额
                });
            }
        });
        
        const portfolios = Array.from(portfoliosMap.values());
        res.json(portfolios);
    });
}

// 修改投资组合名称
export function updatePortfolioName(req, res) {
    const { portfolioId } = req.params;
    const { name } = req.body;
    
    if (!name || name.trim() === '') {
        res.status(400).json({ error: '投资组合名称不能为空' });
        return;
    }
    
    const query = 'UPDATE portfolios SET name = ? WHERE id = ?';
    connection.query(query, [name.trim(), portfolioId], (err, result) => {
        if (err) {
            console.error('Error updating portfolio:', err);
            res.status(500).json({ error: '修改投资组合失败' });
            return;
        }
        
        if (result.affectedRows === 0) {
            res.status(404).json({ error: '投资组合不存在' });
            return;
        }
        
        res.json({ message: '投资组合修改成功', portfolio: { id: portfolioId, name: name.trim() } });
    });
}

// 删除投资组合及其所有资产
export function deletePortfolio(req, res) {
    const { portfolioId } = req.params;
    
    connection.beginTransaction(async (err) => {
        if (err) {
            console.error('Error starting transaction:', err);
            res.status(500).json({ error: '删除投资组合失败' });
            return;
        }

        try {
            // 1. 获取该投资组合的所有资产及其数量
            const assetsQuery = `
                SELECT pa.asset_type, pa.asset_id, pa.quantity 
                FROM portfolio_assets pa 
                WHERE pa.portfolio_id = ?
            `;
            const assets = await new Promise((resolve, reject) => {
                connection.query(assetsQuery, [portfolioId], (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                });
            });

            // 2. 将资产返回到对应的池子中
            for (const asset of assets) {
                if (asset.asset_type === 'stock') {
                    // 股票资产：增加股票池中的股数
                    await new Promise((resolve, reject) => {
                        connection.query(
                            'UPDATE stock_assets SET quantity = quantity + ? WHERE id = ?',
                            [asset.quantity, asset.asset_id],
                            (err) => {
                                if (err) reject(err);
                                else resolve();
                            }
                        );
                    });
                } else if (asset.asset_type === 'cash') {
                    // 现金资产：增加现金池中的金额
                    await new Promise((resolve, reject) => {
                        connection.query(
                            'UPDATE cash_assets SET cash_amount = cash_amount + ? WHERE id = ?',
                            [asset.quantity, asset.asset_id],
                            (err) => {
                                if (err) reject(err);
                                else resolve();
                            }
                        );
                    });
                }
            }

            // 3. 删除投资组合资产关联
            await new Promise((resolve, reject) => {
                connection.query('DELETE FROM portfolio_assets WHERE portfolio_id = ?', [portfolioId], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            // 4. 删除投资组合
            await new Promise((resolve, reject) => {
                connection.query('DELETE FROM portfolios WHERE id = ?', [portfolioId], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            connection.commit((err) => {
                if (err) {
                    console.error('Error committing transaction:', err);
                    connection.rollback(() => {
                        res.status(500).json({ error: '删除投资组合失败' });
                    });
                    return;
                }
                res.json({ 
                    message: '投资组合删除成功，所有资产已返回到对应的池子中',
                    returned_assets: assets.length
                });
            });
        } catch (error) {
            connection.rollback(() => {
                console.error('Error in transaction:', error);
                res.status(500).json({ error: '删除投资组合失败' });
            });
        }
    });
}

// 生成投资组合历史数据
function generatePortfolioHistory(assets) {
    const dates = [];
    const values = [];
    const today = new Date();
    
    for (let i = 4; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        dates.push(date.toLocaleDateString('zh-CN'));
        
        // 计算该日期的总资产价值
        let totalValue = 0;
        assets.forEach(asset => {
            if (asset.asset_type === 'stock' && asset.stock_name) {
                // 股票资产
                const baseValue = asset.quantity * asset.current_price;
                // 模拟价格波动（±5%）
                const variation = (Math.random() - 0.5) * 0.1;
                totalValue += baseValue * (1 + variation);
            } else if (asset.asset_type === 'cash' && asset.bank_name) {
                // 现金资产
                totalValue += asset.cash_amount;
            }
        });
        values.push(Math.round(totalValue));
    }
    
    return { dates, values };
}

// 计算投资组合收益统计
function calculatePortfolioReturns(assets) {
    let totalCurrentValue = 0;
    let totalPurchaseValue = 0;
    let cashValue = 0;
    let stockValue = 0;
    let profit = 0;
    let loss = 0;
    
    assets.forEach(asset => {
        if (asset.asset_type === 'stock' && asset.stock_name) {
            const currentValue = asset.quantity * asset.current_price;
            const purchaseValue = asset.quantity * asset.purchase_price;
            stockValue += currentValue;
            totalCurrentValue += currentValue;
            totalPurchaseValue += purchaseValue;
            const difference = currentValue - purchaseValue;
            if (difference > 0) {
                profit += difference;
            } else {
                loss += Math.abs(difference);
            }
        } else if (asset.asset_type === 'cash' && asset.bank_name) {
            cashValue += asset.cash_amount;
            totalCurrentValue += asset.cash_amount;
        }
    });
    
    const totalReturn = totalPurchaseValue > 0 ? ((totalCurrentValue - totalPurchaseValue) / totalPurchaseValue) * 100 : 0;
    const dailyReturn = totalReturn / 30; // 假设30天
    
    return {
        totalValue: totalCurrentValue,
        cashValue: cashValue,
        stockValue: stockValue,
        profit: profit,
        loss: loss,
        totalReturn: totalReturn,
        dailyReturn: dailyReturn,
        riskRatio: 0 // 模拟风险比率
    };
}

// 计算投资组合资产分配
function calculatePortfolioAllocation(assets) {
    let cashValue = 0;
    let stockValue = 0;
    
    assets.forEach(asset => {
        if (asset.asset_type === 'stock' && asset.stock_name) {
            stockValue += asset.quantity * asset.current_price;
        } else if (asset.asset_type === 'cash' && asset.bank_name) {
            cashValue += asset.cash_amount;
        }
    });
    
    const totalValue = Number(cashValue) + Number(stockValue);
    const cashPercentage = totalValue > 0 ? (cashValue / totalValue) * 100 : 0;
    const stockPercentage = totalValue > 0 ? (stockValue / totalValue) * 100 : 0;
    
    return {
        cash: {
            value: cashValue,
            percentage: cashPercentage
        },
        stock: {
            value: stockValue,
            percentage: stockPercentage
        },
        total: totalValue
    };
}
