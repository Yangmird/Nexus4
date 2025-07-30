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


// 获取投资组合资产分配比例
export async function getPortfolioAssetAllocation(req, res) {
    const portfolioId = req.params.portfolioId;

    try {
        // 使用WITH子句计算总价值和各项资产价值
        const query = `
            WITH portfolio_values AS (
                SELECT 
                    pa.id,
                    pa.asset_type,
                    CASE 
                        WHEN pa.asset_type = 'stock' THEN CONCAT(s.name, ' (', s.ticker, ')')
                        WHEN pa.asset_type = 'cash' THEN CONCAT('现金 (', c.currency_code, ')')
                    END AS asset_name,
                    CASE
                        WHEN pa.asset_type = 'stock' THEN pa.quantity * s.current_price
                        WHEN pa.asset_type = 'cash' THEN c.cash_amount
                    END AS asset_value
                FROM 
                    portfolio_assets pa
                LEFT JOIN 
                    stock_assets s ON pa.asset_id = s.id AND pa.asset_type = 'stock'
                LEFT JOIN 
                    cash_assets c ON pa.asset_id = c.id AND pa.asset_type = 'cash'
                WHERE 
                    pa.portfolio_id = ?
            ),
            total_value AS (
                SELECT SUM(asset_value) AS total FROM portfolio_values
            )
            SELECT 
                pv.*,
                ROUND((pv.asset_value / tv.total) * 100, 2) AS percentage
            FROM 
                portfolio_values pv
            CROSS JOIN 
                total_value tv
            ORDER BY 
                pv.asset_value DESC;
        `;

        const [results] = await connection.promise().query(query, [portfolioId]);

        if (results.length === 0) {
            return res.status(404).json({ message: '该投资组合没有资产或不存在' });
        }

        // 计算总价值
        const totalValue = results.reduce((sum, asset) => sum + parseFloat(asset.asset_value), 0);

        // 格式化返回数据
        const response = {
            portfolio_id: portfolioId,
            total_value: totalValue.toFixed(2),
            assets: results.map(asset => ({
                asset_id: asset.id,
                asset_type: asset.asset_type,
                asset_name: asset.asset_name,
                asset_value: parseFloat(asset.asset_value).toFixed(2),
                percentage: asset.percentage
            })),
            // 按资产类型汇总
            allocation_by_type: results.reduce((acc, asset) => {
                if (!acc[asset.asset_type]) {
                    acc[asset.asset_type] = {
                        total_value: 0,
                        percentage: 0,
                        count: 0
                    };
                }
                acc[asset.asset_type].total_value += parseFloat(asset.asset_value);
                acc[asset.asset_type].percentage += parseFloat(asset.percentage);
                acc[asset.asset_type].count++;
                return acc;
            }, {})
        };

        res.json(response);

    } catch (err) {
        console.error('计算资产分配比例错误:', err);
        res.status(500).json({ 
            error: '服务器错误',
            details: err.message 
        });
    }
}

// GET /api/available-shares/:ticker
export function getAvailableShares(req, res) {
    const { ticker } = req.params;

    const sqlTotal = `
    SELECT SUM(quantity) AS total
    FROM stock_assets
    WHERE ticker = ?`;
    const sqlLocked = `
    SELECT SUM(pa.quantity) AS locked
    FROM portfolio_assets pa
    JOIN stock_assets sa ON sa.id = pa.asset_id
    WHERE sa.ticker = ? AND pa.asset_type = 'stock'`;

    connection.query(sqlTotal, [ticker], (err, totalRows) => {
        if (err) return res.status(500).json({ error: '查询总股数失败' });
        connection.query(sqlLocked, [ticker], (err2, lockedRows) => {
            if (err2) return res.status(500).json({ error: '查询锁定股数失败' });

            const total   = Number(totalRows[0]?.total || 0);
            const locked  = Number(lockedRows[0]?.locked || 0);
            const available = total - locked;

            res.json({ available });
        });
    });
}
