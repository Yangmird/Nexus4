import connection from '../db_connect.js';

// 查询某个组合下的所有资产（组合资产列表，包括股票和现金）
export function getPortfolioAssets(req, res) {
    const portfolioId = req.params.portfolioId;

    const query = 'SELECT * FROM portfolio_assets WHERE portfolio_id = ?';
    connection.query(query, [portfolioId], (err, results) => {
        if (err) {
            console.error('Error fetching portfolio assets:', err);
            return res.status(500).send('Error fetching portfolio assets');
        }

        if (results.length === 0) {
            return res.json([]);
        }

        const detailedAssets = [];
        let remaining = results.length;
        let hasResponded = false; // 🛑 防止重复响应

        results.forEach(asset => {
            const assetTable = asset.asset_type === 'stock' ? 'stock_assets' : 'cash_assets';
            const subQuery = `SELECT * FROM ${assetTable} WHERE id = ?`;

            connection.query(subQuery, [asset.asset_id], (subErr, subResults) => {
                if (hasResponded) return; // 如果已响应，就直接跳过
                if (subErr) {
                    console.error(`Error fetching ${asset.asset_type} asset:`, subErr);
                    hasResponded = true;
                    return res.status(500).send(`Error fetching ${asset.asset_type} asset`);
                }

                const detailKey = asset.asset_type; // 'stock' or 'cash'
                const fullAsset = {
                    ...asset,
                    [detailKey]: subResults[0] || null
                };

                detailedAssets.push(fullAsset);
                remaining--;

                if (remaining === 0 && !hasResponded) {
                    hasResponded = true;
                    return res.json(detailedAssets);
                }
            });
        });
    });
}

// 更新组合中的某项资产（例如修改数量 quantity）
export function updatePortfolioAsset(req, res) {
  const assetId = req.params.id;
  const { quantity } = req.body;

  if (quantity == null || isNaN(quantity) || quantity < 0) {
    return res.status(400).send('Invalid quantity');
  }

  connection.beginTransaction(err => {
    if (err) {
      console.error(err);
      return res.status(500).send('Transaction error');
    }

    connection.query('SELECT * FROM portfolio_assets WHERE id = ?', [assetId], (err, currentRows) => {
      if (err) {
        return connection.rollback(() => {
          console.error(err);
          res.status(500).send('Error querying portfolio asset');
        });
      }
      if (currentRows.length === 0) {
        return connection.rollback(() => {
          res.status(404).send('Portfolio asset not found');
        });
      }
      const currentAsset = currentRows[0];
      const assetType = currentAsset.asset_type;
      const assetIdInner = currentAsset.asset_id;

      connection.query(
        `SELECT COALESCE(SUM(quantity), 0) AS totalQuantity FROM portfolio_assets WHERE asset_type = ? AND asset_id = ? AND id != ?`,
        [assetType, assetIdInner, assetId],
        (err, sumRows) => {
          if (err) {
            return connection.rollback(() => {
              console.error(err);
              res.status(500).send('Error querying other assets');
            });
          }
          const otherQuantity = Number(sumRows[0].totalQuantity);

          const assetTable = assetType === 'stock' ? 'stock_assets' : 'cash_assets';
          const quantityField = assetType === 'stock' ? 'quantity' : 'cash_amount';

          connection.query(
            `SELECT ${quantityField} FROM ${assetTable} WHERE id = ?`,
            [assetIdInner],
            (err, personalRows) => {
              if (err) {
                return connection.rollback(() => {
                  console.error(err);
                  res.status(500).send('Error querying personal asset');
                });
              }
              if (personalRows.length === 0) {
                return connection.rollback(() => {
                  res.status(404).send('Personal asset not found');
                });
              }
              const personalQuantity = Number(personalRows[0][quantityField]);

              if (otherQuantity + Number(quantity) > personalQuantity) {
                return connection.rollback(() => {
                  res.status(400).send('New quantity exceeds personal asset holdings');
                });
              }

              connection.query(
                'UPDATE portfolio_assets SET quantity = ? WHERE id = ?',
                [quantity, assetId],
                (err, updateResult) => {
                  if (err) {
                    return connection.rollback(() => {
                      console.error(err);
                      res.status(500).send('Error updating portfolio asset');
                    });
                  }

                  if (updateResult.affectedRows === 0) {
                    return connection.rollback(() => {
                      res.status(404).send('Portfolio asset not found on update');
                    });
                  }

                  connection.commit(err => {
                    if (err) {
                      return connection.rollback(() => {
                        console.error(err);
                        res.status(500).send('Transaction commit error');
                      });
                    }
                    res.json({ id: assetId, quantity });
                  });
                }
              );
            }
          );
        }
      );
    });
  });
}

export function addPortfolioAsset(req, res) {
  const portfolio_id = req.params.portfolioId;  // 路由参数里取
  const { asset_type, asset_id, quantity } = req.body;

  // 基础校验
  if (!portfolio_id || !asset_type || !asset_id || quantity == null || isNaN(quantity) || quantity < 0) {
    return res.status(400).send('Missing or invalid parameters');
  }

  connection.beginTransaction(err => {
    if (err) {
      console.error('Transaction start error:', err);
      return res.status(500).send('Transaction error');
    }

    // 1. 校验个人资产是否存在
    const assetTable = asset_type === 'stock' ? 'stock_assets' : 'cash_assets';
    const quantityField = asset_type === 'stock' ? 'quantity' : 'cash_amount';

    connection.query(
      `SELECT ${quantityField} FROM ${assetTable} WHERE id = ?`,
      [asset_id],
      (err, personalRows) => {
        if (err) {
          return connection.rollback(() => {
            console.error(err);
            res.status(500).send('Error checking personal asset');
          });
        }

        if (personalRows.length === 0) {
          return connection.rollback(() => {
            res.status(404).send('Personal asset not found');
          });
        }

        const personalQuantity = Number(personalRows[0][quantityField]);

        // 2. 查询该个人资产在其他组合中已用多少
        connection.query(
          `SELECT COALESCE(SUM(quantity), 0) AS usedQuantity
           FROM portfolio_assets
           WHERE asset_type = ? AND asset_id = ?`,
          [asset_type, asset_id],
          (err, usedRows) => {
            if (err) {
              return connection.rollback(() => {
                console.error(err);
                res.status(500).send('Error checking existing allocations');
              });
            }

            const usedQuantity = Number(usedRows[0].usedQuantity);
            const totalAfterAdd = usedQuantity + Number(quantity);

            if (totalAfterAdd > personalQuantity) {
              return connection.rollback(() => {
                res.status(400).send('Quantity exceeds personal asset holdings');
              });
            }

            // 3. 插入 portfolio_assets
            connection.query(
              `INSERT INTO portfolio_assets (portfolio_id, asset_type, asset_id, quantity)
               VALUES (?, ?, ?, ?)`,
              [portfolio_id, asset_type, asset_id, quantity],
              (err, insertResult) => {
                if (err) {
                  return connection.rollback(() => {
                    console.error(err);
                    res.status(500).send('Error inserting portfolio asset');
                  });
                }

                connection.commit(err => {
                  if (err) {
                    return connection.rollback(() => {
                      console.error(err);
                      res.status(500).send('Commit error');
                    });
                  }

                  res.status(201).json({
                    id: insertResult.insertId,
                    portfolio_id,
                    asset_type,
                    asset_id,
                    quantity,
                  });
                });
              }
            );
          }
        );
      }
    );
  });
}

