/**
 * charts.js - Handles Chart.js visualization and AI Prediction Logic
 */

class StockAnalyzer {
    constructor(canvasId) {
        this.ctx = document.getElementById(canvasId).getContext('2d');
        this.chart = null;
        this.isCandlestick = true; // Use candlestick by default for realism
    }

    /**
     * Simple Linear Regression to predict next value
     */
    static linearRegression(y) {
        const n = y.length;
        const x = Array.from({ length: n }, (_, i) => i);

        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
        for (let i = 0; i < n; i++) {
            sumX += x[i];
            sumY += y[i];
            sumXY += x[i] * y[i];
            sumXX += x[i] * x[i];
        }

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        return slope * n + intercept;
    }

    static calculateSMA(data, period) {
        let sma = [];
        const prices = data.map(d => d.close);
        for (let i = 0; i < prices.length; i++) {
            if (i < period - 1) {
                sma.push(null);
                continue;
            }
            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += prices[i - j];
            }
            sma.push(sum / period);
        }
        return sma;
    }

    static getPrediction(data) {
        if (!data || data.length < 5) return null;

        const prices = data.map(d => d.close);
        const lastPrice = prices[prices.length - 1];

        const predictedPrice = this.linearRegression(prices);
        const sma20 = this.calculateSMA(data, 20);
        const sma5 = this.calculateSMA(data, 5);

        const lastSMA20 = sma20[sma20.length - 1];
        const lastSMA5 = sma5[sma5.length - 1];

        let signal = 'NEUTRAL';
        let confidence = 50;

        if (lastSMA5 > lastSMA20) {
            signal = 'BUY';
            confidence = Math.min(85, 60 + ((lastSMA5 / lastSMA20 - 1) * 1000));
        } else if (lastSMA5 < lastSMA20) {
            signal = 'SELL';
            confidence = Math.min(85, 60 + ((lastSMA20 / lastSMA5 - 1) * 1000));
        }

        const trend = predictedPrice > lastPrice ? 'UP' : 'DOWN';

        return {
            predictedPrice: predictedPrice.toFixed(2),
            signal: signal,
            trend: trend,
            confidence: Math.round(confidence),
            lastPrice: lastPrice
        };
    }

    renderChart(data, symbol) {
        if (this.chart) {
            this.chart.destroy();
        }

        const labels = data.map(d => d.date);
        const sma20 = StockAnalyzer.calculateSMA(data, 20);

        // Since we are using standard Chart.js (without financial plugin included), 
        // we simulate candlesticks using a custom 'bar' type with multiple data points 
        // OR we use a high-quality line chart with area styling which looks cleaner for real-time.
        // Let's stick to a highly styled Line Chart which is better for "Real-time movement".

        const chartData = {
            labels: labels,
            datasets: [
                {
                    label: 'Close Price',
                    data: data.map(d => d.close),
                    borderColor: '#00ff88',
                    backgroundColor: 'rgba(0, 255, 136, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2,
                    pointRadius: (ctx) => ctx.dataIndex === data.length - 1 ? 5 : 0,
                    pointBackgroundColor: '#00ff88',
                    pointBorderColor: '#fff',
                    pointHoverRadius: 6
                },
                {
                    label: 'SMA (20)',
                    data: sma20,
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    borderWidth: 1,
                    pointRadius: 0,
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.4
                }
            ]
        };

        this.chart = new Chart(this.ctx, {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 400
                },
                interaction: {
                    intersect: false,
                    mode: 'index',
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true,
                        backgroundColor: '#1a1a1a',
                        padding: 12,
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 13 },
                        displayColors: false,
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.5)',
                            maxTicksLimit: 10
                        }
                    },
                    y: {
                        position: 'right',
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: 'rgba(255, 255, 255, 0.5)' }
                    }
                }
            }
        });
    }

    updateRealtime(newPrice, date) {
        if (!this.chart) return;

        const data = this.chart.data.datasets[0].data;
        const labels = this.chart.data.labels;

        // Add new point and shift if too many
        data.push(newPrice);
        labels.push(date);

        if (data.length > 50) {
            data.shift();
            labels.shift();
        }

        // Re-calculate SMA for the new window
        const fullData = data.map((d, i) => ({ close: d, date: labels[i] }));
        const newSMA = StockAnalyzer.calculateSMA(fullData, 20);
        this.chart.data.datasets[1].data = newSMA;

        this.chart.update('none'); // Update without full animation for smoothness
    }
}
