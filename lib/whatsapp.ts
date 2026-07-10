import { adminDb } from './firebase-admin';

/**
 * Envoie une notification WhatsApp transactionnelle.
 *
 * - En mode dev (WHATSAPP_DEV_MODE=true) ou sans token : log serveur uniquement.
 * - En prod : envoie un message texte via Meta Cloud API.
 *
 * Note : Meta n'autorise les messages texte libres que dans la fenêtre de 24h
 * après le dernier message de l'utilisateur. Hors fenêtre, il faut un template.
 * Cette fonction est best-effort et ne bloque jamais le flux métier.
 */
export async function sendWhatsAppNotification(phone: string, message: string): Promise<void> {
  try {
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    if (!cleanPhone.match(/^\+\d{7,15}$/)) return;

    const token = process.env.WHATSAPP_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const devMode = process.env.WHATSAPP_DEV_MODE === 'true';

    if (devMode || !token || !phoneNumberId) {
      console.log(`\n📲 [WHATSAPP ${devMode ? 'DEV' : 'OFF'}] → ${cleanPhone}\n   "${message}"\n`);
      return;
    }

    await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: cleanPhone,
        type: 'text',
        text: { body: message },
      }),
    });
  } catch (e) {
    console.warn('WhatsApp notification échouée (non bloquant):', e);
  }
}

/**
 * Récupère le numéro de téléphone d'un utilisateur depuis son profil.
 * Les utilisateurs WhatsApp ont un uid au format wa_<numéro>.
 */
export async function getUserPhone(uid: string): Promise<string | null> {
  if (uid.startsWith('wa_')) return '+' + uid.slice(3);
  try {
    const snap = await adminDb().collection('users').doc(uid).get();
    const phone = snap.data()?.phoneNumber;
    return phone || null;
  } catch {
    return null;
  }
}

/** Notifie un utilisateur par WhatsApp à partir de son uid (best-effort). */
export async function notifyUserWhatsApp(uid: string, message: string): Promise<void> {
  const phone = await getUserPhone(uid);
  if (phone) await sendWhatsAppNotification(phone, message);
}
