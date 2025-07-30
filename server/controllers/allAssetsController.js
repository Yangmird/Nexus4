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
    // 设置响应头，防止缓存
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM all_stocks';
    let countQuery = 'SELECT COUNT(*) as total FROM all_stocks';
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
    const query = `
        SELECT 
            ca.bank_name,
            SUM(ca.cash_amount) as total_amount,
            COUNT(ca.id) as asset_count,
            SUM(CASE WHEN pa.portfolio_id IS NOT NULL THEN ca.cash_amount ELSE 0 END) as allocated_amount
        FROM cash_assets ca
        LEFT JOIN portfolio_assets pa ON ca.id = pa.asset_id AND pa.asset_type = 'cash'
        GROUP BY ca.bank_name
        ORDER BY total_amount DESC
    `;
    
    connection.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching bank assets distribution:', err);
            return res.status(500).json({ error: '获取银行资产分布失败' });
        }
        
        res.json({
            banks: results.map(row => {
                const allocatedAmount = row.allocated_amount || 0;
                const availableAmount = row.total_amount - allocatedAmount;
                
                return {
                    bank_name: row.bank_name,
                    total_amount: row.total_amount,
                    allocated_amount: allocatedAmount,
                    available_amount: availableAmount,
                    asset_count: row.asset_count
                };
            })
        });
    });
}

// 获取股票资产分布信息（显示剩余可支配股数）
export function getStockAssetsDistribution(req, res) {
    const query = `
        SELECT 
            s.ticker,
            s.name,
            s.current_price,
            SUM(s.quantity) as total_quantity,
            COUNT(s.id) as asset_count,
            SUM(CASE WHEN pa.portfolio_id IS NOT NULL THEN pa.quantity ELSE 0 END) as allocated_quantity
        FROM stock_assets s
        LEFT JOIN portfolio_assets pa ON s.id = pa.asset_id AND pa.asset_type = 'stock'
        GROUP BY s.ticker, s.name, s.current_price
        ORDER BY total_quantity DESC
    `;
    
    connection.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching stock assets distribution:', err);
            return res.status(500).json({ error: '获取股票资产分布失败' });
        }
        
        res.json({
            stocks: results.map(row => {
                const allocatedQuantity = row.allocated_quantity || 0;
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
            })
        });
    });
}

