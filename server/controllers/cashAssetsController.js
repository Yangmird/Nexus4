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
    const query = `INSERT INTO cash_assets 
      (cash_amount, currency_code, bank_name, notes) 
      VALUES (?, ?, ?, ?)`;
    connection.query(query, [cash_amount, currency_code, bank_name, notes], (err, results) => {
        if (err) {
            console.error('Error adding cash asset:', err);
            res.status(500).send('Error adding cash asset');
            return;
        }
        res.status(201).json({ id: results.insertId, cash_amount, currency_code, bank_name, notes });
    });
}

// 更新现金资产（根据id）
export function updateCashAsset(req, res) {
    const { id } = req.params;
    const { cash_amount, currency_code, bank_name, notes } = req.body;
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

// 删除现金资产（根据id）
export function deleteCashAsset(req, res) {
    const { id } = req.params;
    const query = 'DELETE FROM cash_assets WHERE id = ?';
    connection.query(query, [id], (err, results) => {
        if (err) {
            console.error('Error deleting cash asset:', err);
            res.status(500).send('Error deleting cash asset');
            return;
        }
        if (results.affectedRows === 0) {
            res.status(404).send('Cash asset not found');
            return;
        }
        res.status(204).send();
    });
}
