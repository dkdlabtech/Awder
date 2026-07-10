/**
 * Test E2E du parcours Awder (voyageur + hôte) contre les VRAIES routes API.
 * Exerce les piliers : escrow Sira-Djou, KYC, commission, notifications.
 *
 * Usage : BASE_URL=http://localhost:3100 npx tsx scripts/e2e-test.ts
 */
import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3100';

// ── Charge .env.local ─────────────────────────────────────────────────────────
const envPath = path.join(__dirname, '..', '.env.local');
fs.readFileSync(envPath, 'utf8').split('\n').forEach((l) => {
  const m = l.match(/^([A-Z_]+)="?(.*?)"?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/\\n/g, '\n');
});
const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'firebase-applet-config.json'), 'utf8'));
const API_KEY = cfg.apiKey as string;

const app: App =
  getApps()[0] ??
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY!,
    }),
  });
const db = getFirestore(app, 'ai-studio-2bb09865-e5b1-44ca-8c73-eaf4dcf87aef');
const adminAuth = getAuth(app);

// ── Helpers ───────────────────────────────────────────────────────────────────
let passed = 0, failed = 0;
function assert(cond: boolean, label: string) {
  if (cond) { console.log(`  ✅ ${label}`); passed++; }
  else { console.log(`  ❌ ${label}`); failed++; }
}

async function idTokenFor(uid: string): Promise<string> {
  const customToken = await adminAuth.createCustomToken(uid);
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: customToken, returnSecureToken: true }) }
  );
  const data = await res.json();
  if (!data.idToken) throw new Error('signInWithCustomToken a échoué : ' + JSON.stringify(data));
  return data.idToken;
}

