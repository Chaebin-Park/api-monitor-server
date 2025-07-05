// test-firebase.js
require('dotenv').config({ path: '.env.local' });

async function testFirebase() {
  console.log('🔥 Testing Firebase Configuration...\n');
  
  // 1. 환경 변수 확인
  console.log('📋 Environment Variables Check:');
  console.log('PROJECT_ID:', process.env.FIREBASE_PROJECT_ID || '❌ NOT SET');
  console.log('CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL || '❌ NOT SET');
  console.log('PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? '✅ SET' : '❌ NOT SET');
  
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    console.error('\n❌ Firebase environment variables are missing!');
    return;
  }
  
  try {
    // 2. Firebase Admin 초기화
    console.log('\n🔧 Initializing Firebase Admin...');
    const admin = require('firebase-admin');
    
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    }
    
    console.log('✅ Firebase Admin initialized successfully!');
    
    // 3. 테스트 메시지 발송 (토픽으로)
    console.log('\n📨 Sending test message to topic: api_updates');
    
    const message = {
      notification: {
        title: '🚇 테스트 알림',
        body: 'Firebase FCM이 정상적으로 작동합니다!',
      },
      data: {
        type: 'test',
        timestamp: new Date().toISOString(),
        message: 'This is a test notification from Firebase'
      },
      topic: 'api_updates',
    };
    
    const response = await admin.messaging().send(message);
    console.log('✅ Test message sent successfully!');
    console.log('Response:', response);
    
    // 4. 프로젝트 정보 확인
    console.log('\n📊 Firebase Project Info:');
    console.log('Project ID:', admin.app().options.projectId);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.code === 'app/invalid-credential') {
      console.log('\n💡 Invalid credentials. Check:');
      console.log('1. Service account JSON file is correct');
      console.log('2. Private key format is correct (with \\n)');
      console.log('3. Project ID matches your Firebase project');
    } else if (error.code === 'messaging/registration-token-not-registered') {
      console.log('\n💡 No devices subscribed to the topic yet.');
      console.log('This is normal if no Android app has subscribed.');
    }
  }
}

// 실행
testFirebase();