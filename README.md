# Nexus-4 投资组合管理系统

## 项目概述

Nexus-4 是一个完整的个人投资组合管理系统，提供资产跟踪、投资组合管理和股票详情查看等功能。

## 技术栈

### 后端
- **Node.js** - 运行环境
- **Express.js** - Web框架
- **MySQL** - 数据库
- **mysql2** - MySQL驱动

### 前端
- **HTML5** - 页面结构
- **CSS3** - 样式设计
- **JavaScript (ES6+)** - 交互逻辑

## 功能特性

### 核心功能
1. **个人资产概览** - 查看现金和股票资产总额
2. **投资组合管理** - 创建和管理多个投资组合
3. **个人资产管理** - 添加、编辑、删除现金和股票资产
4. **股票详情查看** - 浏览所有股票信息和搜索功能
5. **新增资产** - 向投资组合添加现金和股票资产

### 交易功能
- 现金充值/转账
- 股票购买/抛售
- 资产编辑和删除

## 安装和运行

### 1. 安装依赖
```bash
npm install
```

### 2. 数据库设置
确保MySQL服务正在运行，然后执行：
```bash
mysql -u root -p < sql/table.sql
mysql -u root -p < sql/data.sql
```

### 3. 配置数据库连接
编辑 `server/db_connect.js` 文件，更新数据库连接信息：
```javascript
const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "你的密码",
    database: "portfolio_manager"
});
```

### 4. 启动服务器
```bash
npm start
```

服务器将在 http://localhost:8088 启动

## 页面导航

### 主页面 (index.html)
- 个人资产组成概览
- 投资组合选择
- 快速导航到其他功能

### 投资组合管理 (portfolio-management.html)
- 查询现金和股票资产
- 管理投资组合
- 编辑资产信息

### 个人资产管理 (asset-management.html)
- 现金资产操作（编辑、转账）
- 股票资产操作（购买、抛售、查看详情）

### 股票详情 (stock-details.html)
- 浏览所有股票信息
- 搜索股票功能
- 股票卡片展示

### 新增资产 (add-assets.html)
- 创建新投资组合
- 添加现金资产
- 添加股票资产

## API 接口

### 投资组合管理
- `GET /api/portfolios` - 获取所有投资组合
- `POST /api/portfolios` - 创建新投资组合
- `PUT /api/portfolios/:id` - 更新投资组合
- `DELETE /api/portfolios/:id` - 删除投资组合

### 现金资产管理
- `GET /api/cash-assets` - 获取所有现金资产
- `GET /api/cash-assets/:id` - 获取单个现金资产
- `POST /api/cash-assets` - 添加现金资产
- `PUT /api/cash-assets/:id` - 更新现金资产
- `DELETE /api/cash-assets/:id` - 删除现金资产

### 股票资产管理
- `GET /api/stock-assets` - 获取所有股票资产
- `GET /api/stock-assets/:id` - 获取单个股票资产
- `POST /api/stock-assets` - 添加股票资产
- `PUT /api/stock-assets/:id` - 更新股票资产
- `DELETE /api/stock-assets/:id` - 删除股票资产

### 投资组合资产
- `GET /api/:portfolioId/assets` - 获取投资组合资产
- `POST /api/portfolio-assets` - 添加资产到投资组合
- `PUT /api/portfolio-assets/:id` - 更新投资组合资产

### 所有资产
- `GET /api/all-assets` - 获取所有资产汇总
- `GET /api/all-stocks` - 获取所有股票信息

## 数据库结构

### 主要表
- `portfolios` - 投资组合表
- `cash_assets` - 现金资产表
- `stock_assets` - 股票资产表
- `portfolio_assets` - 投资组合资产关联表
- `all_stocks` - 所有股票信息表

## 使用说明

1. **首次使用**：访问 http://localhost:8088 查看主页面
2. **添加资产**：点击"新增资产"按钮，选择投资组合并添加现金或股票
3. **管理资产**：在个人资产管理页面进行交易操作
4. **查看详情**：在股票详情页面浏览所有股票信息

## 注意事项

- 确保MySQL服务正在运行
- 检查数据库连接配置
- 首次运行需要导入示例数据
- 所有金额计算使用精确的十进制类型

## 开发说明

### 项目结构
```
Nexus4/
├── client/                 # 前端页面
│   ├── index.html         # 主页面
│   ├── portfolio-management.html
│   ├── asset-management.html
│   ├── stock-details.html
│   └── add-assets.html
├── server/                # 后端代码
│   ├── controllers/       # 控制器
│   ├── routes/           # 路由
│   └── db_connect.js     # 数据库连接
├── sql/                  # 数据库脚本
├── index.js              # 服务器入口
└── package.json          # 项目配置
```

### 扩展功能
- 添加用户认证
- 实现实时股票价格更新
- 添加图表可视化
- 支持更多资产类型
- 添加风险评估功能
