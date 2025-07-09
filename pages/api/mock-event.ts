// pages/api/mock-event.ts
// 테스트용 지하철 알림 이벤트 생성

import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '../../lib/mongodb';
import admin from '../../lib/firebase-admin';

// 샘플 지하철 알림 데이터
const sampleNotifications = [
  {
    noftTtl: "1호선 신호 장애로 인한 운행 지연",
    noftCn: "현재 1호선 시청역~종각역 구간에서 신호 장애로 인해 열차 운행이 10~15분 지연되고 있습니다. 이용에 참고하시기 바랍니다.",
    lineNmLst: "1호선",
    stnSctnCdLst: "0150,0151",
    noftOcrnDt: new Date().toISOString(),
    xcseSitnBgngDt: new Date().toISOString(),
    xcseSitnEndDt: null,
    noftSeCd: "01",
    nonstopYn: "N"
  },
  {
    noftTtl: "2호선 강남역 에스컬레이터 고장",
    noftCn: "2호선 강남역 3번 출구 에스컬레이터가 고장으로 운행을 중단했습니다. 다른 출구를 이용해 주시기 바랍니다.",
    lineNmLst: "2호선",
    stnSctnCdLst: "0222",
    noftOcrnDt: new Date().toISOString(),
    xcseSitnBgngDt: new Date().toISOString(),
    xcseSitnEndDt: null,
    noftSeCd: "02",
    nonstopYn: "N"
  },
  {
    noftTtl: "4호선 사당역~총신대입구역 운행 재개",
    noftCn: "4호선 사당역~총신대입구역 구간 선로 점검이 완료되어 정상 운행을 재개합니다.",
    lineNmLst: "4호선",
    stnSctnCdLst: "0433,0434",
    noftOcrnDt: new Date().toISOString(),
    xcseSitnBgngDt: new Date(Date.now() - 3600000).toISOString(), // 1시간 전
    xcseSitnEndDt: new Date().toISOString(),
    noftSeCd: "03",
    nonstopYn: "N"
  }
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 개발 환경에서만 허용 (또는 인증 체크)
  const authHeader = req.headers.authorization;
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const {
      type = 'random', // random, custom, clear
      notification = null,
      sendFCM = true
    } = req.body;

    console.log('Creating mock event:', { type, sendFCM });

    // MongoDB 연결
    const client = await clientPromise;
    const db = client.db('api-monitor');
    const collection = db.collection('api-data');

    let mockData;
    let newNotifications = [];

    switch (type) {
      case 'custom':
        // 사용자 정의 알림
        if (!notification) {
          return res.status(400).json({ error: 'Notification data required for custom type' });
        }
        mockData = {
          items: {
            item: [{
              ...notification,
              noftOcrnDt: notification.noftOcrnDt || new Date().toISOString(),
              crtrYmd: new Date().toISOString().slice(0, 10).replace(/-/g, '')
            }]
          },
          totalCount: 1
        };
        newNotifications = [mockData.items.item[0]];
        break;

      case 'clear':
        // 모든 테스트 데이터 삭제
        const deleteResult = await collection.deleteMany({
          'data.isMockData': true
        });
        return res.status(200).json({
          success: true,
          message: `Deleted ${deleteResult.deletedCount} mock documents`
        });

      case 'random':
      default:
        // 랜덤 샘플 알림 생성
        const randomIndex = Math.floor(Math.random() * sampleNotifications.length);
        const randomNotification = {
          ...sampleNotifications[randomIndex],
          noftOcrnDt: new Date().toISOString(),
          // 고유 ID를 위해 타임스탬프 추가
          noftTtl: `[테스트 ${new Date().toLocaleTimeString('ko-KR')}] ${sampleNotifications[randomIndex].noftTtl}`
        };
        
        mockData = {
          items: {
            item: [randomNotification]
          },
          totalCount: 1,
          isMockData: true // 테스트 데이터 표시
        };
        newNotifications = [randomNotification];
        break;
    }

    // MongoDB에 저장
    const notificationIds = newNotifications.map(item => 
      `${item.noftOcrnDt}_${item.noftTtl}`.substring(0, 100)
    );

    await collection.insertOne({
      data: mockData,
      notificationIds,
      newNotifications,
      timestamp: new Date(),
      totalCount: mockData.totalCount,
      isMockData: true
    });

    // FCM 전송 (옵션)
    if (sendFCM && newNotifications.length > 0) {
      try {
        const notification = newNotifications[0];
        const message = {
          notification: {
            title: `🧪 [테스트] ${notification.lineNmLst || '지하철'} 알림`,
            body: notification.noftTtl,
          },
          data: {
            type: 'subway_notification',
            timestamp: new Date().toISOString(),
            notificationCount: String(newNotifications.length),
            title: notification.noftTtl,
            content: notification.noftCn,
            lines: notification.lineNmLst || '',
            occurTime: notification.noftOcrnDt,
            isMockData: 'true'
          },
          topic: 'api_updates',
        };

        const fcmResponse = await admin.messaging().send(message);
        console.log('FCM sent successfully:', fcmResponse);

        res.status(200).json({
          success: true,
          message: 'Mock event created and FCM sent',
          data: {
            notification: newNotifications[0],
            fcmMessageId: fcmResponse,
            mongoDocument: {
              notificationIds,
              timestamp: new Date()
            }
          }
        });
      } catch (fcmError) {
        console.error('FCM Error:', fcmError);
        res.status(200).json({
          success: true,
          warning: 'Mock event created but FCM failed',
          data: {
            notification: newNotifications[0],
            fcmError: fcmError instanceof Error ? fcmError.message : 'Unknown error'
          }
        });
      }
    } else {
      res.status(200).json({
        success: true,
        message: 'Mock event created (no FCM)',
        data: {
          notification: newNotifications[0],
          fcmSkipped: !sendFCM
        }
      });
    }
  } catch (error) {
    console.error('Error creating mock event:', error);
    res.status(500).json({
      error: 'Failed to create mock event',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}