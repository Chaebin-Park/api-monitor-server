// test-scenarios.js
// 다양한 시나리오의 테스트 이벤트 생성

const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const API_URL = 'http://localhost:3000/api/mock-event';

const scenarios = {
  // 1. 출근 시간 대규모 지연
  rushHourDelay: async () => {
    console.log('🚨 시나리오: 출근 시간 대규모 지연');
    
    const notifications = [
      {
        noftTtl: "[긴급] 2호선 전 구간 운행 중단",
        noftCn: "신호 시스템 오류로 2호선 전 구간 운행이 중단되었습니다. 복구 시간은 미정입니다.",
        lineNmLst: "2호선",
        noftSeCd: "01"
      },
      {
        noftTtl: "1호선 서울역~시청 구간 극심한 혼잡",
        noftCn: "2호선 운행 중단으로 인해 1호선 도심 구간이 극도로 혼잡합니다.",
        lineNmLst: "1호선",
        noftSeCd: "02"
      }
    ];
    
    for (const notification of notifications) {
      await axios.post(API_URL, {
        type: 'custom',
        sendFCM: true,
        notification
      });
      
      console.log(`✅ 전송: ${notification.noftTtl}`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2초 대기
    }
  },
  
  // 2. 점진적 복구
  gradualRecovery: async () => {
    console.log('🔧 시나리오: 점진적 복구');
    
    const updates = [
      {
        time: 0,
        notification: {
          noftTtl: "2호선 강남~삼성 구간 운행 재개",
          noftCn: "2호선 강남역~삼성역 구간의 운행이 재개되었습니다. 다른 구간은 여전히 운행 중단 상태입니다.",
          lineNmLst: "2호선"
        }
      },
      {
        time: 5000,
        notification: {
          noftTtl: "2호선 삼성~잠실 구간 운행 재개",
          noftCn: "2호선 삼성역~잠실역 구간까지 운행이 재개되었습니다.",
          lineNmLst: "2호선"
        }
      },
      {
        time: 10000,
        notification: {
          noftTtl: "2호선 전 구간 정상 운행",
          noftCn: "2호선 전 구간의 운행이 정상화되었습니다. 이용에 불편을 드려 죄송합니다.",
          lineNmLst: "2호선"
        }
      }
    ];
    
    for (const update of updates) {
      if (update.time > 0) {
        console.log(`⏳ ${update.time/1000}초 대기...`);
        await new Promise(resolve => setTimeout(resolve, update.time));
      }
      
      await axios.post(API_URL, {
        type: 'custom',
        sendFCM: true,
        notification: update.notification
      });
      
      console.log(`✅ 전송: ${update.notification.noftTtl}`);
    }
  },
  
  // 3. 다중 호선 동시 문제
  multiLineIssue: async () => {
    console.log('🚇 시나리오: 여러 호선 동시 문제 발생');
    
    const lines = ['1호선', '3호선', '4호선', '5호선'];
    const issues = ['신호 장애', '차량 고장', '선로 점검', '안전 점검'];
    
    for (let i = 0; i < lines.length; i++) {
      const notification = {
        noftTtl: `${lines[i]} ${issues[i]}로 인한 지연`,
        noftCn: `${lines[i]}에서 ${issues[i]}가 발생하여 5~10분 지연이 예상됩니다.`,
        lineNmLst: lines[i],
        noftSeCd: "01"
      };
      
      await axios.post(API_URL, {
        type: 'custom',
        sendFCM: true,
        notification
      });
      
      console.log(`✅ 전송: ${notification.noftTtl}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  },
  
  // 4. 데이터베이스만 테스트 (FCM 없이)
  dbOnlyTest: async () => {
    console.log('💾 시나리오: DB 저장만 테스트');
    
    for (let i = 0; i < 5; i++) {
      await axios.post(API_URL, {
        type: 'random',
        sendFCM: false // FCM 전송하지 않음
      });
      
      console.log(`✅ DB에 테스트 데이터 ${i + 1} 저장`);
    }
  },
  
  // 5. 테스트 데이터 정리
  cleanup: async () => {
    console.log('🗑️ 모든 테스트 데이터 삭제');
    
    const response = await axios.post(API_URL, {
      type: 'clear'
    });
    
    console.log('✅', response.data.message);
  }
};

// 실행
async function runScenario() {
  const args = process.argv.slice(2);
  const scenarioName = args[0];
  
  if (!scenarioName || !scenarios[scenarioName]) {
    console.log('사용 가능한 시나리오:');
    Object.keys(scenarios).forEach(name => {
      console.log(`  - ${name}`);
    });
    console.log('\n사용법: node test-scenarios.js [시나리오명]');
    console.log('예시: node test-scenarios.js rushHourDelay');
    return;
  }
  
  try {
    await scenarios[scenarioName]();
    console.log('\n✅ 시나리오 완료!');
  } catch (error) {
    console.error('❌ 오류:', error.message);
  }
}

runScenario();