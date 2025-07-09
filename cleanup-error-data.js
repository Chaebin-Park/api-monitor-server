// cleanup-error-data.js
// MongoDB에서 에러 데이터 정리하기

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function cleanupErrorData() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('api-monitor');
    const collection = db.collection('api-data');
    
    // 1. 에러 데이터 찾기
    console.log('\n🔍 Finding error documents...');
    const errorDocs = await collection.find({
      $or: [
        { 'data': { $type: 'string' } }, // 문자열 데이터 (XML 에러)
        { 'data.cmmMsgHeader': { $exists: true } }, // XML 에러 구조
        { 'data': /<OpenAPI_ServiceResponse>/ }, // XML 패턴
      ]
    }).toArray();
    
    console.log(`Found ${errorDocs.length} error documents`);
    
    if (errorDocs.length > 0) {
      console.log('\nSample error document:');
      console.log(JSON.stringify(errorDocs[0], null, 2));
      
      // 2. 삭제 확인
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise(resolve => {
        readline.question(`\nDelete ${errorDocs.length} error documents? (yes/no): `, resolve);
      });
      readline.close();
      
      if (answer.toLowerCase() === 'yes') {
        // 3. 에러 데이터 삭제
        const deleteResult = await collection.deleteMany({
          $or: [
            { 'data': { $type: 'string' } },
            { 'data.cmmMsgHeader': { $exists: true } },
          ]
        });
        
        console.log(`✅ Deleted ${deleteResult.deletedCount} error documents`);
      } else {
        console.log('❌ Deletion cancelled');
      }
    }
    
    // 4. 정상 데이터 확인
    console.log('\n📊 Checking valid documents...');
    const validDocs = await collection.find({
      'data.items': { $exists: true }
    }).limit(1).toArray();
    
    if (validDocs.length > 0) {
      console.log('✅ Found valid documents with proper structure');
    } else {
      console.log('⚠️  No valid documents found');
    }
    
    // 5. 통계
    const totalDocs = await collection.countDocuments();
    console.log(`\n📈 Total documents: ${totalDocs}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

// 실행
cleanupErrorData();