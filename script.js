/**
 * script.js - Core application logic
 */

// Configuration
const CONFIG = {
    API_KEY: 'sandbox_c8j3iiaad3if863ead7g', // Demo Finnhub key (may expire, user should replace)
    BASE_URL: 'https://finnhub.io/api/v1',
    POLLING_INTERVAL: 60000, // 1 minute
};

let state = {
    currentSymbol: 'AAPL',
    watchlist: JSON.parse(localStorage.getItem('watchlist')) || ['AAPL', 'TSLA', 'MSFT', 'AMZN', 'GOOGL', 'NVDA', 'META', 'NFLX', 'AMD', 'COIN'],
    history: JSON.parse(localStorage.getItem('predictionHistory')) || [],
    currentData: [],
    theme: localStorage.getItem('theme') || 'dark',
    realtimeTimer: null,
    basePrice: 150.00
};

// Selectors
const elements = {
    search: document.getElementById('stock-search'),
    searchBtn: document.getElementById('search-btn'),
    price: document.getElementById('current-price'),
    priceChange: document.getElementById('price-change'),
    stockName: document.getElementById('stock-name'),
    stockSymbol: document.getElementById('stock-symbol'),
    high: document.getElementById('stock-high'),
    low: document.getElementById('stock-low'),
    volume: document.getElementById('stock-volume'),
    predictedPrice: document.getElementById('predicted-price'),
    signal: document.getElementById('buy-sell-signal'),
    trend: document.getElementById('trend-direction'),
    confidence: document.getElementById('confidence-bar'),
    confidencePct: document.getElementById('confidence-pct'),
    themeToggle: document.getElementById('theme-toggle'),
    watchlistContainer: document.getElementById('watchlist-container'),
    historyBody: document.getElementById('history-body'),
    ticker: document.getElementById('live-ticker'),
    navItems: document.querySelectorAll('.nav-item'),
    sections: document.querySelectorAll('.content-section'),
    savePredictionBtn: document.getElementById('save-prediction'),
    addToWatchlistBtn: document.getElementById('add-to-watchlist')
};

// Initialize Chart Handler
const analyzer = new StockAnalyzer('stockChart');

// --- API Functions ---

async function fetchQuote(symbol) {
    try {
        const response = await fetch(`${CONFIG.BASE_URL}/quote?symbol=${symbol}&token=${CONFIG.API_KEY}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching quote:', error);
        showNotification('Failed to fetch price data', 'error');
        return null;
    }
}

async function fetchHistory(symbol) {
    // We use a mock or demo data for history if API doesn't support full candle for free
    // In a real app, you'd use /stock/candle
    try {
        const to = Math.floor(Date.now() / 1000);
        const from = to - (30 * 24 * 60 * 60); // 30 days
        const response = await fetch(`${CONFIG.BASE_URL}/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${CONFIG.API_KEY}`);
        const data = await response.json();

        if (data.s === 'ok') {
            return data.t.map((timestamp, index) => ({
                date: new Date(timestamp * 1000).toLocaleDateString(),
                close: data.c[index]
            }));
        }
        throw new Error('No history available');
    } catch (error) {
        console.warn('Falling back to mock data for demo');
        return generateMockHistory(symbol);
    }
}

function generateMockHistory(symbol) {
    let history = [];
    let price = 150 + Math.random() * 100;
    const now = new Date();
    for (let i = 30; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        price += (Math.random() - 0.5) * 5;
        history.push({ date: d.toLocaleDateString(), close: price });
    }
    return history;
}

function updateStockUI(symbol, quote, history) {
    elements.stockSymbol.textContent = symbol;
    elements.stockName.textContent = symbol;

    state.basePrice = quote.c;
    const priceText = `$${state.basePrice.toFixed(2)}`;
    const change = quote.dp.toFixed(2);
    const isPositive = quote.dp >= 0;

    elements.price.textContent = priceText;
    elements.priceChange.textContent = `${isPositive ? '+' : ''}${change}%`;
    elements.priceChange.className = `change-indicator ${isPositive ? 'plus' : 'minus'}`;

    elements.high.textContent = `$${quote.h.toFixed(2)}`;
    elements.low.textContent = `$${quote.l.toFixed(2)}`;
    elements.volume.textContent = quote.v || 'N/A';

    // Update Chart
    state.currentData = history;
    analyzer.renderChart(history, symbol);

    // AI Prediction
    const prediction = StockAnalyzer.getPrediction(history);
    if (prediction) {
        elements.predictedPrice.textContent = `$${prediction.predictedPrice}`;
        elements.signal.textContent = prediction.signal;
        elements.signal.className = `signal-badge signal-${prediction.signal.toLowerCase()}`;
        elements.trend.textContent = prediction.trend;
        elements.confidence.style.width = `${prediction.confidence}%`;
        elements.confidencePct.textContent = `${prediction.confidence}%`;
    }

    startRealtimeSimulation();
}

function startRealtimeSimulation() {
    if (state.realtimeTimer) clearInterval(state.realtimeTimer);

    state.realtimeTimer = setInterval(() => {
        // Random drift: -0.1% to +0.1%
        const drift = (Math.random() - 0.5) * 0.2;
        state.basePrice += (state.basePrice * (drift / 100));

        // Update Price UI
        elements.price.textContent = `$${state.basePrice.toFixed(2)}`;

        // Update Chart Realtime
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        analyzer.updateRealtime(state.basePrice, now);

        // Visual pulse effect on price
        elements.price.classList.add('pulse-price');
        setTimeout(() => elements.price.classList.remove('pulse-price'), 200);

    }, 2000); // Update every 2 seconds for that "real" feeling
}

function updateWatchlist() {
    elements.watchlistContainer.innerHTML = '';
    state.watchlist.forEach(symbol => {
        const card = document.createElement('div');
        card.className = 'watchlist-card glass-card';
        card.innerHTML = `
            <div>
                <h3>${symbol}</h3>
            </div>
            <div class="actions">
                <button onclick="loadStock('${symbol}')" class="btn-primary">View</button>
                <button onclick="removeFromWatchlist('${symbol}')" class="btn-danger">×</button>
            </div>
        `;
        elements.watchlistContainer.appendChild(card);
    });
}

function updateHistory() {
    elements.historyBody.innerHTML = '';
    state.history.slice().reverse().forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td data-label="Date">${item.date}</td>
            <td data-label="Symbol"><strong>${item.symbol}</strong></td>
            <td data-label="Price at Prediction">$${item.priceAtPrediction}</td>
            <td data-label="Predicted Price">$${item.predictedPrice}</td>
            <td data-label="Signal"><span class="signal-badge signal-${item.signal.toLowerCase()}">${item.signal}</span></td>
        `;
        elements.historyBody.appendChild(row);
    });
}

