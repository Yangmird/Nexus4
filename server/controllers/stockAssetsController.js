import { createAServer } from "../db_connect.js";
const connection = createAServer();

export function getStockAssets(req, res) {
    const query = 'SELECT * FROM stock_assets';
    connection.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching stock assets:', err);
            res.status(500).send('Error fetching stock assets');
            return;
        }
        res.json(results);
    });
}

export function addStockAsset(req, res) {
    const { name, quantity, price } = req.body;
    const query = 'INSERT INTO stock_assets (name, quantity, price) VALUES (?, ?, ?)';
    connection.query(query, [name, quantity, price], (err, results) => {
        if (err) {
            console.error('Error adding stock asset:', err);
            res.status(500).send('Error adding stock asset');
            return;
        }
        res.status(201).json({ id: results.insertId, name, quantity, price });
    });
}

export function updateStockAsset(req, res) {
    const { id } = req.params;
    const { name, quantity, price } = req.body;
    const query = 'UPDATE stock_assets SET name = ?, quantity = ?, price = ? WHERE id = ?';
    connection.query(query, [name, quantity, price, id], (err, results) => {
        if (err) {
            console.error('Error updating stock asset:', err);
            res.status(500).send('Error updating stock asset');
            return;
        }
        if (results.affectedRows === 0) {
            res.status(404).send('Stock asset not found');
            return;
        }
        res.json({ id, name, quantity, price });
    });
}

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
        res.status(204).send();
    });
}