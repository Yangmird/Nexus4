import connection from '../db_connect.js';

// 查询所有现金资产
export function getCashAssets(req, res) {
    const query = 'SELECT * FROM cash_assets';
    connection.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching cash assets:', err);
            res.status(500).send('Error fetching cash assets');
            return;
        }
        res.json(results);
    });
}

// 获取单个现金资产
export function getCashAsset(req, res) {
    const { id } = req.params;
    const query = 'SELECT * FROM cash_assets WHERE id = ?';
    connection.query(query, [id], (err, results) => {
        if (err) {
            console.error('Error fetching cash asset:', err);
            res.status(500).send('Error fetching cash asset');
            return;
        }
        if (results.length === 0) {
            res.status(404).send('Cash asset not found');
            return;
        }
        res.json(results[0]);
    });
}

// 添加新的现金资产
export function addCashAsset(req, res) {
    const { cash_amount, currency_code, bank_name, notes } = req.body;
    
    // 首先检查该银行是否已有现金资产记录
    const checkQuery = 'SELECT id, cash_amount FROM cash_assets WHERE bank_name = ?';
    connection.query(checkQuery, [bank_name], (err, results) => {
        if (err) {
            console.error('Error checking existing cash asset:', err);
            res.status(500).send('Error checking existing cash asset');
            return;
        }
        
        if (results.length > 0) {
            // 如果该银行已有现金资产记录，返回现有记录
            const existingAsset = results[0];
            res.status(200).json({ 
                id: existingAsset.id, 
                cash_amount: existingAsset.cash_amount, 
                currency_code, 
                bank_name, 
                notes 
            });
        } else {
            // 如果该银行没有现金资产记录，创建新记录
            const insertQuery = `INSERT INTO cash_assets 
                (cash_amount, currency_code, bank_name, notes) 
                VALUES (?, ?, ?, ?)`;
            connection.query(insertQuery, [cash_amount, currency_code, bank_name, notes], (err, results) => {
                if (err) {
                    console.error('Error adding cash asset:', err);
                    res.status(500).send('Error adding cash asset');
                    return;
                }
                res.status(201).json({ 
                    id: results.insertId, 
                    cash_amount, 
                    currency_code, 
                    bank_name, 
                    notes 
                });
            });
        }
    });
}

// 更新现金资产（根据id）
export function updateCashAsset(req, res) {
    const { id } = req.params;
    const { currency_code, bank_name, notes } = req.body;
    const cash_amount = Number(req.body.cash_amount).toFixed(2);
    const query = `UPDATE cash_assets SET 
      cash_amount = ?, currency_code = ?, bank_name = ?, notes = ? 
      WHERE id = ?`;
    connection.query(query, [cash_amount, currency_code, bank_name, notes, id], (err, results) => {
        if (err) {
            console.error('Error updating cash asset:', err);
            res.status(500).send('Error updating cash asset');
            return;
        }
        if (results.affectedRows === 0) {
            res.status(404).send('Cash asset not found');
            return;
        }
        res.json({ id, cash_amount, currency_code, bank_name, notes });
    });
}

/**
 * 删除现金资产（带“是否被组合占用”检查）
 */
export function deleteCashAsset(req, res) {
    const { id } = req.params;

    // 1. 检查是否被组合引用
    const checkQuery = `
        SELECT p.name AS portfolio_name
        FROM portfolio_assets pa
        JOIN portfolios p ON pa.portfolio_id = p.id
        WHERE pa.asset_type = 'cash' AND pa.asset_id = ?
    `;
    connection.query(checkQuery, [id], (err, rows) => {
        if (err) {
            console.error('Error checking cash usage:', err);
            return res.status(500).send('检查失败');
        }

        if (rows.length > 0) {
            const portfolios = rows.map(r => r.portfolio_name);
            return res.status(409).json({
                error: '该现金资产已被以下组合使用，无法删除',
                portfolios
            });
        }

        // 2. 未被占用，执行删除
        const deleteHistory = 'DELETE FROM stocks_assets_history WHERE stock_id = ?'; // 如有
        const deleteAsset   = 'DELETE FROM cash_assets WHERE id = ?';

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
