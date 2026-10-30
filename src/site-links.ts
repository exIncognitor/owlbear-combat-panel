/** The same build works on preview domains and the final Cloudflare Pages domain. */
export function manifestUrl(origin: string): string {
  return new URL("/manifest.json", origin).href;
}
