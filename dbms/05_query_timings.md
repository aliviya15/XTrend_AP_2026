# XTrend – Query Performance Analysis

## 1. Project Details
- Project Name: XTrend
- Database: PostgreSQL
- Database Name: xtrend_db
- Checkpoint: CP4 – Query Performance Analysis

## 2. Query 1 – Market Candles by Cryptocurrency

**SQL Query:**
```sql
SELECT *
FROM market_candles
WHERE crypto_id = 1;
```

**Execution Method:**
```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM market_candles
WHERE crypto_id = 1;
```

**Execution Results:**

| Run | Execution Time |
|---|---:|
| 1 | 0.056 ms |
| 2 | 0.145 ms |
| 3 | 0.036 ms |

**Average Execution Time:** 0.079 ms

**Scan Type:** Bitmap Heap Scan + Bitmap Index Scan

**Index Used:** market_candles_crypto_id_interval_open_time_key

**Rows Returned:** 2

**Observation:** PostgreSQL used an existing index to retrieve the matching market candle records.

## 3. Conclusion

The first performance test was completed successfully. The query used an index scan strategy, and the average execution time across three runs was 0.079 ms.

Further queries and execution plan analysis will be added as testing progresses.
