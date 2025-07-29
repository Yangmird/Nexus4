const baseUrl = 'http://localhost:8088/api';

async function fetchCashAssets() {
  try {
    const response = await fetch(`${baseUrl}/cash-assets`);
    const data = await response.json();

    const container = document.querySelector('.cash-section');
    container.innerHTML = '<h3>Cash:</h3>';

    data.forEach(item => {
      const display = document.createElement('div');
      display.classList.add('cash-item');
      display.innerHTML = `<span>${item.bank_name}</span><span>${item.currency_code} ${item.cash_amount.toLocaleString()}</span>`;
      container.appendChild(display);
    });
  } catch (error) {
    console.error('现金资产加载失败:', error);
  }
}

async function fetchStockAssets() {
  try {
    const response = await fetch(`${baseUrl}/stock-assets`);
    const data = await response.json();

    const container = document.querySelector('.stocks-section');
    container.innerHTML = '<h3>Stocks:</h3>';

    data.forEach(stock => {
      const display = document.createElement('div');
      display.classList.add('stock-item');
      const totalValue = stock.current_price * stock.quantity;
      display.innerHTML = `
        <span>${stock.name}</span>
        <span>${stock.quantity}股</span>
        <span>${totalValue.toLocaleString()}</span>`;
      container.appendChild(display);
    });
  } catch (error) {
    console.error('股票资产加载失败:', error);
  }
}

async function fetchTotalAssets() {
  try {
    const response = await fetch(`${baseUrl}/all-assets`);
    const data = await response.json();

    document.getElementById('total-cash').textContent = data.total_cash.toLocaleString();
    document.getElementById('total-stocks').textContent = data.total_stocks.toLocaleString();
    document.getElementById('total-amount').textContent = data.total_assets.toLocaleString();
  } catch (error) {
    console.error('总资产加载失败:', error);
  }
}

// 加载组合按钮
async function fetchPortfolioOptions() {
  try {
    const response = await fetch(`${baseUrl}/portfolios/options`);
    const data = await response.json();

    const container = document.getElementById('portfolio-buttons');
    container.innerHTML = '';

    data.forEach((portfolio, index) => {
      const btn = document.createElement('button');
      btn.className = 'portfolio-btn';
      btn.textContent = portfolio.name;
      btn.dataset.portfolioId = portfolio.id;

      if (index === 0) {
        btn.classList.add('active');
//        loadPortfolioData(portfolio.id); // 默认加载第一个组合
      }

      btn.addEventListener('click', () => {
        document.querySelectorAll('.portfolio-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
//        loadPortfolioData(portfolio.id);
      });

      container.appendChild(btn);
    });
  } catch (error) {
    console.error('获取组合失败:', error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  fetchCashAssets();
  fetchStockAssets();
  fetchTotalAssets();
  fetchPortfolioOptions();
});
