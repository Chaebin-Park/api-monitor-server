// test-full-flow.js
// 전체 데이터 흐름 테스트 (API → MongoDB)

const axios = require('axios');
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function testFullFlow() {
  console.log('🚀 전체 데이터 흐름 테스트\n');
  
  const mongoClient = new MongoClient(process.env.MONGODB_URI);
  
  try {
    // 1. MongoDB 연결
    console.log('1️⃣ MongoDB 연결 중...');
    await mongoClient.connect();
    const db = mongoClient.db('api-monitor');
    const collection = db.collection('api-data');
    console.log('✅ MongoDB 연결 성공\n');
    
    // 2. 공공 API 호출
    console.log('2️⃣ 공공 API 호출 중...');
    const response = await axios.get(process.env.PUBLIC_API_URL, {
      params: {
        serviceKey: process.env.PUBLIC_API_KEY,
        dataType: 'JSON',
        pageNo: 1,
        numOfRows: 10
      }
    });
    
    console.log('API 응답 타입:', typeof response.data);
    
    // 3. 응답 분석
    if (typeof response.data === 'string') {
      console.error('❌ XML 응답 수신 (에러일 가능성)');
      console.log('응답 내용:', response.data.substring(0, 300));
      
      if (response.data.includes('SERVICE_KEY_IS_NOT_REGISTERED_ERROR')) {
        console.error('\n🚨 서비스 키 오류!');
        console.error('MongoDB에 이런 에러가 저장되고 있습니다.');
        
        // 에러 문서 예시
        const errorDoc = {
          data: response.data,
          timestamp: new Date(),
          error: true,
          errorType: 'SERVICE_KEY_ERROR'
        };
        
        console.log('\n저장될 에러 문서:', errorDoc);
        return;
      }
    } else if (response.data?.response) {
      console.log('✅ JSON 응답 수신');
      
      const result = response.data.response;
      console.log('Result Code:', result.header?.resultCode);
      console.log('Total Count:', result.body?.totalCount);
      
      // 4. 정상 데이터 저장 시뮬레이션
      if (result.header?.resultCode === '00') {
        console.log('\n3️⃣ 정상 데이터 저장 시뮬레이션');
        
        const testDoc = {
          data: result.body,
          notificationIds: [],
          timestamp: new Date(),
          totalCount: result.body.totalCount
        };
        
        console.log('저장될 정상 문서 구조:');
        console.log({
          ...testDoc,
          data: '... (실제 알림 데이터) ...'
        });
        
        // 실제 저장 테스트 (주석 해제하면 저장됨)
        // const insertResult = await collection.insertOne(testDoc);
        // console.log('✅ 테스트 문서 저장 완료:', insertResult.insertedId);
      }
    }
    
    // 5. 현재 저장된 데이터 분석
    console.log('\n4️⃣ 현재 MongoDB 데이터 분석');
    
    // 에러 문서 개수
    const errorCount = await collection.countDocuments({
      $or: [
        { 'data': { $type: 'string' } },
        { 'error': true }
      ]
    });
    
    // 정상 문서 개수
    const validCount = await collection.countDocuments({
      'data.items': { $exists: true }
    });
    
    // 전체 문서 개수
    const totalCount = await collection.countDocuments();
    
    console.log(`📊 데이터 통계:`);
    console.log(`   전체 문서: ${totalCount}개`);
    console.log(`   정상 문서: ${validCount}개`);
    console.log(`   에러 문서: ${errorCount}개`);
    
    if (errorCount > 0) {
      console.log('\n⚠️  에러 문서가 있습니다. cleanup-error-data.js를 실행하세요.');
    }
    
  } catch (error) {
    console.error('\n❌ 테스트 실패:', error.message);
    
    if (axios.isAxiosError(error)) {
      console.error('API 응답:', error.response?.data);
    }
  } finally {
    await mongoClient.close();
    console.log('\n🔌 MongoDB 연결 종료');
  }
}

// 실행
testFullFlow();