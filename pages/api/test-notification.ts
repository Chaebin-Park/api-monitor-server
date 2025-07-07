// pages/api/test-notification.ts
// Vercel 서버에 테스트용 API 추가

import { NextApiRequest, NextApiResponse } from 'next';
import admin from '../../lib/firebase-admin';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 개발 환경에서만 허용 (또는 보안 토큰 확인)
  const authHeader = req.headers.authorization;
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      type = 'test',
      title = '🧪 FCM 테스트 알림',
      body = `테스트 메시지 - ${new Date().toLocaleTimeString('ko-KR')}`,
      topic = 'api_updates',
      token = null,
      data = {}
    } = req.body;

    // 메시지 구성
    const message: any = {
      notification: {
        title,
        body,
      },
      data: {
        type,
        timestamp: new Date().toISOString(),
        ...data
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'subway_alerts',
          priority: 'high',
          defaultSound: true,
          defaultVibrateTimings: true,
        }
      }
    };

    // 타겟 설정 (토큰 또는 토픽)
    if (token) {
      message.token = token;
    } else {
      message.topic = topic;
    }

    // FCM 전송
    const response = await admin.messaging().send(message);
    console.log('Test notification sent:', response);

    res.status(200).json({
      success: true,
      messageId: response,
      message: 'Test notification sent successfully',
      details: {
        title,
        body,
        target: token ? `Token: ${token.substring(0, 20)}...` : `Topic: ${topic}`
      }
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({
      error: 'Failed to send notification',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
