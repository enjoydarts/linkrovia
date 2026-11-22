import type { Locale } from '$lib/i18n/locale';

type ListMessages = {
  copy: string;
  copied: string;
  copyError: string;
  clear: string;
};

export const listMessages = {
  en: {
    copy: 'Copy short URL',
    copied: 'Short URL copied.',
    copyError: 'Select the short URL to copy it manually.',
    clear: 'Clear filters',
  },
  ja: {
    copy: '短縮URLをコピー',
    copied: '短縮URLをコピーしました。',
    copyError: '短縮URLを選択してコピーしてください。',
    clear: '絞り込みを解除',
  },
  'zh-CN': {
    copy: '复制短链接',
    copied: '短链接已复制。',
    copyError: '请选择短链接并手动复制。',
    clear: '清除筛选',
  },
  'zh-TW': {
    copy: '複製短網址',
    copied: '短網址已複製。',
    copyError: '請選取短網址並手動複製。',
    clear: '清除篩選',
  },
  es: {
    copy: 'Copiar URL corta',
    copied: 'URL corta copiada.',
    copyError: 'Selecciona la URL corta para copiarla manualmente.',
    clear: 'Quitar filtros',
  },
  it: {
    copy: 'Copia URL breve',
    copied: 'URL breve copiato.',
    copyError: 'Seleziona e copia manualmente l’URL breve.',
    clear: 'Rimuovi filtri',
  },
  fr: {
    copy: 'Copier l’URL courte',
    copied: 'URL courte copiée.',
    copyError: 'Sélectionnez et copiez l’URL courte manuellement.',
    clear: 'Effacer les filtres',
  },
} satisfies Record<Locale, ListMessages>;
