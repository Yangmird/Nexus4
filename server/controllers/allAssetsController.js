import connection from '../db_connect.js';

export function getAllAssets(req, res) {
  // 1. 查询当前现金总额
  connection.query(
    'SELECT SUM(cash_amount) AS total_cash FROM cash_assets',
    (cashErr, cashResults) => {
      if (cashErr) {
        console.error('现金查询错误:', cashErr);
        return res.status(500).json({ error: '现金查询失败' });
      }

      const totalCash = cashResults[0].total_cash || 0;

      // 2. 查询当前股票总市值（quantity * current_price）
      const currentStocksQuery = `
        SELECT SUM(quantity * current_price) AS total_stocks
        FROM stock_assets
      `;

      connection.query(currentStocksQuery, (stockErr, stockResults) => {
        if (stockErr) {
          console.error('股票查询错误:', stockErr);
          return res.status(500).json({ error: '股票查询失败' });
        }

        const totalStocks = stockResults[0].total_stocks || 0;

        // 3. 查询前一天股票市值（用 stocks_history 里的前一天价格）
        const previousStocksQuery = `
          SELECT SUM(pa.quantity * sh.current_price) AS previous_stocks
          FROM portfolio_assets pa
          JOIN stocks_history sh ON pa.asset_id = sh.stock_id
          JOIN (
            SELECT stock_id, MAX(record_date) AS latest_date
            FROM stocks_history
            WHERE record_date < CURDATE()
            GROUP BY stock_id
          ) latest_prev ON sh.stock_id = latest_prev.stock_id AND sh.record_date = latest_prev.latest_date
          WHERE pa.asset_type = 'stock'
        `;

        connection.query(previousStocksQuery, (prevErr, prevResults) => {
          if (prevErr) {
            console.error('前一天股票市值查询错误:', prevErr);
            return res.status(500).json({ error: '前一天股票市值查询失败' });
          }

          const previousStocks = prevResults[0].previous_stocks || 0;
          const previousTotal = Number(totalCash) + Number(previousStocks);

          // 4. 查询购买时股票总价 (quantity * purchase_price)
          const purchaseStocksQuery = `
            SELECT SUM(quantity * purchase_price) AS purchase_stocks
            FROM stock_assets
          `;

          connection.query(purchaseStocksQuery, (purchaseErr, purchaseResults) => {
            if (purchaseErr) {
              console.error('购买时股票总价查询错误:', purchaseErr);
              return res.status(500).json({ error: '购买时股票总价查询失败' });
            }

            const purchaseStocks = purchaseResults[0].purchase_stocks || 0;
            const purchaseTotal = Number(totalCash) + Number(purchaseStocks);

            // 最终响应数据
            res.json({
              total_cash: totalCash,
              total_stocks: totalStocks,
              total_assets: Number(totalCash) + Number(totalStocks),
              previous_total: previousTotal,
              purchase_total: purchaseTotal,
            });
          });
        });
      });
    }
  );
}


// 获取所有股票信息（支持分页）
export function getAllStocks(req, res) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM stock_assets';
    let countQuery = 'SELECT COUNT(*) as total FROM stock_assets';
    let params = [];
    let countParams = [];

    // 如果有搜索条件
    if (search) {
        query += ' WHERE ticker LIKE ? OR name LIKE ?';
        countQuery += ' WHERE ticker LIKE ? OR name LIKE ?';
        const searchPattern = `%${search}%`;
        params = [searchPattern, searchPattern];
        countParams = [searchPattern, searchPattern];
    }

    // 添加排序和分页
    query += ' ORDER BY ticker LIMIT ? OFFSET ?';
    params.push(limit, offset);

    // 先获取总数
    connection.query(countQuery, countParams, (err, countResults) => {
        if (err) {
            console.error('Error counting stocks:', err);
            return res.status(500).json({ error: '获取股票总数失败' });
        }

        const total = countResults[0].total;
        const totalPages = Math.ceil(total / limit);

        // 获取分页数据
        connection.query(query, params, (err, results) => {
            if (err) {
                console.error('Error fetching stocks:', err);
                return res.status(500).json({ error: '获取股票列表失败' });
            }

            res.json({
                stocks: results,
                pagination: {
                    current_page: page,
                    total_pages: totalPages,
                    total_items: total,
                    items_per_page: limit,
                    has_next: page < totalPages,
                    has_prev: page > 1
                }
            });
        });
    });
}

