import { useState, useEffect } from "react";
import Head from "next/head";
import styles from "@/styles/Monitor.module.css";

interface ApiData {
  success: boolean;
  data: Record<string, unknown>;
  timestamp: string;
  hash: string;
}

export default function Monitor() {
  const [apiData, setApiData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/get-latest");

      if (!response.ok) {
        if (response.status === 404) {
          setError("데이터가 없습니다");
          setApiData(null);
          return;
        }
        throw new Error("데이터를 불러오는데 실패했습니다");
      }

      const data = await response.json();
      setApiData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다");
      setApiData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    fetchData();
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <>
      <Head>
        <title>API Monitor Dashboard</title>
        <meta name="description" content="API 모니터링 대시보드" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.container}>
        <header className={styles.header}>
          <h1>API 모니터 대시보드</h1>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className={styles.refreshButton}
          >
            {loading ? "로딩 중..." : "🔄 새로고침"}
          </button>
        </header>

        <main className={styles.main}>
          {loading && !apiData && (
            <div className={styles.loadingState}>
              <div className={styles.spinner}></div>
              <p>데이터를 불러오는 중...</p>
            </div>
          )}

          {error && (
            <div className={styles.errorState}>
              <h2>⚠️ {error}</h2>
            </div>
          )}

          {!loading && !error && !apiData && (
            <div className={styles.emptyState}>
              <h2>📭 데이터가 없습니다</h2>
              <p>아직 수집된 데이터가 없습니다. 나중에 다시 시도해주세요.</p>
            </div>
          )}

          {apiData && (
            <div className={styles.dataContainer}>
              <div className={styles.metaInfo}>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>마지막 업데이트:</span>
                  <span className={styles.metaValue}>
                    {formatTimestamp(apiData.timestamp)}
                  </span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>해시:</span>
                  <span className={styles.metaValue}>{apiData.hash}</span>
                </div>
              </div>

              <div className={styles.dataSection}>
                <h2>API 데이터</h2>
                <div className={styles.jsonViewer}>
                  <pre>{JSON.stringify(apiData.data, null, 2)}</pre>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
