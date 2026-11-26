import { parseDestinationUrl } from '../security/url-policy';

const maxMetadataBytes = 4096;
const metadataTimeoutMs = 20_000;

export type PageMetadata = { title: string; description: string };

export async function readDestinationMetadata(
  binding: Pick<Fetcher, 'fetch'>,
  destination: string,
): Promise<PageMetadata | null> {
  const url = parseDestinationUrl(destination);
  if (!url || url.protocol !== 'https:' || url.port) return null;
  url.hash = '';

  try {
    const response = await binding.fetch(
      'https://page-metadata.internal/head',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: url.href }),
        redirect: 'error',
        signal: AbortSignal.timeout(metadataTimeoutMs),
      },
    );
    if (response.status !== 200 || !response.body) return null;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let size = 0;
    let body = '';
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxMetadataBytes) {
          await reader.cancel();
          return null;
        }
        body += decoder.decode(value, { stream: true });
      }
      const result = JSON.parse(
        body + decoder.decode(),
      ) as Partial<PageMetadata> | null;
      if (
        !result ||
        typeof result.title !== 'string' ||
        typeof result.description !== 'string'
      )
        return null;
      const title = result.title.slice(0, 200).trim();
      const description = result.description.slice(0, 700).trim();
      return title || description ? { title, description } : null;
    } finally {
      reader.releaseLock();
    }
  } catch {
    return null;
  }
}
