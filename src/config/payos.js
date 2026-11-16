import { PayOS } from '@payos/node';
import dotenv from 'dotenv';

dotenv.config();

export const isPayosConfigured = () => {
  return !!(
    process.env.PAYOS_CLIENT_ID &&
    process.env.PAYOS_CLIENT_ID !== 'dummy_client_id' &&
    process.env.PAYOS_API_KEY &&
    process.env.PAYOS_API_KEY !== 'dummy_api_key' &&
    process.env.PAYOS_CHECKSUM_KEY &&
    process.env.PAYOS_CHECKSUM_KEY !== 'dummy_checksum_key'
  );
};

export const payos = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID || 'dummy_client_id',
  apiKey: process.env.PAYOS_API_KEY || 'dummy_api_key',
  checksumKey: process.env.PAYOS_CHECKSUM_KEY || 'dummy_checksum_key',
});