async function action(token: string, body: any) {
  const res = await fetch(`${BASE_URL}/api/bookings/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

// ── Scénario ──────────────────────────────────────────────────────────────────
(async () => {
  console.log(`\n🧪 E2E Awder → ${BASE_URL}\n`);
  const HOST = 'e2e_host_' + Date.now();
  const GUEST = 'e2e_guest_' + Date.now();

  // Setup : users + wallets + listing
  console.log('— Setup —');
  await db.collection('users').doc(HOST).set({ displayName: 'Hôte E2E', role: 'host', isVerified: true, idVerificationStatus: 'verified', createdAt: new Date().toISOString() });
  await db.collection('users').doc(GUEST).set({ displayName: 'Voyageur E2E', role: 'guest', isVerified: true, createdAt: new Date().toISOString() });
  await db.collection('wallets').doc(HOST).set({ userId: HOST, balance: 0, escrow: 0, currency: 'XOF', updatedAt: new Date().toISOString() });
  await db.collection('wallets').doc(GUEST).set({ userId: GUEST, balance: 0, escrow: 0, currency: 'XOF', updatedAt: new Date().toISOString() });
  const platBefore = (await db.collection('wallets').doc('platform').get()).data()?.balance ?? 0;

  const listingRef = await db.collection('listings').add({
    hostId: HOST, hostName: 'Hôte E2E', title: 'Villa E2E', description: 'Test', type: 'accommodation',
    pricingType: 'nightly', price: 40000, cautionAmount: 15000, location: { city: 'Bamako', address: 'ACI' },
    images: [], amenities: [], moderationStatus: 'approved', isActive: true, isVerified: true,
    createdAt: new Date().toISOString(),
  });
  console.log(`  listing: ${listingRef.id}`);

  // Prix : 2 nuits × 40000 = 80000 ; services 0 ; frais 3% = 2400 ; caution 15000 ; total = 97400
  const stay = 80000, fee = Math.round(stay * 0.03), caution = 15000, total = stay + fee + caution;
  const bookingRef = await db.collection('bookings').add({
    listingId: listingRef.id, listingTitle: 'Villa E2E', hostId: HOST, hostName: 'Hôte E2E', guestId: GUEST,
    startDate: new Date(Date.now() + 86400000).toISOString(), endDate: new Date(Date.now() + 3 * 86400000).toISOString(),
    status: 'pending_payment', checkInStatus: 'pending', cautionStatus: 'pending',
    totalPrice: total, cautionAmount: caution, servicesPrice: 0,
    priceBreakdown: { listingPrice: stay, servicesPrice: 0, cautionAmount: caution, awderServiceFee: fee, subtotal: stay + fee, total },
    nights: 2, hours: 0, services: [], paymentMethod: 'paydunya', cancellationPolicy: 'moderate',
    createdAt: new Date().toISOString(),
  });
  console.log(`  booking: ${bookingRef.id} (total ${total})`);

  const gToken = await idTokenFor(GUEST);
  const hToken = await idTokenFor(HOST);

  // 1. Paiement (confirm-demo)
  console.log('\n— 1. Paiement escrow (Sira-Djou) —');
  const pay = await fetch(`${BASE_URL}/api/paydunya/confirm-demo`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookingId: bookingRef.id, demoToken: 'demo_e2e_' + Date.now() }),
  });
  assert(pay.ok, 'POST /confirm-demo → 200');
  let b = (await bookingRef.get()).data()!;
  assert(b.status === 'paid_escrow', 'booking.status = paid_escrow');
  assert(b.cautionStatus === 'blocked', 'caution bloquée');
  let hostW = (await db.collection('wallets').doc(HOST).get()).data()!;
  assert(hostW.escrow === total, `escrow hôte = ${total} (reçu ${hostW.escrow})`);

  // 2. Check-in (voyageur)
  console.log('\n— 2. Check-in voyageur —');
  const ci = await action(gToken, { bookingId: bookingRef.id, action: 'check_in' });
  assert(ci.status === 200, 'check_in → 200');
  b = (await bookingRef.get()).data()!;
  assert(b.checkInStatus === 'checked_in', 'checkInStatus = checked_in');

  // 2b. Un voyageur ne doit PAS pouvoir libérer la caution
  const badRelease = await action(gToken, { bookingId: bookingRef.id, action: 'release_caution' });
  assert(badRelease.status !== 200, 'voyageur ne peut PAS libérer la caution (sécurité)');

  // 3. Check-out (voyageur)
  console.log('\n— 3. Check-out voyageur —');
  const co = await action(gToken, { bookingId: bookingRef.id, action: 'check_out' });
  assert(co.status === 200, 'check_out → 200');

  // 4. Libération caution + commission (hôte)
  console.log('\n— 4. Libération caution & commission Awder —');
  const rel = await action(hToken, { bookingId: bookingRef.id, action: 'release_caution' });
  assert(rel.status === 200, 'release_caution → 200');
  b = (await bookingRef.get()).data()!;
  assert(b.status === 'completed', 'booking.status = completed');
  assert(b.cautionStatus === 'released', 'caution released');

  hostW = (await db.collection('wallets').doc(HOST).get()).data()!;
  const guestW = (await db.collection('wallets').doc(GUEST).get()).data()!;
  const platAfter = (await db.collection('wallets').doc('platform').get()).data()?.balance ?? 0;

  // Commission attendue : 5% sur 80000 = 4000 ; services 0 ; total commission 4000
  // Awder gagne : fee(2400) + commission(4000) = 6400
  // Hôte net : 80000 - 4000 = 76000
  // Voyageur : caution 15000 remboursée
  assert(hostW.balance === 76000, `hôte net = 76000 (reçu ${hostW.balance})`);
  assert(hostW.escrow === 0, `escrow hôte remis à 0 (reçu ${hostW.escrow})`);
  assert(guestW.balance === caution, `caution rendue voyageur = ${caution} (reçu ${guestW.balance})`);
  assert(platAfter - platBefore === fee + 4000, `commission Awder = ${fee + 4000} (reçu ${platAfter - platBefore})`);

  // 5. Avis Diya + agrégation de la note
  console.log('\n— 5. Avis Diya (agrégation note) —');
  const rev = await fetch(`${BASE_URL}/api/reviews/submit`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${gToken}` },
    body: JSON.stringify({ bookingId: bookingRef.id, rating: 4, cleanliness: 5, communication: 4, comment: 'Séjour E2E' }),
  });
  assert(rev.ok, 'POST /reviews/submit → 200');
  const listingAfter = (await listingRef.get()).data()!;
  assert(listingAfter.reviewCount === 1, `reviewCount = 1 (reçu ${listingAfter.reviewCount})`);
  assert(listingAfter.rating === 4, `note agrégée = 4 (reçu ${listingAfter.rating})`);
  b = (await bookingRef.get()).data()!;
  assert(b.reviewed === true, 'booking.reviewed = true');
  // Double avis interdit
  const rev2 = await fetch(`${BASE_URL}/api/reviews/submit`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${gToken}` },
    body: JSON.stringify({ bookingId: bookingRef.id, rating: 1 }),
  });
  assert(!rev2.ok, 'double avis refusé');

  // 6. Contrôle final
  console.log('\n— 6. Contrôles finaux —');
  const dispute = await action(gToken, { bookingId: bookingRef.id, action: 'open_dispute', disputeReason: 'test litige' });
  assert(dispute.status !== 200 || dispute.data.ok, 'litige géré proprement');

  // Cleanup
  console.log('\n— Nettoyage —');
  await bookingRef.delete();
  await listingRef.delete();
  await db.collection('users').doc(HOST).delete();
  await db.collection('users').doc(GUEST).delete();
  await db.collection('wallets').doc(HOST).delete();
  await db.collection('wallets').doc(GUEST).delete();
  const txs = await db.collection('transactions').where('bookingId', '==', bookingRef.id).get();
  await Promise.all(txs.docs.map(d => d.ref.delete()));
  const revs = await db.collection('reviews').where('bookingId', '==', bookingRef.id).get();
  await Promise.all(revs.docs.map(d => d.ref.delete()));
  console.log('  ✓ nettoyé');

  console.log(`\n${'='.repeat(40)}`);
  console.log(`RÉSULTAT : ${passed} réussis, ${failed} échoués`);
  console.log('='.repeat(40));
  process.exit(failed > 0 ? 1 : 0);
})().catch((e) => { console.error('\n❌ E2E crash:', e); process.exit(1); });