// 获取银行资产分布信息（显示剩余可支配金额）
export function getBankAssetsDistribution(req, res) {
    // 首先获取所有银行的总现金资产
    const totalQuery = `
        SELECT 
            bank_name,
            SUM(cash_amount) as total_amount,
            COUNT(id) as asset_count
        FROM cash_assets 
        GROUP BY bank_name
        ORDER BY total_amount DESC
    `;
    
    connection.query(totalQuery, (err, totalResults) => {
        if (err) {
            console.error('Error fetching total bank amounts:', err);
            return res.status(500).json({ error: '获取银行总金额失败' });
        }
        
        // 然后获取所有银行已分配的金额
        const allocatedQuery = `
            SELECT 
                ca.bank_name,
                SUM(pa.quantity) as allocated_amount
            FROM portfolio_assets pa
            JOIN cash_assets ca ON pa.asset_id = ca.id AND pa.asset_type = 'cash'
            GROUP BY ca.bank_name
        `;
        
        connection.query(allocatedQuery, (err, allocatedResults) => {
            if (err) {
                console.error('Error fetching allocated amounts:', err);
                return res.status(500).json({ error: '获取已分配金额失败' });
            }
            
            // 创建已分配金额的映射
            const allocatedMap = new Map();
            allocatedResults.forEach(row => {
                allocatedMap.set(row.bank_name, row.allocated_amount);
            });
            
            // 合并结果
            const banks = totalResults.map(row => {
                const allocatedAmount = allocatedMap.get(row.bank_name) || 0;
                const availableAmount = row.total_amount - allocatedAmount;
                
                return {
                    bank_name: row.bank_name,
                    total_amount: row.total_amount,
                    allocated_amount: allocatedAmount,
                    available_amount: availableAmount,
                    asset_count: row.asset_count
                };
            });
            
            res.json({ banks });
        });
    });
}

// 获取股票资产分布信息（显示剩余可支配股数）
export function getStockAssetsDistribution(req, res) {
    // 首先获取所有股票的总股数
    const totalQuery = `
        SELECT 
            ticker,
            name,
            current_price,
            SUM(quantity) as total_quantity,
            COUNT(id) as asset_count
        FROM stock_assets 
        GROUP BY ticker, name, current_price
        ORDER BY total_quantity DESC
    `;
    
    connection.query(totalQuery, (err, totalResults) => {
        if (err) {
            console.error('Error fetching total stock quantities:', err);
            return res.status(500).json({ error: '获取股票总股数失败' });
        }
        
        // 然后获取所有股票已分配的股数
        const allocatedQuery = `
            SELECT 
                s.ticker,
                SUM(pa.quantity) as allocated_quantity
            FROM portfolio_assets pa
            JOIN stock_assets s ON pa.asset_id = s.id AND pa.asset_type = 'stock'
            GROUP BY s.ticker
        `;
        
        connection.query(allocatedQuery, (err, allocatedResults) => {
            if (err) {
                console.error('Error fetching allocated quantities:', err);
                return res.status(500).json({ error: '获取已分配股数失败' });
            }
            
            // 创建已分配股数的映射
            const allocatedMap = new Map();
            allocatedResults.forEach(row => {
                allocatedMap.set(row.ticker, row.allocated_quantity);
            });
            
            // 合并结果
            const stocks = totalResults.map(row => {
                const allocatedQuantity = allocatedMap.get(row.ticker) || 0;
                const availableQuantity = row.total_quantity - allocatedQuantity;
                
                return {
                    ticker: row.ticker,
                    name: row.name,
                    current_price: row.current_price,
                    total_quantity: row.total_quantity,
                    allocated_quantity: allocatedQuantity,
                    available_quantity: availableQuantity,
                    asset_count: row.asset_count
                };
            });
            
            res.json({ stocks });
        });
    });
}

