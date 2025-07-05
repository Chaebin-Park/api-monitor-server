// pages/api/check-updates.ts (개선된 버전)
import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '../../lib/mongodb';
import admin from '../../lib/firebase-admin';
import { fetchPublicApiData, generateDataHash } from '../../utils/api-checker';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 보안 체크
  const authHeader = req.headers.authorization;
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('Starting subway notification check...');
    
    // 1. 지하철 알림 API 데이터 가져오기
    const apiResponse = await fetchPublicApiData();
    
    // 알림이 있는지 확인
    const notifications = apiResponse?.items?.item;
    const hasNotifications = notifications && 
      (Array.isArray(notifications) ? notifications.length > 0 : true);
    
    if (!hasNotifications) {
      console.log('No notifications found');
      return res.status(200).json({
        success: true,
        message: 'No notifications',
        totalCount: 0
      });
    }
    
    // 배열로 정규화
    const notificationArray = Array.isArray(notifications) ? notifications : [notifications];
    
    // 2. MongoDB 연결
    const client = await clientPromise;
    const db = client.db('api-monitor');
    const collection = db.collection('api-data');
    
    // 3. 최신 알림들의 ID 목록 가져오기
    const notificationIds = notificationArray.map(item => 
      `${item.noftOcrnDt}_${item.noftTtl}`.substring(0, 100) // 발생일시+제목으로 고유 ID 생성
    );
    
    // 4. 이전에 처리한 알림 확인
    const lastRecord = await collection.findOne(
      {},
      { sort: { timestamp: -1 } }
    );
    
    const previousIds = lastRecord?.notificationIds || [];
    const newNotifications = notificationArray.filter(item => {
      const id = `${item.noftOcrnDt}_${item.noftTtl}`.substring(0, 100);
      return !previousIds.includes(id);
    });
    
    // 5. 새로운 알림이 있는 경우
    if (newNotifications.length > 0) {
      console.log(`Found ${newNotifications.length} new notifications`);
      
      // 새 데이터 저장
      await collection.insertOne({
        data: apiResponse,
        notificationIds: notificationIds,
        newNotifications: newNotifications,
        timestamp: new Date(),
        totalCount: apiResponse.totalCount
      });
      
      // FCM 알림 발송
      try {
        // 가장 최근 알림 정보
        const latestNotification = newNotifications[0];
        
        const message = {
          notification: {
            title: '🚇 서울 지하철 알림',
            body: latestNotification.noftTtl,
          },
          data: {
            type: 'subway_notification',
            timestamp: new Date().toISOString(),
            notificationCount: String(newNotifications.length),
            content: latestNotification.noftCn,
            lines: latestNotification.lineNmLst || '',
            startTime: latestNotification.xcseSitnBgngDt || '',
            endTime: latestNotification.xcseSitnEndDt || ''
          },
          topic: 'api_updates',
        };
        
        const response = await admin.messaging().send(message);
        console.log('Successfully sent FCM message:', response);
      } catch (fcmError) {
        console.error('FCM Error:', fcmError);
      }
      
      // 30일 이상 된 데이터 정리
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      await collection.deleteMany({
        timestamp: { $lt: thirtyDaysAgo }
      });
      
      res.status(200).json({
        success: true,
        message: 'New notifications found',
        newCount: newNotifications.length,
        notifications: newNotifications.map(n => ({
          title: n.noftTtl,
          content: n.noftCn,
          time: n.noftOcrnDt,
          lines: n.lineNmLst
        }))
      });
    } else {
      console.log('No new notifications');
      res.status(200).json({
        success: true,
        message: 'No new notifications',
        totalCount: notificationArray.length,
        allProcessed: true
      });
    }
  } catch (error) {
    console.error('Error in check-updates:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}