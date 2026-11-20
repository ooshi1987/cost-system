import Anthropic from '@anthropic-ai/sdk';

/** 店の画面にそのまま見せてよいエラー。原因と次の行動が書けるときだけ使う */
export class UserFacingError extends Error {}

/**
 * 例外を、店の人が読める短い文言に変える。
 * DBやAIの内部エラー文（接続先・SQL・英語の詳細）は画面に出さず、サーバーログにだけ残す。
 */
export function userFacingMessage(error: unknown, fallback: string): string {
  if (error instanceof UserFacingError) return error.message;

  if (error instanceof Anthropic.APIError) {
    const text = `${error.message}`;
    if (error.status === 413 || text.includes('request_too_large')) {
      return '画像が大きすぎます。撮り直すか、伝票を分けて撮影してください。';
    }
    if (error.status === 429 || error.status === 529 || text.includes('overloaded')) {
      return 'AIが混み合っています。1〜2分待ってから、もう一度お試しください。';
    }
    return 'AIの読み取りに失敗しました。少し待ってからもう一度お試しいただくか、手入力で記録してください。';
  }

  const name = error instanceof Error ? error.name : '';
  if (name.startsWith('PrismaClient')) {
    return 'データベースに接続できませんでした。少し待ってからもう一度お試しください。';
  }

  return fallback;
}
