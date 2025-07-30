import connection from '../db_connect.js';

// ✅ 模糊搜索股票（不区分大小写）
export function searchStocks(req, res) {
    const { query } = req.query;
    if (!query || query.trim().length === 0) return res.json([]);

    const sql = `
        SELECT a.ticker, a.name, a.market_price
        FROM all_stocks a
                 INNER JOIN (
            SELECT ticker, MAX(record_date) AS latest_date
            FROM all_stocks
            WHERE LOWER(ticker) LIKE LOWER(?) OR LOWER(name) LIKE LOWER(?)
            GROUP BY ticker
        ) AS latest ON a.ticker = latest.ticker AND a.record_date = latest.latest_date
    `;

    const searchTerm = `%${query}%`;

    connection.query(sql, [searchTerm, searchTerm], (err, results) => {
        if (err) {
            console.error('搜索股票失败:', err);
            return res.status(500).send('搜索失败');
        }
        res.json(results);
    });
}

// 根据股票代码和日期获取历史价格
export function getStockPrice(req, res) {
    const { ticker, date } = req.query;
    if (!ticker || !date) return res.status(400).json({ error: '缺少参数' });

    const sql = `
        SELECT sh.current_price AS price
        FROM stocks_history sh
                 JOIN all_stocks a ON a.id = sh.stock_id
        WHERE a.ticker = ? AND sh.record_date = ?
            LIMIT 1
    `;

    connection.query(sql, [ticker, date], (err, results) => {
        if (err) return res.status(500).json({ error: '服务器错误' });
        res.json(results.length ? { price: results[0].price } : { price: null });
    });
}