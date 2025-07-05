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
    
    const latestData = await collection.findOne(
      {},
      { sort: { timestamp: -1 } }
    );
    
    if (!latestData) {
      return res.status(404).json({
        error: 'No data found',
      });
    }
    
    res.status(200).json({
      success: true,
      data: latestData.data,
      timestamp: latestData.timestamp,
      hash: latestData.hash,
    });
  } catch (error) {
    console.error('Error fetching latest data:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
}