/**
 * Exponential Moving Average (EMA) and Crossover Engine
 * Implements standard institutional EMA calculations for candlestick series.
 */

function calculateEMA(prices, period) {
  if (prices.length < period) return Array(prices.length).fill(null);
  
  const multiplier = 2 / (period + 1);
  const ema = new Array(prices.length).fill(null);
  
  // Initial SMA as baseline
  let initialSum = 0;
  for (let i = 0; i < period; i++) {
    initialSum += prices[i];
  }
  let prevEMA = initialSum / period;
  ema[period - 1] = Number(prevEMA.toFixed(4));
  
  // Calculate EMA for the remaining points
  for (let i = period; i < prices.length; i++) {
    const currentEMA = (prices[i] - prevEMA) * multiplier + prevEMA;
    ema[i] = Number(currentEMA.toFixed(4));
    prevEMA = currentEMA;
  }
  
  return ema;
}

function detectCrossovers(candles, emaFast, emaSlow) {
  const crossovers = [];
  
  for (let i = 1; i < candles.length; i++) {
    const prevFast = emaFast[i - 1];
    const prevSlow = emaSlow[i - 1];
    const currFast = emaFast[i];
    const currSlow = emaSlow[i];
    
    if (prevFast === null || prevSlow === null || currFast === null || currSlow === null) {
      continue;
    }
    
    // Golden Cross: Fast crosses above Slow
    if (prevFast <= prevSlow && currFast > currSlow) {
      crossovers.push({
        index: i,
        time: candles[i].open_time,
        price: candles[i].close_price,
        type: 'BULLISH',
        label: 'Golden Cross (EMA Fast > Slow)',
        fastEMA: currFast,
        slowEMA: currSlow
      });
    }
    // Death Cross: Fast crosses below Slow
    else if (prevFast >= prevSlow && currFast < currSlow) {
      crossovers.push({
        index: i,
        time: candles[i].open_time,
        price: candles[i].close_price,
        type: 'BEARISH',
        label: 'Death Cross (EMA Fast < Slow)',
        fastEMA: currFast,
        slowEMA: currSlow
      });
    }
  }
  
  return crossovers;
}

module.exports = {
  calculateEMA,
  detectCrossovers,
};
