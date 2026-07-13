/**
 * Upload d'images via Cloudinary (unsigned upload — aucune carte bancaire).
 *
 * Configuration requise dans .env.local :
 *   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=<votre cloud name>
 *   NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=<votre upload preset unsigned>
 *
 * Créer le preset : Cloudinary → Settings → Upload → Add upload preset
 *   → Signing Mode: "Unsigned"
 */

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

function assertConfigured(): void {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      'Cloudinary non configuré. Ajoutez NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME et NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET dans .env.local'
    );
  }
}

function validateImage(file: File): void {
  if (!file.type.startsWith('image/')) {
    throw new Error('Seules les images sont autorisées.');
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Image trop volumineuse (max 10 Mo).');
  }
}

/**
 * Upload une image vers Cloudinary et retourne l'URL HTTPS publique.
 */
async function cloudinaryUpload(file: File, folder: string): Promise<string> {
  assertConfigured();
  validateImage(file);

  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', UPLOAD_PRESET as string);
  form.append('folder', folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: form }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? "Échec de l'upload de l'image.");
  }

  const data = await res.json();
  return data.secure_url as string;
}

/**
 * Upload un fichier audio (note vocale d'itinéraire) vers Cloudinary.
 * Utilise l'endpoint /auto/upload qui accepte audio + vidéo.
 */
export async function uploadVoiceNote(file: Blob, listingId: string): Promise<string> {
  assertConfigured();
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Note vocale trop volumineuse (max 10 Mo).');
  }
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', UPLOAD_PRESET as string);
  form.append('folder', `awder/listings/${listingId}/voice`);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
    { method: 'POST', body: form }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? "Échec de l'upload de la note vocale.");
  }
  const data = await res.json();
  return data.secure_url as string;
}

/** Upload une image d'annonce. */
export async function uploadListingImage(file: File, listingId: string): Promise<string> {
  return cloudinaryUpload(file, `awder/listings/${listingId}`);
}

/** Upload plusieurs images d'annonce en parallèle. */
export async function uploadListingImages(files: File[], listingId: string): Promise<string[]> {
  return Promise.all(files.map((f) => uploadListingImage(f, listingId)));
}

/** Upload une image pour le Guide (bon plan ou ambassadeur). */
export async function uploadGuideImage(file: File, kind: 'deal' | 'ambassador'): Promise<string> {
  return cloudinaryUpload(file, `awder/guide/${kind}`);
}

/** Upload une photo de profil ou pièce d'identité utilisateur. */
export async function uploadUserImage(
  file: File,
  userId: string,
  kind: 'avatar' | 'idcard' | 'selfie' | 'propertyDeed'
): Promise<string> {
  return cloudinaryUpload(file, `awder/users/${userId}/${kind}`);
}
