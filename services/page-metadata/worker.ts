import { DurableObject } from 'cloudflare:workers';
import { extractOpenGraph } from './open-graph';

const PORT = 8080;
const IDLE_TIMEOUT_MS = 60_000;
const STARTUP_TIMEOUT_MS = 16_000;

interface Env {
  PAGE_METADATA_CONTAINER: DurableObjectNamespace<PageMetadataContainer>;
}

export class PageMetadataContainer extends DurableObject<Env> {
  private startup?: Promise<void>;
  private ready = false;
  private monitoring?: Promise<void>;

  async fetch(request: Request): Promise<Response> {
    const container = this.ctx.container;
    if (!container) return new Response(null, { status: 503 });

    try {
      if (!this.ready || !container.running) {
        this.startup ??= this.startAndCheckHealth(container).finally(() => {
          this.startup = undefined;
        });
        await this.startup;
      }

      const response = await container.getTcpPort(PORT).fetch(
        new Request('http://container/head', {
          method: 'POST',
          headers: {
            'Content-Type':
              request.headers.get('Content-Type') ?? 'application/json',
          },
          body: request.body,
        }),
      );
      if (!response.ok) {
        await response.body?.cancel();
        return new Response(null, { status: 503 });
      }

      const metadata = response.body && (await extractOpenGraph(response));
      if (!metadata || (!metadata.title && !metadata.description)) {
        return new Response(null, { status: 204 });
      }
      return Response.json({
        title: metadata.title,
        description: metadata.description,
      });
    } catch {
      return new Response(null, { status: 503 });
    }
  }

  private async startAndCheckHealth(container: Container): Promise<void> {
    if (!container.running) container.start({ enableInternet: true });
    this.observeExit(container);
    await container.setInactivityTimeout(IDLE_TIMEOUT_MS);

    const deadline = Date.now() + STARTUP_TIMEOUT_MS;
    const port = container.getTcpPort(PORT);
    while (container.running && Date.now() < deadline) {
      try {
        const response = await port.fetch('http://container/health', {
          signal: AbortSignal.timeout(Math.min(1000, deadline - Date.now())),
        });
        await response.body?.cancel();
        if (response.ok && container.running) {
          this.ready = true;
          return;
        }
      } catch {
        // Retry the health probe while the HTTP server starts.
      }
      await scheduler.wait(200);
    }
    throw new Error('Page metadata container failed its readiness check');
  }

  private observeExit(container: Container): void {
    if (this.monitoring) return;
    this.monitoring = container
      .monitor()
      .catch(() =>
        console.error('Page metadata container exited with an error'),
      )
      .finally(() => {
        this.ready = false;
        this.monitoring = undefined;
      });
    this.ctx.waitUntil(this.monitoring);
  }
}

export default {
  fetch(request, env) {
    if (new URL(request.url).pathname !== '/head')
      return new Response(null, { status: 404 });
    if (request.method !== 'POST') {
      return new Response(null, { status: 405, headers: { Allow: 'POST' } });
    }

    return env.PAGE_METADATA_CONTAINER.getByName('head').fetch(request);
  },
} satisfies ExportedHandler<Env>;
