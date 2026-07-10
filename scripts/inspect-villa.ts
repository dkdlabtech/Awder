import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs'; import * as path from 'path';
const envPath = path.join(__dirname, '..', '.env.local');
fs.readFileSync(envPath,'utf8').split('\n').forEach(l=>{const m=l.match(/^([A-Z_]+)="?(.*?)"?$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].replace(/\\n/g,'\n');});
const app:App=getApps()[0]??initializeApp({credential:cert({projectId:process.env.FIREBASE_ADMIN_PROJECT_ID!,clientEmail:process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,privateKey:process.env.FIREBASE_ADMIN_PRIVATE_KEY!})});
const db=getFirestore(app,'ai-studio-2bb09865-e5b1-44ca-8c73-eaf4dcf87aef');
(async()=>{
  const all=await db.collection('listings').get();
  const villa=all.docs.find(d=>(d.data().title||'').includes('Test Koron'));
  if(villa){const d=villa.data();console.log('VILLA:',villa.id,'| hostId:',d.hostId,'| hostName:',d.hostName);}
  console.log('\n--- USERS ---');
  const users=await db.collection('users').get();
  users.docs.forEach(u=>{const d=u.data();console.log(u.id,'|',d.email||d.phoneNumber||'?','| role:',d.role,'| name:',d.displayName);});
  process.exit(0);
})();
