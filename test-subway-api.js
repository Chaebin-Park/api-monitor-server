// test-subway-api.js
const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

async function testSubwayAPI() {
  const url = process.env.PUBLIC_API_URL;
  const key = process.env.PUBLIC_API_KEY;
  
  console.log('🚇 Testing Seoul Metro Notification API...');
  console.log('URL:', url || 'NOT SET');
  console.log('Key:', key ? key.substring(0, 10) + '...' : 'NOT SET');
  
  if (!url || !key) {
    console.error('❌ PUBLIC_API_URL or PUBLIC_API_KEY not set');
    return;
  }
  
  try {
    // 오늘 날짜
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    // 최근 7일간 데이터 조회 (테스트용)
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10).replace(/-/g, '');
    
    console.log(`\n📅 Searching from ${sevenDaysAgoStr} to ${todayStr}`);
    
    const response = await axios.get(url, {
      params: {
        serviceKey: key,
        dataType: 'JSON',
        pageNo: 1,
        numOfRows: 10,
        srchStartNoftOcrnYmd: sevenDaysAgoStr,
        srchEndNoftOcrnYmd: todayStr
      },
      // 서비스키 인코딩 문제 방지
      paramsSerializer: (params) => {
        return Object.entries(params)
          .map(([key, value]) => `${key}=${value}`)
          .join('&');
      }
    });
    
    console.log('\n✅ API Response received!');
    console.log('Status:', response.status);
    
    // 응답 구조 파악
    if (response.data.response) {
      const header = response.data.response.header;
      const body = response.data.response.body;
      
      console.log('\n📊 Response Header:');
      console.log('Result Code:', header.resultCode);
      console.log('Result Message:', header.resultMsg);
      
      if (header.resultCode === '00' || header.resultCode === 0) {
        console.log('\n📊 Response Body:');
        console.log('Total Count:', body.totalCount);
        console.log('Page No:', body.pageNo);
        console.log('Num Of Rows:', body.numOfRows);
        
        if (body.items && body.items.item) {
          const items = Array.isArray(body.items.item) ? body.items.item : [body.items.item];
          console.log(`\n🚨 Found ${items.length} notifications:\n`);
          
          items.forEach((item, index) => {
            console.log(`--- Notification ${index + 1} ---`);
            console.log('제목:', item.noftTtl);
            console.log('내용:', item.noftCn);
            console.log('발생일시:', item.noftOcrnDt);
            console.log('호선:', item.lineNmLst);
            console.log('역:', item.stnSctnCdLst);
            console.log('시작시간:', item.xcseSitnBgngDt);
            console.log('종료시간:', item.xcseSitnEndDt);
            console.log('알림구분:', item.noftSeCd);
            console.log('');
          });
        } else {
          console.log('\n📭 No notifications found in the selected period');
        }
        
        // 데이터 해시 생성 테스트
        const crypto = require('crypto');
        const hash = crypto.createHash('md5').update(JSON.stringify(body)).digest('hex');
        console.log('\n🔐 Data Hash:', hash);
        
      } else {
        console.error('❌ API returned error:', header.resultMsg);
      }
    } else {
      console.log('Unexpected response structure:', Object.keys(response.data));
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      
      if (error.response.status === 401) {
        console.log('\n💡 인증 오류: 서비스키를 확인하세요');
      } else if (error.response.status === 500) {
        console.log('\n💡 서버 오류: API 서버 문제일 수 있습니다');
      }
    }
  }
}

// 실행
testSubwayAPI();