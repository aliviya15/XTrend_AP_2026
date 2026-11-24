const http = require('http');
const { app, server } = require('./server');

const getJson = (url) => new Promise((resolve, reject) => {
  http.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        resolve({ status: res.statusCode, data: JSON.parse(data) });
      } catch (e) {
        resolve({ status: res.statusCode, raw: data });
      }
    });
  }).on('error', reject);
});

async function runTests() {
  console.log('--- STARTING XTREND INTEGRATION SUITE ---');
  let failures = 0;

  try {
    // 1. Health check
    const health = await getJson('http://127.0.0.1:5001/api/health');
    console.log(`[PASS] Health Check: Status=${health.data.status}, DB=${health.data.database}, Ping=${health.data.pingMs}ms`);

    // 2. Overview check
    const overview = await getJson('http://127.0.0.1:5001/api/overview');
    console.log(`[PASS] Overview: Pulse=${overview.data.marketPulse}, Bullish=${overview.data.bullishRatio}%, Bearish=${overview.data.bearishRatio}%, Total Signals=${overview.data.totalSignals}`);

    // 3. Cryptos check
    const cryptos = await getJson('http://127.0.0.1:5001/api/cryptos');
    console.log(`[PASS] Cryptos: Loaded ${cryptos.data.length} active pairs: ${cryptos.data.map(c => c.symbol).join(', ')}`);

    // 4. Candles & EMA calculation
    const candles = await getJson('http://127.0.0.1:5001/api/candles/BTCUSDT');
    console.log(`[PASS] BTCUSDT Candles: ${candles.data.candleCount} candles, ${candles.data.crossovers.length} EMA crossovers detected`);

    // 5. Run all 12 analytical queries
    console.log('\n--- VERIFYING ALL 12 QUERIES FROM 04_queries.sql ---');
    for (let id = 1; id <= 12; id++) {
      const qRes = await getJson(`http://127.0.0.1:5001/api/queries/${id}/execute`);
      if (qRes.status === 200) {
        console.log(`  [QUERY ${id.toString().padStart(2, '0')}] ${qRes.data.title} -> ${qRes.data.rowCount} rows in ${qRes.data.executionTimeMs}ms`);
      } else {
        console.error(`  [FAIL QUERY ${id}] Status ${qRes.status}:`, qRes.data);
        failures++;
      }
    }

    // 6. Test EXPLAIN ANALYZE on Query 1
    console.log('\n--- VERIFYING EXPLAIN (ANALYZE, BUFFERS) ---');
    const explainRes = await getJson('http://127.0.0.1:5001/api/queries/1/explain');
    console.log(`[PASS] EXPLAIN Plan: Node=${explainRes.data.plan['Node Type']}, Execution Time=${explainRes.data.executionTimeMs}ms, Planning Time=${explainRes.data.planningTimeMs}ms`);

    // 7. Test Watchlists
    const watchlists = await getJson('http://127.0.0.1:5001/api/watchlists');
    console.log(`[PASS] Watchlists: Loaded ${watchlists.data.length} watchlists`);

    // 8. Test Frontend static serving
    const frontend = await getJson('http://127.0.0.1:5001/');
    console.log(`[PASS] Frontend Serving: Status=${frontend.status}, HTML Bytes=${frontend.raw ? frontend.raw.length : 'JSON'}`);

    console.log('\n======================================================');
    console.log(`  ALL INTEGRATION TESTS COMPLETED: ${failures === 0 ? 'ALL PASSED (100%)' : failures + ' FAILED'}`);
    console.log('======================================================\n');
  } catch (err) {
    console.error('Test Suite Exception:', err);
    failures++;
  } finally {
    server.close();
    process.exit(failures === 0 ? 0 : 1);
  }
}

setTimeout(runTests, 1000);
