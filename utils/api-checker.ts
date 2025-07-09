// utils/api-checker.ts
import axios from 'axios';
import crypto from 'crypto';

export interface ApiData {
  data: any;
  hash: string;
  timestamp: Date;
}

export async function fetchPublicApiData(): Promise<any> {
  try {
    // 오늘 날짜 구하기 (YYYYMMDD 형식)
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    console.log('Calling Public API:', process.env.PUBLIC_API_URL);
    console.log('Service Key exists:', !!process.env.PUBLIC_API_KEY);
    
    // 서울교통공사 지하철 알림정보 API 호출
    const response = await axios.get(process.env.PUBLIC_API_URL!, {
      params: {
        serviceKey: process.env.PUBLIC_API_KEY,
        dataType: 'JSON',
        pageNo: 1,
        numOfRows: 50, // 최근 50개 알림
        // 오늘 발생한 알림만 조회
        srchStartNoftOcrnYmd: todayStr,
        srchEndNoftOcrnYmd: todayStr,
      },
      timeout: 10000, // 10초 타임아웃
      // 서비스키 디코딩 문제 방지
      paramsSerializer: (params) => {
        return Object.entries(params)
          .map(([key, value]) => `${key}=${value}`)
          .join('&');
      }
    });
    
    console.log('Subway API Response Status:', response.status);
    console.log('Response Data Type:', typeof response.data);
    
    // XML 에러 응답 체크
    if (typeof response.data === 'string' && response.data.includes('OpenAPI_ServiceResponse')) {
      console.error('API returned XML error response:', response.data);
      
      // XML 파싱해서 에러 메시지 추출
      const errorMatch = response.data.match(/<errMsg>(.*?)<\/errMsg>/);
      const returnAuthMsg = response.data.match(/<returnAuthMsg>(.*?)<\/returnAuthMsg>/);
      const reasonCode = response.data.match(/<returnReasonCode>(.*?)<\/returnReasonCode>/);
      
      throw new Error(`API Error: ${returnAuthMsg?.[1] || errorMatch?.[1] || 'Unknown error'} (Code: ${reasonCode?.[1]})`);
    }
    
    // JSON 응답 구조 확인
    if (response.data?.response) {
      const result = response.data.response;
      console.log('Result Code:', result.header?.resultCode);
      console.log('Total Count:', result.body?.totalCount);
      
      // 정상 응답인 경우
      if (result.header?.resultCode === '00' || result.header?.resultCode === 0) {
        return result.body;
      } else {
        console.error('API Error:', result.header?.resultMsg);
        throw new Error(`API Error: ${result.header?.resultMsg}`);
      }
    }
    
    // 예상치 못한 응답 형식
    console.error('Unexpected API response format:', response.data);
    throw new Error('Invalid API response format');
    
  } catch (error) {
    console.error('Error fetching subway notification API:', error);
    if (axios.isAxiosError(error)) {
      console.error('Response data:', error.response?.data);
      console.error('Response status:', error.response?.status);
      
      // 에러 응답이 XML인 경우 확인
      if (typeof error.response?.data === 'string' && error.response.data.includes('SERVICE_KEY_IS_NOT_REGISTERED_ERROR')) {
        throw new Error('서비스 키가 등록되지 않았습니다. data.go.kr에서 서비스 키를 확인하세요.');
      }
    }
    throw error;
  }
}

export function generateDataHash(data: any): string {
  const jsonString = JSON.stringify(data);
  return crypto.createHash('md5').update(jsonString).digest('hex');
}

export function hasDataChanged(oldHash: string | null, newHash: string): boolean {
  return oldHash !== newHash;
}
