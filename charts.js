/**
 * charts.js - Handles Chart.js visualization and AI Prediction Logic
 */

class StockAnalyzer {
    constructor(canvasId) {
        this.ctx = document.getElementById(canvasId).getContext('2d');
        this.chart = null;
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

        // Predict next value (at index n)
        return slope * n + intercept;
    }

    /**
     * Calculate Simple Moving Average
     */
    static calculateSMA(data, period) {
        let sma = [];
        for (let i = 0; i < data.length; i++) {
            if (i < period - 1) {
                sma.push(null);
                continue;
            }
            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += data[i - j];
            }
            sma.push(sum / period);
        }
        return sma;
    }

    /**
     * Generate Prediction and Signal
     */
    static getPrediction(data) {
        if (!data || data.length < 5) return null;

        const prices = data.map(d => d.close);
        const lastPrice = prices[prices.length - 1];
        
        const predictedPrice = this.linearRegression(prices);
        const sma20 = this.calculateSMA(prices, 20);
        const sma5 = this.calculateSMA(prices, 5);
        
        const lastSMA20 = sma20[sma20.length - 1];
        const lastSMA5 = sma5[sma5.length - 1];
        
        let signal = 'NEUTRAL';
        let confidence = 50;

        // Signal Logic: Golden Cross / Death Cross-ish simplified
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

    /**
     * Update/Render Chart
     */
    renderChart(data, symbol) {
        if (this.chart) {
            this.chart.destroy();
        }

        const labels = data.map(d => d.date);
        const prices = data.map(d => d.close);
        const sma20 = StockAnalyzer.calculateSMA(prices, 20);

        this.chart = new Chart(this.ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Price',
                        data: prices,
                        borderColor: '#4dabf5',
                        backgroundColor: 'rgba(77, 171, 245, 0.1)',
                        fill: true,
                        tension: 0.3,
                        borderWidth: 2,
                        pointRadius: 0
                    },
                    {
                        label: 'SMA (20)',
                        data: sma20,
                        borderColor: '#f48fb1',
                        borderWidth: 2,
                        pointRadius: 0,
                        borderDash: [5, 5],
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index',
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(13, 17, 23, 0.9)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        display: true,
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 8,
                            color: 'rgba(255, 255, 255, 0.5)'
                        }
                    },
                    y: {
                        display: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.5)'
                        }
                    }
                }
            }
        });
    }
}