// 获取特定银行的详细配置信息
export function getBankDetails(req, res) {
    const { bankName } = req.params;
    
    // 首先获取该银行的总现金资产
    const totalQuery = `
        SELECT SUM(cash_amount) as total_amount
        FROM cash_assets 
        WHERE bank_name = ?
    `;
    
    connection.query(totalQuery, [bankName], (err, totalResults) => {
        if (err) {
            console.error('Error fetching total bank amount:', err);
            return res.status(500).json({ error: '获取银行总金额失败' });
        }
        
        const totalAmount = totalResults[0].total_amount || 0;
        
        // 然后获取该银行已分配的金额
        const allocatedQuery = `
            SELECT SUM(pa.quantity) as allocated_amount
            FROM portfolio_assets pa
            JOIN cash_assets ca ON pa.asset_id = ca.id AND pa.asset_type = 'cash'
            WHERE ca.bank_name = ?
        `;
        
        connection.query(allocatedQuery, [bankName], (err, allocatedResults) => {
            if (err) {
                console.error('Error fetching allocated amount:', err);
                return res.status(500).json({ error: '获取已分配金额失败' });
            }
            
            const allocatedAmount = allocatedResults[0].allocated_amount || 0;
            const availableAmount = totalAmount - allocatedAmount;
            
            // 获取分配详情
            const detailsQuery = `
                SELECT 
                    ca.id,
                    ca.cash_amount,
                    ca.currency_code,
                    ca.notes,
                    p.name as portfolio_name,
                    p.id as portfolio_id,
                    pa.quantity as allocated_quantity
                FROM cash_assets ca
                LEFT JOIN portfolio_assets pa ON ca.id = pa.asset_id AND pa.asset_type = 'cash'
                LEFT JOIN portfolios p ON pa.portfolio_id = p.id
                WHERE ca.bank_name = ?
                ORDER BY ca.cash_amount DESC
            `;
            
            connection.query(detailsQuery, [bankName], (err, detailResults) => {
                if (err) {
                    console.error('Error fetching bank details:', err);
                    return res.status(500).json({ error: '获取银行详情失败' });
                }
                
                const portfolioAllocations = detailResults
                    .filter(row => row.portfolio_id) // 只显示已分配的
                    .map(row => ({
                        portfolio_name: row.portfolio_name,
                        portfolio_id: row.portfolio_id,
                        amount: row.allocated_quantity, // 使用实际分配的数量
                        notes: row.notes
                    }));
                
                res.json({
                    bank_name: bankName,
                    total_amount: totalAmount,
                    allocated_amount: allocatedAmount,
                    available_amount: availableAmount,
                    portfolio_allocations: portfolioAllocations
                });
            });
        });
    });
}

// 获取特定股票的详细配置信息
export function getStockDetails(req, res) {
    const { ticker } = req.params;
    
    // 首先获取该股票的总股数
    const totalQuery = `
        SELECT 
            ticker,
            name,
            current_price,
            SUM(quantity) as total_quantity
        FROM stock_assets 
        WHERE ticker = ?
        GROUP BY ticker, name, current_price
    `;
    
    connection.query(totalQuery, [ticker], (err, totalResults) => {
        if (err) {
            console.error('Error fetching total stock quantity:', err);
            return res.status(500).json({ error: '获取股票总股数失败' });
        }
        
        if (totalResults.length === 0) {
            return res.status(404).json({ error: '股票不存在' });
        }
        
        const totalQuantity = totalResults[0].total_quantity || 0;
        const stockName = totalResults[0].name || '';
        const currentPrice = totalResults[0].current_price || 0;
        
        // 然后获取该股票已分配的股数
        const allocatedQuery = `
            SELECT SUM(pa.quantity) as allocated_quantity
            FROM portfolio_assets pa
            JOIN stock_assets s ON pa.asset_id = s.id AND pa.asset_type = 'stock'
            WHERE s.ticker = ?
        `;
        
        connection.query(allocatedQuery, [ticker], (err, allocatedResults) => {
            if (err) {
                console.error('Error fetching allocated quantity:', err);
                return res.status(500).json({ error: '获取已分配股数失败' });
            }
            
            const allocatedQuantity = allocatedResults[0].allocated_quantity || 0;
            const availableQuantity = totalQuantity - allocatedQuantity;
            
            // 获取分配详情
            const detailsQuery = `
                SELECT 
                    s.id,
                    s.quantity,
                    s.purchase_price,
                    s.current_price,
                    s.purchase_date,
                    p.name as portfolio_name,
                    p.id as portfolio_id,
                    pa.quantity as allocated_quantity
                FROM stock_assets s
                LEFT JOIN portfolio_assets pa ON s.id = pa.asset_id AND pa.asset_type = 'stock'
                LEFT JOIN portfolios p ON pa.portfolio_id = p.id
                WHERE s.ticker = ?
                ORDER BY s.quantity DESC
            `;
            
            connection.query(detailsQuery, [ticker], (err, detailResults) => {
                if (err) {
                    console.error('Error fetching stock details:', err);
                    return res.status(500).json({ error: '获取股票详情失败' });
                }
                
                const portfolioAllocations = detailResults
                    .filter(row => row.portfolio_id) // 只显示已分配的
                    .map(row => ({
                        portfolio_name: row.portfolio_name,
                        portfolio_id: row.portfolio_id,
                        quantity: row.allocated_quantity, // 使用实际分配的数量
                        purchase_price: row.purchase_price,
                        current_price: row.current_price,
                        purchase_date: row.purchase_date
                    }));
                
                res.json({
                    id: detailResults[0]?.id || null, // 返回第一个股票资产的ID
                    ticker: ticker,
                    name: stockName,
                    current_price: currentPrice,
                    total_quantity: totalQuantity,
                    allocated_quantity: allocatedQuantity,
                    available_quantity: availableQuantity,
                    portfolio_allocations: portfolioAllocations
                });
            });
        });
    });
}