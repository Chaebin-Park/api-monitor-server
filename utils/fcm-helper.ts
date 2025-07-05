// utils/fcm-helper.ts
// FCM 메시지 생성 헬퍼 함수

import { Message } from 'firebase-admin/messaging';

export interface SubwayNotification {
  noftTtl: string;      // 제목
  noftCn: string;       // 내용
  lineNmLst?: string;   // 호선
  noftOcrnDt: string;   // 발생시간
  xcseSitnBgngDt?: string; // 시작시간
  xcseSitnEndDt?: string;  // 종료시간
}

export function createSubwayNotificationMessage(
  notifications: SubwayNotification[],
  topic: string = 'api_updates'
): Message {
  const notification = notifications[0]; // 가장 최근 알림
  const count = notifications.length;
  
  // 호선 정보 파싱 (예: "1호선,2호선" → "1, 2호선")
  const lines = notification.lineNmLst
    ?.split(',')
    .map(line => line.replace('호선', ''))
    .join(', ') + '호선' || '전체';
  
  // 시간 포맷팅
  const time = notification.noftOcrnDt 
    ? new Date(notification.noftOcrnDt).toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit'
      })
    : '';
  
  return {
    notification: {
      title: `🚇 ${lines} 알림 ${count > 1 ? `(+${count - 1})` : ''}`,
      body: notification.noftTtl,
    },
    data: {
      type: 'subway_notification',
      timestamp: new Date().toISOString(),
      notificationCount: String(count),
      
      // 첫 번째 알림 상세 정보
      title: notification.noftTtl,
      content: notification.noftCn,
      lines: notification.lineNmLst || '',
      occurTime: notification.noftOcrnDt,
      startTime: notification.xcseSitnBgngDt || '',
      endTime: notification.xcseSitnEndDt || '',
      
      // 모든 알림 JSON (앱에서 파싱)
      allNotifications: JSON.stringify(notifications.slice(0, 5)) // 최대 5개
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'subway_alerts',
        priority: 'high',
        defaultSound: true,
        defaultVibrateTimings: true,
        // 아이콘 설정 (앱에서 설정 필요)
        icon: 'ic_subway',
        color: '#0052A4', // 서울 지하철 파란색
      }
    },
    topic: topic,
  };
}

// 테스트 메시지 생성
export function createTestMessage(topic: string = 'api_updates'): Message {
  return {
    notification: {
      title: '🚇 지하철 알림 테스트',
      body: '알림이 정상적으로 작동합니다.',
    },
    data: {
      type: 'test',
      timestamp: new Date().toISOString(),
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'subway_alerts',
      }
    },
    topic: topic,
  };
}