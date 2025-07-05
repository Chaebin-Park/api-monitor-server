import axios from 'axios';
import crypto from 'crypto';

export interface ApiData {
  data: any;
  hash: string;
  timestamp: Date;
}

export async function fetchPublicApiData(): Promise<any> {
  try {
    const response = await axios.get(process.env.PUBLIC_API_URL!, {
      headers: {
        'Authorization': process.env.PUBLIC_API_KEY || '',
      },
      timeout: 5000,
    });
    
    return response.data;
  } catch (error) {
    console.error('Error fetching public API:', error);
    throw error;
  }
}

export function generateDataHash(data: any): string {
  const jsonString = JSON.stringify(data);
  return crypto.createHash('md5').update(jsonString).digest('hex');
}

export function hasDataChanged(oldHash: string | null, newHash: string): boolean {
  return oldHash !== newHash;
}
