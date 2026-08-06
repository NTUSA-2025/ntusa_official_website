/**
 * R2 圖片代理工具
 *
 * 將 R2 公開 URL 轉為本站代理路徑，使圖片走 same-origin，
 * 避免 COEP require-corp 因 r2.dev 不回傳 CORS header 而擋圖片。
 *
 * 例：https://pub-xxx.r2.dev/photo.png → /r2/photo.png
 */

const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";

/**
 * 將單一 R2 URL 轉為代理路徑。非 R2 的 URL 原樣回傳。
 */
export function proxyR2Url(url: string | null | undefined): string | null {
  if (!url || !R2_PUBLIC_URL) return url ?? null;
  if (url.startsWith(R2_PUBLIC_URL)) {
    return "/r2" + url.slice(R2_PUBLIC_URL.length);
  }
  return url;
}

/**
 * 將 HTML 內容中所有 R2 圖片 URL 替換為代理路徑。
 * 用於 TipTap 編輯器產生的 HTML（dangerouslySetInnerHTML）。
 */
export function proxyR2Html(html: string): string {
  if (!R2_PUBLIC_URL) return html;
  return html.replaceAll(R2_PUBLIC_URL, "/r2");
}
