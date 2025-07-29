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


// 获取所有股票信息
export function getAllStocks(req, res) {
    const query = 'SELECT * FROM all_stocks ORDER BY record_date DESC, ticker ASC';
    connection.query(query, (err, results) => {
        if (err) {
            console.error('获取所有股票失败:', err);
            return res.status(500).json({ error: '获取股票信息失败' });
        }
        res.json(results);
    });
}