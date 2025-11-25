import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '../../lib/mongodb';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const client = await clientPromise;
    const db = client.db('api-monitor');
    const collection = db.collection('api-data');

    const allData = await collection
      .find({})
      .sort({ timestamp: -1 })
      .toArray();

    if (!allData || allData.length === 0) {
      return res.status(404).json({
        error: 'No data found',
      });
    }

    // 캐싱 방지
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.status(200).json({
      success: true,
      data: allData,
      count: allData.length,
    });
  } catch (error) {
    console.error('Error fetching all data:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
}