function updateTicker() {
    elements.ticker.innerHTML = '';
    const tickerStocks = ['AAPL', 'TSLA', 'BTC', 'MSFT', 'NVDA', 'AMZN', 'META', 'GOOGL'];
    tickerStocks.forEach(symbol => {
        const item = document.createElement('div');
        item.className = 'ticker-item';
        item.innerHTML = `<span>${symbol}</span> <span class="plus">+${(Math.random() * 2).toFixed(2)}%</span>`;
        elements.ticker.appendChild(item);
    });
}

async function loadStock(symbol) {
    state.currentSymbol = symbol.toUpperCase();
    const quote = await fetchQuote(state.currentSymbol);
    if (!quote) return;

    const history = await fetchHistory(state.currentSymbol);
    updateStockUI(state.currentSymbol, quote, history);
}

// --- Actions ---

function showNotification(message, type = 'success') {
    const note = document.createElement('div');
    note.className = `notification ${type}`;
    note.textContent = message;
    document.getElementById('notifications').appendChild(note);
    setTimeout(() => note.remove(), 3000);
}

function removeFromWatchlist(symbol) {
    state.watchlist = state.watchlist.filter(s => s !== symbol);
    localStorage.setItem('watchlist', JSON.stringify(state.watchlist));
    updateWatchlist();
}

// --- Event Listeners ---

elements.searchBtn.addEventListener('click', () => {
    const symbol = elements.search.value.trim();
    if (symbol) loadStock(symbol);
});

elements.search.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') elements.searchBtn.click();
});

elements.addToWatchlistBtn.addEventListener('click', () => {
    if (!state.watchlist.includes(state.currentSymbol)) {
        state.watchlist.push(state.currentSymbol);
        localStorage.setItem('watchlist', JSON.stringify(state.watchlist));
        updateWatchlist();
        showNotification(`${state.currentSymbol} added to watchlist`);
    }
});

elements.savePredictionBtn.addEventListener('click', () => {
    const prediction = StockAnalyzer.getPrediction(state.currentData);
    const entry = {
        date: new Date().toLocaleString(),
        symbol: state.currentSymbol,
        priceAtPrediction: prediction.lastPrice,
        predictedPrice: prediction.predictedPrice,
        signal: prediction.signal
    };
    state.history.push(entry);
    localStorage.setItem('predictionHistory', JSON.stringify(state.history));
    updateHistory();
    showNotification('Prediction saved successfully');
});

elements.themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    state.theme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
    localStorage.setItem('theme', state.theme);
    elements.themeToggle.querySelector('.mode-text').textContent = state.theme === 'light' ? 'Light Mode' : 'Dark Mode';
    elements.themeToggle.querySelector('.mode-icon').textContent = state.theme === 'light' ? '☀️' : '🌙';
});

// Navigation Handling
elements.navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const target = item.getAttribute('data-target');

        elements.navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');

        elements.sections.forEach(s => {
            if (s.id === target) s.classList.remove('hidden');
            else s.classList.add('hidden');
        });
    });
});

document.getElementById('clear-history').addEventListener('click', () => {
    state.history = [];
    localStorage.setItem('predictionHistory', '[]');
    updateHistory();
});

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    if (state.theme === 'light') document.body.classList.add('light-mode');
    updateWatchlist();
    updateHistory();
    updateTicker();
    loadStock(state.currentSymbol);
});
