import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { readStorePhoto } from '@/lib/photoStorage';

// 保存した伝票・レジ締めの写真を、同じ店舗のログイン中ユーザーにだけ返す。
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuth(request);
    if (!auth?.storeId) return NextResponse.json({ error: 'ログインしてください' }, { status: 401 });
    const path = request.nextUrl.searchParams.get('path') ?? '';
    const photo = await readStorePhoto(auth.storeId, path);
    if (!photo || photo.statusCode !== 200) return NextResponse.json({ error: '写真が見つかりません' }, { status: 404 });
    return new Response(photo.stream, {
      headers: {
        'Content-Type': photo.blob.contentType || 'image/jpeg',
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (error) {
    console.error('Photo read failed', error);
    return NextResponse.json({ error: '写真を読み込めませんでした' }, { status: 500 });
  }
}