// 获取特定银行的详细配置信息
export function getBankDetails(req, res) {
    const { bankName } = req.params;
    
    const query = `
        SELECT 
            ca.id,
            ca.cash_amount,
            ca.currency_code,
            ca.notes,
            p.name as portfolio_name,
            p.id as portfolio_id
        FROM cash_assets ca
        LEFT JOIN portfolio_assets pa ON ca.id = pa.asset_id AND pa.asset_type = 'cash'
        LEFT JOIN portfolios p ON pa.portfolio_id = p.id
        WHERE ca.bank_name = ?
        ORDER BY ca.cash_amount DESC
    `;
    
    connection.query(query, [bankName], (err, results) => {
        if (err) {
            console.error('Error fetching bank details:', err);
            return res.status(500).json({ error: '获取银行详情失败' });
        }
        
        // 计算总金额
        const totalAmount = results.reduce((sum, row) => sum + row.cash_amount, 0);
        
        // 计算已分配金额（所有已分配的）
        const allocatedAmount = results
            .filter(row => row.portfolio_id)
            .reduce((sum, row) => sum + row.cash_amount, 0);
        
        // 计算剩余可支配金额
        const availableAmount = totalAmount - allocatedAmount;
        
        const portfolioAllocations = results
            .filter(row => row.portfolio_id) // 只显示已分配的
            .map(row => ({
                portfolio_name: row.portfolio_name,
                portfolio_id: row.portfolio_id,
                amount: row.cash_amount,
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
}

// 获取特定股票的详细配置信息
export function getStockDetails(req, res) {
    const { ticker } = req.params;
    
    const query = `
        SELECT 
            s.id,
            s.quantity,
            s.purchase_price,
            s.current_price,
            s.purchase_date,
            p.name as portfolio_name,
            p.id as portfolio_id
        FROM stock_assets s
        LEFT JOIN portfolio_assets pa ON s.id = pa.asset_id AND pa.asset_type = 'stock'
        LEFT JOIN portfolios p ON pa.portfolio_id = p.id
        WHERE s.ticker = ?
        ORDER BY s.quantity DESC
    `;
    
    connection.query(query, [ticker], (err, results) => {
        if (err) {
            console.error('Error fetching stock details:', err);
            return res.status(500).json({ error: '获取股票详情失败' });
        }
        
        // 计算总股数
        const totalQuantity = results.reduce((sum, row) => sum + row.quantity, 0);
        
        // 计算已分配股数（所有已分配的）
        const allocatedQuantity = results
            .filter(row => row.portfolio_id)
            .reduce((sum, row) => sum + row.quantity, 0);
        
        // 计算剩余可支配股数
        const availableQuantity = totalQuantity - allocatedQuantity;
        
        const portfolioAllocations = results
            .filter(row => row.portfolio_id) // 只显示已分配的
            .map(row => ({
                portfolio_name: row.portfolio_name,
                portfolio_id: row.portfolio_id,
                quantity: row.quantity,
                purchase_price: row.purchase_price,
                current_price: row.current_price,
                purchase_date: row.purchase_date
            }));
        
        res.json({
            ticker: ticker,
            name: results[0]?.name || '',
            current_price: results[0]?.current_price || 0,
            total_quantity: totalQuantity,
            allocated_quantity: allocatedQuantity,
            available_quantity: availableQuantity,
            portfolio_allocations: portfolioAllocations
        });
    });
}

// 获取特定股票的历史价格数据
export function getStockHistory(req, res) {
    // 设置响应头，防止缓存
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    });

    const { ticker } = req.params;
    
    // 从all_stocks获取股票基本信息
    const stockQuery = `
        SELECT id, ticker, name, market_price
        FROM all_stocks 
        WHERE ticker = ?
        ORDER BY record_date DESC
        LIMIT 1
    `;
    
    connection.query(stockQuery, [ticker], (err, stockResults) => {
        if (err) {
            console.error('Error fetching stock info:', err);
            return res.status(500).json({ error: '获取股票信息失败' });
        }
        
        if (stockResults.length === 0) {
            return res.status(404).json({ error: '未找到该股票' });
        }
        
        const stockInfo = stockResults[0];
        const stockId = stockInfo.id;
        
        // 直接从stocks_history获取历史数据，使用all_stocks的id，并去重
        const historyQuery = `
            SELECT DISTINCT record_date, current_price
            FROM stocks_history 
            WHERE stock_id = ?
            ORDER BY record_date ASC
        `;
        
        connection.query(historyQuery, [stockId], (err, historyResults) => {
            if (err) {
                console.error('Error fetching stock history:', err);
                return res.status(500).json({ error: '获取股票历史数据失败' });
            }
            
            if (historyResults.length === 0) {
                return res.status(404).json({ error: '未找到该股票的历史数据' });
            }
            
            // 计算价格变化百分比
            const history = historyResults.map((record, index) => {
                let priceChange = 0;
                let priceChangePercent = 0;
                
                if (index > 0) {
                    const previousPrice = historyResults[index - 1].current_price;
                    priceChange = record.current_price - previousPrice;
                    priceChangePercent = (priceChange / previousPrice) * 100;
                }
                
                return {
                    date: record.record_date,
                    price: record.current_price,
                    priceChange: priceChange,
                    priceChangePercent: priceChangePercent,
                    stockName: stockInfo.name,
                    ticker: stockInfo.ticker
                };
            });
            
            res.json({
                ticker: ticker,
                stockName: stockInfo.name,
                currentPrice: stockInfo.market_price,
                history: history
            });
        });
    });
}