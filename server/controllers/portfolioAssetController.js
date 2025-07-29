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

// 购买验证函数
export function validatePurchase(req, res) {
  const { portfolio_id, asset_type, amount, ticker, quantity } = req.body;

  if (!portfolio_id || !asset_type) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  // 验证投资组合是否存在
  connection.query('SELECT id FROM portfolios WHERE id = ?', [portfolio_id], (err, portfolioRows) => {
    if (err) {
      console.error('Error checking portfolio:', err);
      return res.status(500).json({ error: '验证投资组合失败' });
    }

    if (portfolioRows.length === 0) {
      return res.status(404).json({ error: '投资组合不存在' });
    }

    if (asset_type === 'cash') {
      // 验证现金购买
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: '投入金额必须大于0' });
      }

      // 检查是否有足够的现金资产
      connection.query(
        'SELECT SUM(cash_amount) as total_cash FROM cash_assets',
        (err, cashRows) => {
          if (err) {
            console.error('Error checking cash assets:', err);
            return res.status(500).json({ error: '验证现金资产失败' });
          }

          const totalCash = Number(cashRows[0].total_cash) || 0;
          
          if (amount > totalCash) {
            return res.status(400).json({ 
              error: `投入金额 ${amount} 超过可用现金 ${totalCash}` 
            });
          }

          res.json({ 
            message: '现金购买验证通过',
            available_cash: totalCash,
            requested_amount: amount
          });
        }
      );
    } else if (asset_type === 'stock') {
      // 验证股票购买
      if (!ticker || !quantity || !amount) {
        return res.status(400).json({ error: '股票购买参数不完整' });
      }

      if (quantity <= 0) {
        return res.status(400).json({ error: '购买股数必须大于0' });
      }

      if (amount <= 0) {
        return res.status(400).json({ error: '购买金额必须大于0' });
      }

      // 检查股票是否存在
      connection.query(
        'SELECT id, name, current_price FROM stock_assets WHERE ticker = ?',
        [ticker],
        (err, stockRows) => {
          if (err) {
            console.error('Error checking stock:', err);
            return res.status(500).json({ error: '验证股票失败' });
          }

          if (stockRows.length === 0) {
            return res.status(404).json({ error: `股票 ${ticker} 不存在` });
          }

          const stock = stockRows[0];
          const expectedAmount = quantity * stock.current_price;
          
          // 检查购买金额是否合理（允许10%的误差）
          const priceDifference = Math.abs(amount - expectedAmount);
          const priceTolerance = expectedAmount * 0.1;
          
          if (priceDifference > priceTolerance) {
            return res.status(400).json({ 
              error: `购买金额 ${amount} 与预期金额 ${expectedAmount} 差异过大` 
            });
          }

          // 检查是否有足够的现金购买
          connection.query(
            'SELECT SUM(cash_amount) as total_cash FROM cash_assets',
            (err, cashRows) => {
              if (err) {
                console.error('Error checking cash for stock purchase:', err);
                return res.status(500).json({ error: '验证购买资金失败' });
              }

              const totalCash = Number(cashRows[0].total_cash) || 0;
              
              if (amount > totalCash) {
                return res.status(400).json({ 
                  error: `购买金额 ${amount} 超过可用现金 ${totalCash}` 
                });
              }

              res.json({ 
                message: '股票购买验证通过',
                stock_name: stock.name,
                stock_ticker: ticker,
                quantity: quantity,
                price_per_share: stock.current_price,
                total_amount: amount,
                available_cash: totalCash
              });
            }
          );
        }
      );
    } else {
      return res.status(400).json({ error: '不支持的资产类型' });
    }
  });
}

export function portfolioPerformance(req, res) {
  const { id } = req.params;

  // 查询股票资产
  connection.query(
    `SELECT pa.asset_id AS stock_id, pa.quantity, sa.purchase_price, sa.purchase_date
     FROM portfolio_assets pa
     JOIN stock_assets sa ON sa.id = pa.asset_id
     WHERE pa.portfolio_id = ? AND pa.asset_type = 'stock'`,
    [id],
    (err, stockAssets) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (stockAssets.length === 0) {
        // 没有股票资产，查询现金资产
        connection.query(
          `SELECT ca.cash_amount
           FROM portfolio_assets pa
           JOIN cash_assets ca ON ca.id = pa.asset_id
           WHERE pa.portfolio_id = ? AND pa.asset_type = 'cash'`,
          [id],
          (cashErr, cashAssets) => {
            if (cashErr) {
              console.error(cashErr);
              return res.status(500).json({ error: 'Internal server error' });
            }
            if (cashAssets.length === 0) {
              // 既无股票也无现金，返回空或提示
              return res.status(404).json({ message: 'No assets found in this portfolio.' });
            }
            // 返回现金资产，前端识别没有股票，只是现金
            return res.json({
              cashAssets,
              stockAssets: [],
              message: 'Pure cash portfolio',
            });
          }
        );
        return; // 重要：这里必须return，防止继续执行下面代码
      }

      // 有股票资产，继续查询股票历史收益，跟之前代码一样
      const result = [];
      let index = 0;

      const processNext = () => {
        if (index >= stockAssets.length) {
          return res.json({ stockAssets: result, cashAssets: [], message: 'Has stocks' });
        }

        const asset = stockAssets[index];

        connection.query(
          `SELECT record_date, current_price
           FROM stocks_history
           WHERE stock_id = ? AND record_date >= ?
           ORDER BY record_date ASC`,
          [asset.stock_id, asset.purchase_date],
          (err2, history) => {
            if (err2) {
              console.error(err2);
              return res.status(500).json({ error: 'Failed to fetch stock history.' });
            }

            const historyWithProfit = history.map(h => ({
              date: h.record_date,
              price: parseFloat(h.current_price),
              profit: parseFloat(((h.current_price - asset.purchase_price) * asset.quantity).toFixed(2)),
            }));

            result.push({
              stock_asset_id: asset.stock_id,
              quantity: asset.quantity,
              purchase_price: asset.purchase_price,
              purchase_date: asset.purchase_date,
              history: historyWithProfit,
            });

            index++;
            processNext();
          }
        );
      };

      processNext();
    }
  );
}


