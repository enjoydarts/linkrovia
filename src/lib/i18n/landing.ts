import type { Locale } from './locale';

type LandingCopy = {
  headline: readonly [string, string];
  features: readonly [string, string, string, string, string, string];
  ownership: readonly [string, string];
  example: string;
  guide: string;
  home: string;
  independent: string;
};

export const landingCopy = {
  en: {
    headline: ['Every link.', 'The right destination.'],
    features: [
      'Shorten',
      'Create short links and QR codes on your own hostname.',
      'Route',
      'Send visitors to the right page based on device, country, or language.',
      'Understand',
      'See how link activity can be presented in the example below.',
    ],
    ownership: [
      'Own your links',
      'Run Linkrovia on your Cloudflare account and manage your own domains, links, and configuration.',
    ],
    example: 'Example analytics with sample data',
    guide: 'Development guide',
    home: 'Back to home',
    independent:
      'An independent open-source project. Unaffiliated with Cloudflare.',
  },
  ja: {
    headline: ['リンクを、', '最適な行き先へ。'],
    features: [
      '短縮',
      '自分のホスト名で短縮リンクとQRコードを作成できます。',
      '振り分け',
      'デバイス・国・言語に応じて、訪問者を適切なページへ案内します。',
      '把握',
      'リンクの利用状況を表示するイメージを、下のサンプルで確認できます。',
    ],
    ownership: [
      'リンクを自分で管理',
      '自分のCloudflareアカウントで運用し、ドメイン・リンク・設定を管理できます。',
    ],
    example: 'サンプルデータによる分析画面イメージ',
    guide: '開発ガイド',
    home: 'トップページへ戻る',
    independent:
      '独立したオープンソースプロジェクトです。Cloudflareとの提携はありません。',
  },
  'zh-CN': {
    headline: ['每个链接，', '都通向正确的目的地。'],
    features: [
      '缩短',
      '在自己的主机名上创建短链接和二维码。',
      '路由',
      '按设备、国家或语言将访客引导到合适的页面。',
      '了解',
      '下方的示例展示了链接活动的呈现方式。',
    ],
    ownership: [
      '掌控自己的链接',
      '在自己的 Cloudflare 账户上运行，管理域名、链接和配置。',
    ],
    example: '使用示例数据的分析预览',
    guide: '开发指南',
    home: '返回首页',
    independent: '独立开源项目，与 Cloudflare 无关联。',
  },
  'zh-TW': {
    headline: ['每個連結，', '都通往正確的目的地。'],
    features: [
      '縮短',
      '使用自己的主機名稱建立短連結和 QR 碼。',
      '路由',
      '依裝置、國家或語言將訪客引導至合適的頁面。',
      '掌握',
      '下方的範例展示連結活動的呈現方式。',
    ],
    ownership: [
      '掌握自己的連結',
      '在自己的 Cloudflare 帳戶上運作，管理網域、連結及設定。',
    ],
    example: '使用範例資料的分析預覽',
    guide: '開發指南',
    home: '返回首頁',
    independent: '獨立的開放原始碼專案，與 Cloudflare 無關。',
  },
  es: {
    headline: ['Cada enlace.', 'El destino adecuado.'],
    features: [
      'Acorta',
      'Crea enlaces cortos y códigos QR en tu propio dominio.',
      'Dirige',
      'Envía a cada visitante a la página adecuada según su dispositivo, país o idioma.',
      'Comprende',
      'El ejemplo de abajo muestra cómo se puede presentar la actividad de tus enlaces.',
    ],
    ownership: [
      'Controla tus enlaces',
      'Usa tu cuenta de Cloudflare y gestiona tus propios dominios, enlaces y ajustes.',
    ],
    example: 'Vista previa de análisis con datos de ejemplo',
    guide: 'Guía de desarrollo',
    home: 'Volver al inicio',
    independent:
      'Proyecto de código abierto independiente, sin afiliación con Cloudflare.',
  },
  it: {
    headline: ['Ogni link.', 'La destinazione giusta.'],
    features: [
      'Accorcia',
      'Crea link brevi e codici QR sul tuo hostname.',
      'Instrada',
      'Invia i visitatori alla pagina adatta in base a dispositivo, paese o lingua.',
      'Comprendi',
      'L’esempio qui sotto mostra come si può presentare l’attività dei link.',
    ],
    ownership: [
      'Controlla i tuoi link',
      'Usa il tuo account Cloudflare e gestisci domini, link e configurazione.',
    ],
    example: 'Anteprima delle analisi con dati di esempio',
    guide: 'Guida allo sviluppo',
    home: 'Torna alla pagina iniziale',
    independent:
      'Progetto open source indipendente, senza affiliazione con Cloudflare.',
  },
} satisfies Record<Locale, LandingCopy>;
