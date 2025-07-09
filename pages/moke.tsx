// pages/mock.tsx
// 브라우저에서 테스트 이벤트를 생성하는 UI

import { useState } from 'react';

export default function MockEventPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [customData, setCustomData] = useState({
    title: '',
    content: '',
    lines: '',
    stations: ''
  });

  const createMockEvent = async (type: string, sendFCM: boolean = true) => {
    setLoading(true);
    setResult(null);

    try {
      const body: any = { type, sendFCM };
      
      if (type === 'custom') {
        body.notification = {
          noftTtl: customData.title || '커스텀 테스트 알림',
          noftCn: customData.content || '테스트 내용입니다.',
          lineNmLst: customData.lines || '1호선',
          stnSctnCdLst: customData.stations || '0150',
          noftSeCd: '99'
        };
      }

      const response = await fetch('/api/mock-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      setResult({
        status: response.status,
        data
      });
    } catch (error) {
      setResult({
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  const sampleEvents = [
    {
      title: '1호선 신호 장애',
      desc: '시청~종각 구간 지연',
      color: '#0052A4'
    },
    {
      title: '2호선 에스컬레이터 고장',
      desc: '강남역 3번 출구',
      color: '#00A84D'
    },
    {
      title: '4호선 운행 재개',
      desc: '사당~총신대입구 정상화',
      color: '#00A5DE'
    }
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🧪 테스트 이벤트 생성기</h1>
      <p style={{ color: '#666' }}>
        실제 API 대신 테스트 데이터를 생성해서 시스템을 테스트할 수 있습니다.
      </p>

      <div style={{ marginTop: '2rem' }}>
        <h2>📋 샘플 이벤트</h2>
        <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
          {sampleEvents.map((event, idx) => (
            <div 
              key={idx}
              style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontWeight: 'bold', color: event.color }}>
                  {event.title}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>
                  {event.desc}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={() => createMockEvent('random', true)}
                  disabled={loading}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  FCM 전송
                </button>
                <button 
                  onClick={() => createMockEvent('random', false)}
                  disabled={loading}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  DB만 저장
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h2>✏️ 커스텀 이벤트</h2>
        <div style={{ marginTop: '1rem' }}>
          <input
            type="text"
            placeholder="알림 제목"
            value={customData.title}
            onChange={(e) => setCustomData({ ...customData, title: e.target.value })}
            style={{
              width: '100%',
              padding: '0.5rem',
              marginBottom: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          />
          <textarea
            placeholder="알림 내용"
            value={customData.content}
            onChange={(e) => setCustomData({ ...customData, content: e.target.value })}
            style={{
              width: '100%',
              padding: '0.5rem',
              marginBottom: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              minHeight: '100px'
            }}
          />
          <input
            type="text"
            placeholder="호선 (예: 1호선, 2호선)"
            value={customData.lines}
            onChange={(e) => setCustomData({ ...customData, lines: e.target.value })}
            style={{
              width: '100%',
              padding: '0.5rem',
              marginBottom: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          />
          <button
            onClick={() => createMockEvent('custom', true)}
            disabled={loading || !customData.title}
            style={{
              padding: '0.5rem 2rem',
              background: customData.title ? '#9C27B0' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading || !customData.title ? 'not-allowed' : 'pointer'
            }}
          >
            커스텀 이벤트 생성
          </button>
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h2>🗑️ 데이터 관리</h2>
        <button
          onClick={() => createMockEvent('clear', false)}
          disabled={loading}
          style={{
            padding: '0.5rem 2rem',
            background: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          모든 테스트 데이터 삭제
        </button>
      </div>

      {loading && (
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <p>처리 중...</p>
        </div>
      )}

      {result && (
        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: result.error ? '#ffebee' : '#e8f5e9',
          borderRadius: '4px',
          overflow: 'auto'
        }}>
          <h3>{result.error ? '❌ 오류' : '✅ 결과'}</h3>
          <pre style={{ fontSize: '0.85rem' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginTop: '3rem', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <h3>💡 사용 방법</h3>
        <ol>
          <li>샘플 이벤트에서 "FCM 전송" 클릭 → 앱에 푸시 알림 전송</li>
          <li>"DB만 저장" 클릭 → MongoDB에만 저장 (알림 없음)</li>
          <li>커스텀 이벤트로 원하는 내용의 알림 생성</li>
          <li>Android 앱에서 알림을 받았는지 확인</li>
        </ol>
      </div>
    </div>
  );
}