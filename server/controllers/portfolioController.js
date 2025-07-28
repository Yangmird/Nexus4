import { createAServer } from "../db_connect.js";
const connection = createAServer();

// 获取 portfolio 下拉框选项
export function getPortfolioOptions(req, res) {
  const query = "SELECT id, name FROM portfolios";
  connection.query(query, (error, results) => {
    if (error) {
      console.error("获取组合选项失败:", error);
      return res.status(500).json({ error: "服务器错误" });
    }
    res.status(200).json(results);
  });
}

// 创建新的 portfolio（防止注入）
export function createPortfolio(req, res) {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "组合名称不能为空" });

  const query = "INSERT INTO portfolios (name) VALUES (?)";
  connection.query(query, [name], (error, result) => {
    if (error) {
      console.error("创建组合失败:", error);
      return res.status(500).json({ error: "服务器错误" });
    }
    res.status(201).json({ id: result.insertId, name });
  });
}

// 修改组合名称（防止注入）
export function updatePortfolio(req, res) {
  const portfolioId = req.params.id;
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "组合名称不能为空" });

  const query = "UPDATE portfolios SET name = ? WHERE id = ?";
  connection.query(query, [name, portfolioId], (error, result) => {
    if (error) {
      console.error("修改组合名称失败:", error);
      return res.status(500).json({ error: "服务器错误" });
    }
    res.status(200).json({ message: "修改成功" });
  });
}

// 删除 portfolio 及其关联记录（联动删除）
export function deletePortfolioWithRelations(req, res) {
  const portfolioId = req.params.id;

  connection.beginTransaction(err => {
    if (err) {
      console.error("事务启动失败:", err);
      return res.status(500).json({ error: "服务器错误" });
    }

    // 删除 portfolio_assets 中的关联记录
    connection.query("DELETE FROM portfolio_assets WHERE portfolio_id = ?", [portfolioId], (error1) => {
      if (error1) return connection.rollback(() => {
        console.error("删除 portfolio_assets 失败:", error1);
        res.status(500).json({ error: "清理资产关系失败" });
      });

      // 删除 portfolios 表中的记录
      connection.query("DELETE FROM portfolios WHERE id = ?", [portfolioId], (error2) => {
        if (error2) return connection.rollback(() => {
          console.error("删除 portfolio 失败:", error2);
          res.status(500).json({ error: "删除组合失败" });
        });

        connection.commit(errCommit => {
          if (errCommit) return connection.rollback(() => {
            console.error("提交事务失败:", errCommit);
            res.status(500).json({ error: "事务提交失败" });
          });

          res.status(200).json({ message: "组合及关联记录删除成功" });
        });
      });
    });
  });
}
