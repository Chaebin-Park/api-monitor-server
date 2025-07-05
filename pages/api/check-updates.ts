import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '../../lib/mongodb';
import admin from '../../lib/firebase-admin';
import { fetchPublicApiData, generateDataHash, hasDataChanged } from '../../utils/api-checker';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 보안: GitHub Actions 또는 특정 소스에서만 호출 허용
  const authHeader = req.headers.authorization;
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('Starting API check...');
    
    // 1. 공공 API 데이터 가져오기
    const newData = await fetchPublicApiData();
    const newHash = generateDataHash(newData);
    
    // 2. MongoDB 연결
    const client = await clientPromise;
    const db = client.db('api-monitor');
    const collection = db.collection('api-data');
    
    // 3. 마지막 데이터 조회
    const lastRecord = await collection.findOne(
      {},
      { sort: { timestamp: -1 } }
    );
    
    // 4. 변경 사항 확인
    if (!lastRecord || hasDataChanged(lastRecord.hash, newHash)) {
      console.log('Data has changed, saving and notifying...');
      
      // 새 데이터 저장
      await collection.insertOne({
        data: newData,
        hash: newHash,
        timestamp: new Date(),
      });
      
      // FCM 알림 발송
      try {
        const message = {
          notification: {
            title: '공공 API 데이터 업데이트',
            body: '새로운 데이터가 업데이트되었습니다.',
          },
          data: {
            type: 'api_update',
            timestamp: new Date().toISOString(),
            dataHash: newHash,
          },
          topic: 'api_updates',
        };
        
        const response = await admin.messaging().send(message);
        console.log('Successfully sent message:', response);
      } catch (fcmError) {
        console.error('FCM Error:', fcmError);
      }
      
      // 오래된 데이터 정리 (30일 이상)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      await collection.deleteMany({
        timestamp: { $lt: thirtyDaysAgo }
      });
      
      res.status(200).json({
        success: true,
        message: 'Data updated',
        hash: newHash,
      });
    } else {
      console.log('No changes detected');
      res.status(200).json({
        success: true,
        message: 'No changes',
        hash: newHash,
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
