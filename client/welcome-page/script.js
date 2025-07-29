const baseUrl = 'http://localhost:8088/api';

async function fetchCashAssets() {
  try {
    const response = await fetch(`${baseUrl}/cash-assets`);
    const data = await response.json();

    const container = document.querySelector('.cash-section');
    container.innerHTML = '<h3>Cash:</h3>';

    let totalCash = 0;

    data.forEach(item => {
      const display = document.createElement('div');
      display.classList.add('cash-item');
      display.innerHTML = `<span>${item.bank_name}</span><span>${item.currency_code} ${item.cash_amount.toLocaleString()}</span>`;
      container.appendChild(display);
      totalCash += parseFloat(item.cash_amount);
    });

    document.getElementById('total-cash').textContent = totalCash.toLocaleString();
    updateTotalAmount();
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

    let totalStocks = 0;

    data.forEach(stock => {
      const display = document.createElement('div');
      display.classList.add('stock-item');
      display.innerHTML = `
        <span>${stock.name}</span>
        <span>${stock.quantity}股</span>
        <span>${(stock.current_price * stock.quantity).toLocaleString()}</span>`;
      container.appendChild(display);
      totalStocks += stock.current_price * stock.quantity;
    });

    document.getElementById('total-stocks').textContent = totalStocks.toLocaleString();
    updateTotalAmount();
  } catch (error) {
    console.error('股票资产加载失败:', error);
  }
}

function updateTotalAmount() {
  const cash = parseFloat(document.getElementById('total-cash').textContent.replace(/,/g, '')) || 0;
  const stocks = parseFloat(document.getElementById('total-stocks').textContent.replace(/,/g, '')) || 0;
  document.getElementById('total-amount').textContent = (cash + stocks).toLocaleString();
}

document.addEventListener('DOMContentLoaded', () => {
  fetchCashAssets();
  fetchStockAssets();
});
