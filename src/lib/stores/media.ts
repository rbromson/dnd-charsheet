import { uid, nowIso } from '../model/ids';
import { putMediaRecord, getMediaRecord, deleteFrom } from '../db';

const urlCache = new Map<string, string>();

export async function putMedia(characterId: string, blob: Blob, kind: 'image' | 'audio' = 'image'): Promise<string> {
  const id = uid();
  await putMediaRecord({ id, characterId, kind, mime: blob.type || (kind === 'image' ? 'image/jpeg' : 'audio/wav'), blob, createdAt: nowIso() });
  return id;
}

export async function getMediaBlob(id: string): Promise<Blob | null> {
  return (await getMediaRecord(id))?.blob ?? null;
}

/** objectURL для <img>/<audio>; кешируется на время работы приложения. */
export async function getMediaUrl(id: string | null | undefined): Promise<string | null> {
  if (!id) return null;
  const hit = urlCache.get(id);
  if (hit) return hit;
  const blob = await getMediaBlob(id);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urlCache.set(id, url);
  return url;
}

export async function deleteMedia(id: string): Promise<void> {
  const u = urlCache.get(id);
  if (u) URL.revokeObjectURL(u);
  urlCache.delete(id);
  await deleteFrom('media', id);
}

/** Уменьшает картинку до max по большей стороне и пережимает в JPEG. */
export async function resizeImage(file: Blob, max = 2048, quality = 0.85): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    return await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob'))), 'image/jpeg', quality));
  } catch {
    return file;
  }
}

/** Выбрать файлы через системное окно (галерея/камера). */
export function pickFiles(accept = 'image/*', multiple = true): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = multiple;
    input.onchange = () => resolve(Array.from(input.files ?? []));
    input.oncancel = () => resolve([]);
    input.click();
  });
}
