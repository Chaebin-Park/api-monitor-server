import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '../../lib/mongodb';
import { fetchPublicApiData, generateDataHash, isSameContent } from '../../utils/api-checker';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Manual refresh triggered - fetching subway data...');

    // 1. 지하철 API 데이터 가져오기
    let apiResponse;
    try {
      apiResponse = await fetchPublicApiData();
    } catch (apiError) {
      const errorMessage = apiError instanceof Error ? apiError.message : 'Unknown error';
      console.error('Failed to fetch public API:', errorMessage);

      return res.status(502).json({
        success: false,
        error: 'Public API error',
        message: errorMessage
      });
    }

    // 정상 응답인지 확인
    if (!apiResponse || typeof apiResponse !== 'object') {
      console.error('Invalid API response:', apiResponse);
      return res.status(502).json({
        success: false,
        error: 'Invalid response',
        message: 'Public API returned invalid data'
      });
    }

    // 2. MongoDB 연결
    const client = await clientPromise;
    const db = client.db('api-monitor');
    const collection = db.collection('api-data');

    // 3. 데이터 해시 생성 (저장용)
    const dataHash = generateDataHash(apiResponse);

    // 4. 가장 최근 데이터 확인
    const latestData = await collection
      .findOne({}, { sort: { timestamp: -1 } });

    let shouldInsertNew = true;

    // 5. 최근 데이터와 실제 내용 비교
    if (latestData && latestData.data) {
      const isSame = isSameContent(apiResponse, latestData.data);

      if (isSame) {
        // 데이터가 동일하면 timestamp만 업데이트
        await collection.updateOne(
          { _id: latestData._id },
          { $set: { timestamp: new Date(), refreshedManually: true } }
        );
        console.log('Data unchanged. Updated timestamp only for existing record');
        shouldInsertNew = false;
      }
    }

    // 6. 데이터가 다르면 새로운 레코드 삽입
    if (shouldInsertNew) {
      const newRecord = {
        data: apiResponse,
        hash: dataHash,
        timestamp: new Date(),
        totalCount: apiResponse.totalCount || 0,
        refreshedManually: true,
      };

      await collection.insertOne(newRecord);
      console.log('New data saved to DB with hash:', dataHash);
    }

    // 7. 저장된 모든 데이터 반환
    const allData = await collection
      .find({})
      .sort({ timestamp: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      message: 'Data refreshed successfully',
      data: allData,
      count: allData.length,
      newHash: dataHash,
    });
  } catch (error) {
    console.error('Error in refresh-data:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
