// ブラウザ専用：撮影画像を長辺2000px・JPEGに縮小する。
// iPhoneの写真はそのままだとサーバーの受付上限（Vercelは約4.5MB）を超えやすいため、送信前に必ず通す。
export async function compressImage(file: File, maxSize = 2000, quality = 0.7): Promise<File> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
    image.src = dataUrl;
  });

  let { width, height } = img;
  if (width > height ? width > maxSize : height > maxSize) {
    if (width > height) { height = Math.round((height * maxSize) / width); width = maxSize; }
    else { width = Math.round((width * maxSize) / height); height = maxSize; }
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => (result ? resolve(result) : reject(new Error('画像変換に失敗しました'))), 'image/jpeg', quality);
  });
  const name = file.name.replace(/\.[^.]+$/, '') || 'photo';
  return new File([blob], `${name}.jpg`, { type: 'image/jpeg' });
}
