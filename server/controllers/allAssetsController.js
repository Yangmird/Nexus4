import connection from '../db_connect.js';

export function getAllAssets(req, res) {
    // 使用同一个连接顺序执行两个查询
    connection.query(
        'SELECT SUM(cash_amount) AS total_cash FROM cash_assets',
        (cashErr, cashResults) => {
            if (cashErr) {
                console.error('现金查询错误:', cashErr);
                return res.status(500).json({ error: '现金查询失败' });
            }

            connection.query(
                `SELECT SUM(s.current_price * pa.quantity) AS total_stocks
                 FROM stock_assets s
                 JOIN portfolio_assets pa ON s.id = pa.asset_id AND pa.asset_type = 'stock'`,
                (stockErr, stockResults) => {
                    if (stockErr) {
                        console.error('股票查询错误:', stockErr);
                        return res.status(500).json({ error: '股票查询失败' });
                    }

                    res.json({
                        total_cash: cashResults[0].total_cash || 0,
                        total_stocks: stockResults[0].total_stocks || 0,
                        total_assets: Number(cashResults[0].total_cash || 0) + Number(stockResults[0].total_stocks || 0)
                    });
                }
            );
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