// pages/test.tsx
// 브라우저에서 API 테스트하는 페이지

import { useState } from 'react';

export default function TestPage() {
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [cronSecret, setCronSecret] = useState('');
  
  const testApi = async (endpoint: string, includeAuth: boolean) => {
    setLoading(true);
    setResult(null);
    
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (includeAuth && cronSecret) {
        headers['Authorization'] = `Bearer ${cronSecret}`;
      }
      
      const response = await fetch(`/api/${endpoint}`, {
        method: endpoint === 'health' ? 'GET' : 'POST',
        headers,
      });
      
      const data = await response.json();
      setResult({
        status: response.status,
        statusText: response.statusText,
        data,
      });
    } catch (error) {
      setResult({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
      <h1>API 테스트 페이지</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <label>
          CRON_SECRET: 
          <input
            type='password'
            value={cronSecret}
            onChange={(e) => setCronSecret(e.target.value)}
            placeholder='Vercel에서 확인한 CRON_SECRET'
            style={{ marginLeft: '0.5rem', width: '300px' }}
          />
        </label>
      </div>
      
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={() => testApi('health', false)}>
          Test /api/health
        </button>
        
        <button onClick={() => testApi('check-updates', false)}>
          Test /api/check-updates (인증 없이)
        </button>
        
        <button 
          onClick={() => testApi('check-updates', true)}
          disabled={!cronSecret}
        >
          Test /api/check-updates (인증 포함)
        </button>
        
        <button onClick={() => testApi('debug-auth', false)}>
          Debug Auth
        </button>
      </div>
      
      {loading && <p>Loading...</p>}
      
      {result && (
        <div style={{ 
          backgroundColor: '#f0f0f0', 
          padding: '1rem', 
          borderRadius: '4px',
          whiteSpace: 'pre-wrap',
          overflow: 'auto'
        }}>
          <strong>결과:</strong>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
      
      <div style={{ marginTop: '2rem', fontSize: '0.9rem', color: '#666' }}>
        <h3>사용 방법:</h3>
        <ol>
          <li>Vercel Dashboard에서 CRON_SECRET 확인</li>
          <li>위 입력란에 붙여넣기</li>
          <li>&apos;인증 포함&apos; 버튼 클릭</li>
        </ol>
        
        <h3>예상 결과:</h3>
        <ul>
          <li>인증 없이: 401 Unauthorized (production에서)</li>
          <li>인증 포함: 200 OK + 실제 데이터</li>
        </ul>
      </div>
    </div>
  );
}