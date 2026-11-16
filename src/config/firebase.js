import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let firebaseApp = null;
let firebaseAuth = null;

try {
  if (getApps().length === 0) {
    const serviceAccountPath = path.resolve(__dirname, 'firebase-service-account.json');

    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      firebaseApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || process.env.FIREBASE_PROJECT_ID || 'dental-clinic-a051f',
      });
      console.log('✅ [Firebase Admin] Khởi tạo thành công từ Service Account Key');
    } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      firebaseApp = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID || 'dental-clinic-a051f',
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        projectId: process.env.FIREBASE_PROJECT_ID || 'dental-clinic-a051f',
      });
      console.log('✅ [Firebase Admin] Khởi tạo thành công từ Environment Variables');
    } else {
      firebaseApp = initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'dental-clinic-a051f',
      });
      console.warn('⚠️ [Firebase Admin] Khởi tạo ở chế độ projectId Public Key verification');
    }
  } else {
    firebaseApp = getApps()[0];
  }

  firebaseAuth = getAuth(firebaseApp);
} catch (error) {
  console.error('❌ [Firebase Admin Init Error]:', error.message);
}

export { firebaseApp, firebaseAuth };
export default {
  auth: () => firebaseAuth,
};
