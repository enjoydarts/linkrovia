const maxTitleLength = 200;
const maxDescriptionLength = 700;
const maxHtmlBytes = 65_536;

function clean(value: string, limit: number) {
  return value
    .replace(/[\x00-\x1f\x7f\s]+/g, ' ')
    .trim()
    .slice(0, limit);
}

export async function extractOpenGraph(response: Response) {
  if (response.status !== 200 || !response.body) return null;
  // Apply the same cap at the service boundary before invoking the HTML parser.
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxHtmlBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let ogTitle = '';
  let ogDescription = '';
  let standardDescription = '';
  let documentTitle = '';
  const rewriter = new HTMLRewriter()
    .on('meta', {
      element(element) {
        const property = element.getAttribute('property')?.trim().toLowerCase();
        const name = element.getAttribute('name')?.trim().toLowerCase();
        const content = element.getAttribute('content') ?? '';
        if (property === 'og:title' && !ogTitle)
          ogTitle = clean(content, maxTitleLength);
        if (property === 'og:description' && !ogDescription)
          ogDescription = clean(content, maxDescriptionLength);
        if (name === 'description' && !standardDescription)
          standardDescription = clean(content, maxDescriptionLength);
      },
    })
    .on('title', {
      text(chunk) {
        documentTitle = (documentTitle + chunk.text).slice(0, maxTitleLength);
      },
    });
  await rewriter
    .transform(
      new Response(bytes, {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      }),
    )
    .text();
  const title = ogTitle || clean(documentTitle, maxTitleLength);
  const description = ogDescription || standardDescription;
  return title || description ? { title, description } : null;
}
