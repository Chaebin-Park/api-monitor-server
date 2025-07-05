// test-mongo-detailed.js
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function testConnection() {
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('❌ MONGODB_URI not found in .env.local');
    return;
  }
  
  // URI 파싱
  const uriParts = uri.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@([^\/]+)\/([^?]+)?(.*)?/);
  if (uriParts) {
    console.log('📍 Connection details:');
    console.log('   Username:', uriParts[1]);
    console.log('   Password:', '****' + uriParts[2].slice(-3));
    console.log('   Cluster:', uriParts[3]);
    console.log('   Database:', uriParts[4] || 'NOT SPECIFIED');
    console.log('   Options:', uriParts[5] || 'none');
  }
  
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
  });
  
  try {
    console.log('\n🔄 Attempting connection...');
    await client.connect();
    console.log('✅ Connected to MongoDB!');
    
    // 관리자 명령 실행
    const admin = client.db().admin();
    
    // 현재 사용자 정보
    try {
      const userInfo = await admin.command({ connectionStatus: 1 });
      console.log('\n👤 Current user info:');
      console.log('   Authenticated:', userInfo.authInfo.authenticatedUsers);
      console.log('   Roles:', userInfo.authInfo.authenticatedUserRoles);
    } catch (e) {
      console.log('   Could not get user info');
    }
    
    // 데이터베이스 목록
    try {
      const dbs = await admin.listDatabases();
      console.log('\n📚 Available databases:');
      dbs.databases.forEach(db => {
        console.log(`   - ${db.name} (${db.sizeOnDisk} bytes)`);
      });
    } catch (e) {
      console.log('   Could not list databases');
    }
    
    // api-monitor 데이터베이스 테스트
    console.log('\n🔍 Testing api-monitor database...');
    const db = client.db('api-monitor');
    const collections = await db.listCollections().toArray();
    console.log('   Collections:', collections.map(c => c.name).join(', ') || 'none');
    
    // 테스트 쓰기
    const testCollection = db.collection('test');
    const insertResult = await testCollection.insertOne({ 
      test: true, 
      timestamp: new Date() 
    });
    console.log('   ✅ Insert test successful:', insertResult.insertedId);
    
    // 삭제
    await testCollection.deleteOne({ _id: insertResult.insertedId });
    console.log('   ✅ Delete test successful');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.code === 18) {
      console.log('\n💡 Authentication failed. Possible causes:');
      console.log('   1. Wrong username or password');
      console.log('   2. User not created for this cluster');
      console.log('   3. Special characters in password not properly encoded');
    }
    
    if (error.message.includes('ENOTFOUND')) {
      console.log('\n💡 DNS resolution failed. Check:');
      console.log('   1. Cluster name in connection string');
      console.log('   2. Internet connection');
    }
  } finally {
    await client.close();
    console.log('\n🔌 Connection closed');
  }
}

testConnection();