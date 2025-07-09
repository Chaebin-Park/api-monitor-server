// test-service-key.js
// 공공 API 서비스 키가 올바른지 테스트

const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

async function testServiceKey() {
  console.log('🔍 공공 API 서비스 키 테스트\n');
  
  const url = process.env.PUBLIC_API_URL;
  const key = process.env.PUBLIC_API_KEY;
  
  console.log('API URL:', url || '❌ NOT SET');
  console.log('Service Key:', key ? `${key.substring(0, 10)}...` : '❌ NOT SET');
  console.log('Key Length:', key?.length || 0);
  
  if (!url || !key) {
    console.error('\n❌ 환경 변수가 설정되지 않았습니다.');
    return;
  }
  
  console.log('\n📡 API 호출 테스트...\n');
  
  // 1. 기본 테스트 (최소 파라미터)
  try {
    console.log('1️⃣ 기본 요청 테스트');
    const response1 = await axios.get(url, {
      params: {
        serviceKey: key,
        dataType: 'JSON',
        pageNo: 1,
        numOfRows: 1
      }
    });
    
    console.log('✅ 성공! 응답 상태:', response1.status);
    console.log('응답 타입:', typeof response1.data);
    
    if (typeof response1.data === 'string') {
      console.log('⚠️  응답이 문자열입니다 (XML일 가능성)');
      console.log('처음 200자:', response1.data.substring(0, 200));
      
      if (response1.data.includes('SERVICE_KEY_IS_NOT_REGISTERED_ERROR')) {
        console.error('\n❌ 서비스 키 오류 감지!');
        console.error('해결 방법:');
        console.error('1. data.go.kr에서 "서울교통공사_지하철알림정보" 활용 신청 상태 확인');
        console.error('2. 상태가 "승인"인지 확인');
        console.error('3. 일반 인증키(Encoding) 복사해서 사용');
        return;
      }
    } else {
      console.log('✅ JSON 응답 수신');
      console.log('응답 구조:', Object.keys(response1.data));
      
      if (response1.data.response) {
        const header = response1.data.response.header;
        const body = response1.data.response.body;
        
        console.log('\n📊 API 응답 정보:');
        console.log('Result Code:', header?.resultCode);
        console.log('Result Message:', header?.resultMsg);
        console.log('Total Count:', body?.totalCount);
        
        if (body?.items) {
          console.log('✅ 정상적인 API 응답입니다!');
        }
      }
    }
  } catch (error) {
    console.error('❌ API 호출 실패:', error.message);
    
    if (error.response) {
      console.error('응답 상태:', error.response.status);
      console.error('응답 데이터:', error.response.data);
    }
  }
  
  // 2. 날짜 범위 테스트
  console.log('\n2️⃣ 날짜 범위 조회 테스트');
  try {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    
    const todayStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10).replace(/-/g, '');
    
    console.log(`날짜 범위: ${sevenDaysAgoStr} ~ ${todayStr}`);
    
    const response2 = await axios.get(url, {
      params: {
        serviceKey: key,
        dataType: 'JSON',
        pageNo: 1,
        numOfRows: 10,
        srchStartNoftOcrnYmd: sevenDaysAgoStr,
        srchEndNoftOcrnYmd: todayStr
      }
    });
    
    if (response2.data?.response?.body) {
      const body = response2.data.response.body;
      console.log(`✅ 최근 7일간 알림: ${body.totalCount}건`);
      
      if (body.items?.item) {
        const items = Array.isArray(body.items.item) ? body.items.item : [body.items.item];
        console.log('\n📋 최근 알림 예시:');
        items.slice(0, 3).forEach((item, idx) => {
          console.log(`\n[${idx + 1}] ${item.noftTtl}`);
          console.log(`   발생일시: ${item.noftOcrnDt}`);
          console.log(`   호선: ${item.lineNmLst}`);
        });
      }
    }
  } catch (error) {
    console.error('날짜 범위 조회 실패:', error.message);
  }
  
  // 3. 브라우저 테스트 URL 생성
  console.log('\n3️⃣ 브라우저에서 테스트할 URL:');
  const testUrl = `${url}?serviceKey=${key}&dataType=JSON&pageNo=1&numOfRows=1`;
  console.log(testUrl);
  console.log('\n위 URL을 브라우저에 붙여넣어 직접 확인해보세요.');
}

// 실행
testServiceKey();