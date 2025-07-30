import connection from '../db_connect.js';

/**
 * 查询全部股票资产（未来可改为某个用户/投资组合下）
 */
export function getStockAssets(req, res) {
    const query = 'SELECT * FROM stock_assets ORDER BY purchase_date DESC';
    connection.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching stock assets:', err);
            res.status(500).send('Error fetching stock assets');
            return;
        }
        res.json(results);
    });
}

/**
 * 获取单个股票资产
 */
export function getStockAsset(req, res) {
    const { id } = req.params;
    const query = 'SELECT * FROM stock_assets WHERE id = ?';
    connection.query(query, [id], (err, results) => {
        if (err) {
            console.error('Error fetching stock asset:', err);
            res.status(500).send('Error fetching stock asset');
            return;
        }
        if (results.length === 0) {
            res.status(404).send('Stock asset not found');
            return;
        }
        res.json(results[0]);
    });
}

/**
 * 添加股票资产记录（如买入一只股票）
 * 前端传入：{ ticker, name, quantity, purchase_price, current_price, purchase_date }
 */
export function addStockAsset(req, res) {
    const { ticker, name, quantity, purchase_price, current_price, purchase_date } = req.body;
    const query = `
        INSERT INTO stock_assets 
        (ticker, name, quantity, purchase_price, current_price, purchase_date) 
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    connection.query(query, [ticker, name, quantity, purchase_price, current_price, purchase_date], (err, results) => {
        if (err) {
            console.error('Error adding stock asset:', err);
            res.status(500).send('Error adding stock asset');
            return;
        }
        res.status(201).json({
            id: results.insertId,
            ticker, name, quantity, purchase_price, current_price, purchase_date
        });
    });
}

/**
 * 更新持仓（支持加仓、减仓，如果减仓到 0，自动删除该资产）
 * 前端传入：{ ticker, name, quantity, purchase_price, current_price, purchase_date }
 */
export function updateStockAsset(req, res) {
    const { id } = req.params;
    const { ticker, name, quantity } = req.body;
    const purchase_date = req.body.purchase_date.split('T')[0];   // 取 YYYY-MM-DD
    const purchase_price = Number(req.body.purchase_price).toFixed(4);
    const current_price  = Number(req.body.current_price).toFixed(4);
    // 自动删除数量为 0 的记录
    if (parseFloat(quantity) === 0) {
        const deleteQuery = 'DELETE FROM stock_assets WHERE id = ?';
        connection.query(deleteQuery, [id], (err, results) => {
            if (err) {
                console.error('Error deleting stock asset in update:', err);
                res.status(500).send('Error deleting stock asset');
                return;
            }
            res.status(204).send(); // No content
        });
    } else {
        const updateQuery = `
            UPDATE stock_assets 
            SET ticker = ?, name = ?, quantity = ?, purchase_price = ?, current_price = ?, purchase_date = ?
            WHERE id = ?
        `;
        connection.query(updateQuery, [ticker, name, quantity, purchase_price, current_price, purchase_date, id], (err, results) => {
            if (err) {
                console.error('Error updating stock asset:', err);
                res.status(500).send('Error updating stock asset');
                return;
            }
            if (results.affectedRows === 0) {
                res.status(404).send('Stock asset not found');
                return;
            }
            res.json({ id, ticker, name, quantity, purchase_price, current_price, purchase_date });
        });
    }
}

/**
 * 删除股票资产（带“是否被组合占用”检查）
 */
export function deleteStockAsset(req, res) {
    const { id } = req.params;

    // 1. 检查是否被组合引用
    const checkQuery = `
        SELECT p.name AS portfolio_name
        FROM portfolio_assets pa
        JOIN portfolios p ON pa.portfolio_id = p.id
        WHERE pa.asset_type = 'stock' AND pa.asset_id = ?
    `;
    connection.query(checkQuery, [id], (err, rows) => {
        if (err) {
            console.error('Error checking stock usage:', err);
            return res.status(500).send('检查失败');
        }

        if (rows.length > 0) {
            const portfolios = rows.map(r => r.portfolio_name);
            return res.status(409).json({
                error: '该股票已被以下组合使用，无法删除',
                portfolios
            });
        }

        // 2. 未被占用，执行级联删除
        const deleteHistory = 'DELETE FROM stocks_assets_history WHERE stock_id = ?';
        const deleteAsset   = 'DELETE FROM stock_assets WHERE id = ?';

        connection.query(deleteHistory, [id], (hErr) => {
            if (hErr) return res.status(500).send('删除历史失败');
            connection.query(deleteAsset, [id], (aErr, results) => {
                if (aErr) return res.status(500).send('删除资产失败');
                if (results.affectedRows === 0) return res.status(404).send('资产不存在');
                res.status(204).send(); // 成功
            });
        });
    });
}
