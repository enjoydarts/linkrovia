<script lang="ts">
  import type { Chart as ChartInstance } from 'chart.js';

  let {
    kind,
    labels,
    values,
    label,
  }: {
    kind: 'line' | 'bar';
    labels: string[];
    values: number[];
    label: string;
  } = $props();
  let canvas: HTMLCanvasElement;

  $effect(() => {
    const chartLabels = labels;
    const chartValues = values;
    const chartLabel = label;
    const chartKind = kind;
    let chart: ChartInstance | undefined;
    let cancelled = false;
    const colors = () => {
      // Resolve light-dark() and nested custom properties through a real CSS property.
      const probe = document.createElement('span');
      document.body.appendChild(probe);
      const resolve = (name: string) => {
        probe.style.color = `var(${name})`;
        return getComputedStyle(probe).color;
      };
      const result = {
        series: resolve('--ui-series-1'),
        text: resolve('--ui-text-muted'),
        border: resolve('--ui-border'),
      };
      probe.remove();
      return result;
    };
    const render = async () => {
      const { default: Chart } = await import('chart.js/auto');
      if (cancelled) return;
      chart?.destroy();
      const color = colors();
      chart = new Chart(canvas, {
        type: chartKind,
        data: {
          labels: chartLabels,
          datasets: [
            {
              label: chartLabel,
              data: chartValues,
              borderColor: color.series,
              backgroundColor: color.series,
              borderWidth: 2,
              tension: 0.25,
              pointRadius: chartKind === 'line' ? 2 : 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          indexAxis: chartKind === 'bar' ? 'y' : 'x',
          plugins: { legend: { display: false } },
          scales: {
            x: {
              ticks: { color: color.text },
              grid: { color: color.border },
              ...(chartKind === 'bar' ? { beginAtZero: true } : {}),
            },
            y: {
              ticks: { color: color.text },
              grid: { color: color.border },
              ...(chartKind === 'line' ? { beginAtZero: true } : {}),
            },
          },
        },
      });
    };
    void render();
    const observer = new MutationObserver(() => {
      void render();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'style', 'class'],
    });
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onTheme = () => {
      void render();
    };
    media.addEventListener('change', onTheme);
    return () => {
      cancelled = true;
      observer.disconnect();
      media.removeEventListener('change', onTheme);
      chart?.destroy();
    };
  });
</script>

<div class="chart" class:breakdown={kind === 'bar'}>
  <canvas bind:this={canvas} aria-hidden="true"></canvas>
</div>

<style>
  .chart {
    position: relative;
    height: 16rem;
    min-width: 0;
    margin: 1rem 0;
  }
  .chart.breakdown {
    height: 18rem;
  }
</style>
