import { useState, useEffect } from "react";
import Head from "next/head";
import styles from "@/styles/Monitor.module.css";

interface SubwayNoticeItem {
  noftTtl: string;
  noftCn: string;
  noftOcrnDt: string;
  lineNmLst: string;
  stnSctnCdLst: string | null;
  crtrYmd: string;
  noftSeCd: string;
  nonstopYn: string;
  upbdnbSe: string;
  xcseSitnBgngDt: string | null;
  xcseSitnEndDt: string | null;
}

interface SubwayData {
  items: {
    item: SubwayNoticeItem[];
  };
  pageNo: number;
  numOfRows: number;
  totalCount: number;
}

interface ApiDataItem {
  _id: string;
  data: SubwayData;
  timestamp: string;
  hash: string;
}

interface ApiResponse {
  success: boolean;
  data: ApiDataItem[];
  count: number;
}

export default function Monitor() {
  const [apiData, setApiData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/get-all", {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

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
      setError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다"
      );
      setApiData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // 1분마다 자동으로 데이터 새로고침
    const intervalId = setInterval(() => {
      fetchData();
    }, 60000); // 60초 = 1분

    // cleanup: 컴포넌트 unmount 시 interval 정리
    return () => clearInterval(intervalId);
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);

    try {
      // 지하철 API를 즉시 호출하고 DB에 저장
      const response = await fetch("/api/refresh-data", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          setError("데이터가 없습니다");
          setApiData(null);
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.message || "데이터를 불러오는데 실패했습니다");
      }

      const data = await response.json();
      setApiData(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다"
      );
      setApiData(null);
    } finally {
      setLoading(false);
    }
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

  const getLineColor = (lineName: string) => {
    const lineColors: Record<string, string> = {
      "1호선": "#0052A4",
      "2호선": "#00A84D",
      "3호선": "#EF7C1C",
      "4호선": "#00A5DE",
      "5호선": "#996CAC",
      "6호선": "#CD7C2F",
      "7호선": "#747F00",
      "8호선": "#E6186C",
      "9호선": "#BDB092",
    };

    for (const [key, color] of Object.entries(lineColors)) {
      if (lineName.includes(key)) {
        return color;
      }
    }
    return "#999";
  };

  const getNoticeTypeLabel = (noftSeCd: string) => {
    const types: Record<string, string> = {
      "1": "운행중지",
      "2": "지연",
      "3": "서행",
      "4": "우회",
      "5": "기타",
    };
    return types[noftSeCd] || "알림";
  };

  return (
    <>
      <Head>
        <title>지하철 운행 정보 모니터</title>
        <meta name="description" content="지하철 운행 정보 모니터링 대시보드" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.container}>
        <header className={styles.header}>
          <h1>🚇 지하철 운행 정보</h1>
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

          {apiData && apiData.data && (
            <div className={styles.dataContainer}>
              {/* 최신 데이터 (오늘의 이슈) */}
              {apiData.data.length > 0 && (
                <div className={styles.latestSection}>
                  <h2 className={styles.sectionTitle}>🔴 최신 이슈</h2>
                  {(() => {
                    const latestItem = apiData.data[0];
                    return (
                      <div key={latestItem._id} className={styles.dataSet}>
                        <div className={styles.dataSetHeader}>
                          <div className={styles.timestamp}>
                            📅 {formatTimestamp(latestItem.timestamp)}
                          </div>
                        </div>

                        {latestItem.data.items?.item &&
                        latestItem.data.items.item.length > 0 ? (
                          <div className={styles.noticeList}>
                            {latestItem.data.items.item.map((notice, index) => (
                              <div key={index} className={styles.noticeCard}>
                                <div className={styles.noticeHeader}>
                                  <div
                                    className={styles.lineBadge}
                                    style={{
                                      backgroundColor: getLineColor(notice.lineNmLst),
                                    }}
                                  >
                                    {notice.lineNmLst}
                                  </div>
                                  <div className={styles.noticeType}>
                                    {getNoticeTypeLabel(notice.noftSeCd)}
                                  </div>
                                  <div className={styles.direction}>
                                    {notice.upbdnbSe}
                                  </div>
                                </div>

                                <h3 className={styles.noticeTitle}>
                                  {notice.noftTtl}
                                </h3>

                                <p className={styles.noticeContent}>
                                  {notice.noftCn}
                                </p>

                                <div className={styles.noticeFooter}>
                                  <span className={styles.noticeDate}>
                                    발생일시: {notice.noftOcrnDt}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className={styles.noNotice}>
                            ✅ 현재 운행 장애 없음 (공지사항 없음)
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* 과거 기록 */}
              {apiData.data.length > 1 && (
                <div className={styles.historySection}>
                  <button
                    className={styles.historyToggle}
                    onClick={() => setShowHistory(!showHistory)}
                  >
                    {showHistory ? "📂 과거 기록 접기" : "📁 과거 기록 보기"}
                    <span className={styles.historyCount}>
                      ({apiData.data.length - 1}건)
                    </span>
                  </button>

                  {showHistory && (
                    <div className={styles.historyList}>
                      {apiData.data.slice(1).map((dataItem) => (
                        <div key={dataItem._id} className={styles.dataSet}>
                          <div className={styles.dataSetHeader}>
                            <div className={styles.timestamp}>
                              📅 {formatTimestamp(dataItem.timestamp)}
                            </div>
                          </div>

                          {dataItem.data.items?.item &&
                          dataItem.data.items.item.length > 0 ? (
                            <div className={styles.noticeList}>
                              {dataItem.data.items.item.map((notice, index) => (
                                <div key={index} className={styles.noticeCard}>
                                  <div className={styles.noticeHeader}>
                                    <div
                                      className={styles.lineBadge}
                                      style={{
                                        backgroundColor: getLineColor(notice.lineNmLst),
                                      }}
                                    >
                                      {notice.lineNmLst}
                                    </div>
                                    <div className={styles.noticeType}>
                                      {getNoticeTypeLabel(notice.noftSeCd)}
                                    </div>
                                    <div className={styles.direction}>
                                      {notice.upbdnbSe}
                                    </div>
                                  </div>

                                  <h3 className={styles.noticeTitle}>
                                    {notice.noftTtl}
                                  </h3>

                                  <p className={styles.noticeContent}>
                                    {notice.noftCn}
                                  </p>

                                  <div className={styles.noticeFooter}>
                                    <span className={styles.noticeDate}>
                                      발생일시: {notice.noftOcrnDt}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className={styles.noNotice}>
                              ✅ 운행 장애 없음 (공지사항 없음)
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
