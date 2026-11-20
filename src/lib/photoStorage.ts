import { get, put } from '@vercel/blob';
import { japanDateKey } from './deliveryAmounts';

// 伝票・レジ締めの写真を、照合用の控えとして非公開のVercel Blobに保存する。
// 紙の原本は店で保管する前提（電子帳簿保存法のスキャナ保存としては扱わない）。
// 保存先が未設定の環境では保存をスキップし、読み取り・保存の流れは止めない。

export type PhotoKind = 'delivery' | 'sales';

export function isPhotoStorageEnabled(): boolean {
  return Boolean(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);
}

function storePrefix(storeId: string): string {
  return `stores/${storeId}/`;
}

/** 写真を保存してパスを返す。失敗しても例外にせず null を返す（写真保存で業務を止めない） */
export async function savePhoto(storeId: string, kind: PhotoKind, file: File): Promise<string | null> {
  if (!isPhotoStorageEnabled()) return null;
  try {
    const blob = await put(`${storePrefix(storeId)}${kind}/${japanDateKey()}.jpg`, file, {
      access: 'private',
      addRandomSuffix: true,
      contentType: file.type || 'image/jpeg',
    });
    return blob.pathname;
  } catch (error) {
    console.error('Photo save failed', error);
    return null;
  }
}

/** 保存時に受け取った写真パスが、この店舗の写真かを確かめる */
export function parseStorePhotoPath(storeId: string, value: unknown, kind: PhotoKind): string | null | 'invalid' {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > 300 || value.includes('..')) return 'invalid';
  return value.startsWith(`${storePrefix(storeId)}${kind}/`) ? value : 'invalid';
}

/** この店舗の写真を読み出す。他店舗のパスや存在しない写真は null */
export async function readStorePhoto(storeId: string, pathname: string) {
  if (!isPhotoStorageEnabled()) return null;
  if (!pathname.startsWith(storePrefix(storeId)) || pathname.includes('..')) return null;
  const result = await get(pathname, { access: 'private' });
  if (!result || result.statusCode !== 200) return null;
  return result;
}
