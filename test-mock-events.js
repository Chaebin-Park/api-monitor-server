// pages/api/mock-subway-event.ts
// 테스트용 가짜 지하철 알림 생성 API

import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '../../lib/mongodb';
import admin from '../../lib/firebase-admin';

// 샘플 알림 템플릿
const SAMPLE_NOTIFICATIONS = [
  {
    title: "1호선 신호 장애",
    content: "현재 시청역-종각역 구간에서 신호 장애로 인한 운행 지연이 발생하고 있습니다.",
    lines: "1호선",
    stations: "시청역,종각역"
  },
  {
    title: "2호선 차량 고장",
    content: "강남역에서 차량 고장으로 인해 상하행선 운행이 지연되고 있습니다.",
    lines: "2호선",
    stations: "강남역"
  },
  {
    title: "3호선 승객 응급환자",
    content: "경복궁역에서 승객 응급환자 발생으로 잠시 정차 중입니다.",
    lines: "3호선",
    stations: "경복궁역"
  },
  {
    title: "4호선 선로 점검",
    content: "명동역-충무로역 구간 선로 점검으로 운행 간격이 조정됩니다.",
    lines: "4호선",
    stations: "명동역,충무로역"
  },
  {
    title: "5호선 출입문 점검",
    content: "여의도역에서 출입문 점검으로 약 5분간 지연이 예상됩니다.",
    lines: "5호선",
    stations: "여의도역"
  }
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 개발 환경에서만 허용
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not allowed in production' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      type = 'random',      // random, custom, multiple
      count = 1,            // 생성할 알림 개수
      sendFCM = true,       // FCM 전송 여부
      customData = null     // 커스텀 데이터
    } = req.body;

    console.log(`🎭 Mock 이벤트 생성 요청: type=${type}, count=${count}`);

    // MongoDB 연결
    const client = await clientPromise;
    const db = client.db('api-monitor');
    const collection = db.collection('api-data');

    // 생성할 알림 목록
    const notifications = [];
    const now = new Date();

    if (type === 'custom' && customData) {
      // 커스텀 알림
      notifications.push({
        noftTtl: customData.title,
        noftCn: customData.content,
        lineNmLst: customData.lines,
        stnSctnCdLst: customData.stations || '',
        noftOcrnDt: now.toISOString(),
        xcseSitnBgngDt: now.toISOString(),
        xcseSitnEndDt: new Date(now.getTime() + 30 * 60000).toISOString(), // 30분 후
        noftSeCd: 'TEST',
        nonstopYn: 'N'
      });
    } else if (type === 'multiple') {
      // 여러 개 랜덤 생성
      for (let i = 0; i < count; i++) {
        const template = SAMPLE_NOTIFICATIONS[Math.floor(Math.random() * SAMPLE_NOTIFICATIONS.length)];
        const minutesAgo = Math.floor(Math.random() * 30); // 0-30분 전
        const occurTime = new Date(now.getTime() - minutesAgo * 60000);
        
        notifications.push({
          noftTtl: `[테스트 ${i + 1}] ${template.title}`,
          noftCn: template.content,
          lineNmLst: template.lines,
          stnSctnCdLst: template.stations,
          noftOcrnDt: occurTime.toISOString(),
          xcseSitnBgngDt: occurTime.toISOString(),
          xcseSitnEndDt: new Date(occurTime.getTime() + 60 * 60000).toISOString(),
          noftSeCd: 'TEST',
          nonstopYn: 'N'
        });
      }
    } else {
      // 랜덤 단일 알림
      const template = SAMPLE_NOTIFICATIONS[Math.floor(Math.random() * SAMPLE_NOTIFICATIONS.length)];
      notifications.push({
        noftTtl: `[테스트] ${template.title}`,
        noftCn: template.content,
        lineNmLst: template.lines,
        stnSctnCdLst: template.stations,
        noftOcrnDt: now.toISOString(),
        xcseSitnBgngDt: now.toISOString(),
        xcseSitnEndDt: new Date(now.getTime() + 60 * 60000).toISOString(),
        noftSeCd: 'TEST',
        nonstopYn: 'N'
      });
    }

    // Mock API 응답 형식으로 만들기
    const mockApiResponse = {
      items: {
        item: notifications.length === 1 ? notifications[0] : notifications
      },
      numOfRows: notifications.length,
      pageNo: 1,
      totalCount: notifications.length
    };

    // MongoDB에 저장
    const notificationIds = notifications.map(n => 
      `${n.noftOcrnDt}_${n.noftTtl}`.substring(0, 100)
    );

    const document = {
      data: mockApiResponse,
      notificationIds: notificationIds,
      newNotifications: notifications,
      timestamp: new Date(),
      totalCount: notifications.length,
      isMock: true // Mock 데이터 표시
    };

    const insertResult = await collection.insertOne(document);
    console.log(`✅ Mock 데이터 저장 완료: ${insertResult.insertedId}`);

    // FCM 전송
    if (sendFCM) {
      try {
        const firstNotification = notifications[0];
        const message = {
          notification: {
            title: `🚇 ${firstNotification.lineNmLst} 알림 (테스트)`,
            body: firstNotification.noftTtl,
          },
          data: {
            type: 'subway_notification',
            timestamp: new Date().toISOString(),
            notificationCount: String(notifications.length),
            title: firstNotification.noftTtl,
            content: firstNotification.noftCn,
            lines: firstNotification.lineNmLst,
            occurTime: firstNotification.noftOcrnDt,
            startTime: firstNotification.xcseSitnBgngDt || '',
            endTime: firstNotification.xcseSitnEndDt || '',
            isMock: 'true'
          },
          topic: 'api_updates',
        };

        const fcmResponse = await admin.messaging().send(message);
        console.log('✅ FCM 전송 성공:', fcmResponse);
      } catch (fcmError) {
        console.error('FCM 전송 실패:', fcmError);
      }
    }

    // 응답
    res.status(200).json({
      success: true,
      message: `${notifications.length}개의 Mock 알림이 생성되었습니다`,
      notifications: notifications.map(n => ({
        title: n.noftTtl,
        content: n.noftCn,
        lines: n.lineNmLst,
        time: n.noftOcrnDt
      })),
      mongoId: insertResult.insertedId,
      fcmSent: sendFCM
    });

  } catch (error) {
    console.error('Mock 이벤트 생성 실패:', error);
    res.status(500).json({
      error: 'Failed to create mock event',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}