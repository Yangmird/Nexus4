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
    const { ticker, name, quantity, purchase_price, current_price, purchase_date } = req.body;

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
 * 删除某一持仓记录（彻底清除）
 */
export function deleteStockAsset(req, res) {
    const { id } = req.params;
    const query = 'DELETE FROM stock_assets WHERE id = ?';
    connection.query(query, [id], (err, results) => {
        if (err) {
            console.error('Error deleting stock asset:', err);
            res.status(500).send('Error deleting stock asset');
            return;
        }
        if (results.affectedRows === 0) {
            res.status(404).send('Stock asset not found');
            return;
        }
        res.status(204).send(); // No content
    });
}
