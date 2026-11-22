import type { Locale } from '$lib/i18n/locale';

export type DomainMessages = {
  domains: string;
  listHelp: string;
  back: string;
  connection: string;
  management: string;
  manage: string;
  none: string;
  addDomain: string;
  addHelp: string;
  hostname: string;
  readOnly: string;
  error: string;
  statuses: Record<string, string>;
  errors: Record<string, string>;
  wizardTitle: string;
  wizardIntro: string;
  cloudflareSteps: string[];
  automatic: string;
  externalDns: string;
  noWorkersCname: string;
  checkConnection: string;
  checking: string;
  ready: string;
  attached: string;
  active: string;
  failed: string;
  disconnect: string;
  disconnectConfirm: string;
  disconnected: string;
  diagnose: string;
  advanced: string;
  accountId: string;
  zoneId: string;
  token: string;
  diagnoseButton: string;
  tokenWarning: string;
  httpsOnly: string;
  backToDomains: string;
};

const en: DomainMessages = {
  domains: 'Domains',
  listHelp: 'Review deployment and custom domain connections.',
  back: 'Back to links',
  connection: 'Connection',
  management: 'Deployment host',
  manage: 'Connect',
  none: 'No domains yet.',
  addDomain: 'Add a domain',
  addHelp:
    'Add a hostname, then follow the Cloudflare guide to connect it to this Worker.',
  hostname: 'Hostname',
  readOnly: 'Only the owner can add or manage domains.',
  error: 'Could not save. Check the hostname and try again.',
  statuses: {
    draft: 'Draft',
    active: 'Active',
    disconnected: 'Disconnected',
    failed: 'Needs attention',
    checking: 'Checking',
    verifying: 'Verifying',
  },
  errors: {
    invalid_input: 'Enter a public hostname without a port.',
    duplicate: 'That hostname is already registered.',
    internal_error: 'The draft could not be opened.',
  },
  wizardTitle: 'Connect domain',
  wizardIntro:
    'Add this hostname as a Custom Domain for your own Worker in Cloudflare.',
  cloudflareSteps: [
    'Open Cloudflare Workers & Pages and select your Worker.',
    'Open Settings → Domains & Routes → Add → Custom Domain.',
    'Enter the hostname below and complete the Cloudflare prompts.',
    'Return here and check the connection.',
  ],
  automatic:
    'DNS and TLS are provisioned automatically when the hostname is in an active Cloudflare zone.',
  externalDns:
    'If DNS is managed elsewhere, transfer the zone to Cloudflare or use the Worker’s workers.dev hostname.',
  noWorkersCname: 'Do not create a CNAME pointing to workers.dev.',
  checkConnection: 'Check connection',
  checking: 'Checking…',
  ready: 'Connection is active.',
  attached:
    'Cloudflare reports this hostname is attached; verify the Worker response.',
  active: 'Active',
  failed:
    'Cloudflare has not reported an active connection yet. Check the hostname and try again.',
  disconnect: 'Disconnect',
  disconnectConfirm:
    'Disconnect this domain from Linkrovia? Remove the Custom Domain in Cloudflare separately.',
  disconnected:
    'Disconnected from Linkrovia. Remove the Custom Domain in Cloudflare separately.',
  diagnose: 'Diagnose (advanced)',
  advanced: 'Optional Cloudflare account and zone details',
  accountId: 'Account ID',
  zoneId: 'Zone ID',
  token: 'API token',
  diagnoseButton: 'Diagnose',
  tokenWarning:
    'The token is used once, never shown in the URL, and is not retained.',
  httpsOnly:
    'Browser verification requires HTTPS. On local HTTP preview, use the guide or advanced diagnosis.',
  backToDomains: 'Back to domains',
};

const common: Partial<DomainMessages> = {
  statuses: {
    draft: 'Draft',
    active: 'Active',
    disconnected: 'Disconnected',
    failed: 'Needs attention',
    checking: 'Checking',
    verifying: 'Verifying',
  },
  errors: {
    invalid_input: 'Enter a public hostname without a port.',
    duplicate: 'That hostname is already registered.',
    internal_error: 'The draft could not be opened.',
  },
};
const translations: Partial<Record<Locale, Partial<DomainMessages>>> = {
  ja: {
    domains: 'ドメイン',
    listHelp: 'デプロイ先とカスタムドメインの接続を確認します。',
    back: 'リンクに戻る',
    connection: '接続',
    management: 'デプロイ先',
    manage: '接続',
    none: 'ドメインはまだありません。',
    addDomain: 'ドメインを追加',
    addHelp:
      'ホスト名を追加し、Cloudflare の案内に従って Worker に接続します。',
    hostname: 'ホスト名',
    readOnly: 'ドメインの追加・管理はオーナーのみ可能です。',
    wizardTitle: 'ドメインを接続',
    wizardIntro:
      'Cloudflare でこのホスト名を自分の Worker のカスタムドメインとして追加します。',
    automatic:
      '有効な Cloudflare ゾーン内のホスト名なら DNS と TLS は自動で設定されます。',
    externalDns:
      'DNS を外部で管理している場合は、ゾーンを Cloudflare に移管するか workers.dev のホスト名を使います。',
    noWorkersCname: 'workers.dev を向く CNAME は作成しないでください。',
    checkConnection: '接続を確認',
    checking: '確認中…',
    ready: '接続が有効です。',
    active: '有効',
    failed:
      'まだ有効な接続が確認できません。ホスト名を確認して再試行してください。',
    disconnect: '接続を解除',
    disconnectConfirm:
      'Linkrovia からこのドメインを解除しますか？Cloudflare 側のカスタムドメインは別途削除してください。',
    disconnected:
      'Linkrovia から解除しました。Cloudflare 側のカスタムドメインも削除してください。',
    diagnose: '診断（高度な設定）',
    advanced: 'Cloudflare アカウントとゾーンの情報（任意）',
    accountId: 'アカウント ID',
    zoneId: 'ゾーン ID',
    token: 'API トークン',
    diagnoseButton: '診断',
    tokenWarning: 'トークンは一度だけ使用し、URL に表示せず保存もしません。',
    httpsOnly:
      'ブラウザー確認には HTTPS が必要です。ローカル HTTP プレビューでは案内または高度な診断を利用してください。',
    backToDomains: 'ドメイン一覧に戻る',
  },
  'zh-CN': {
    domains: '域名',
    listHelp: '查看部署域名和自定义域名连接。',
    back: '返回链接',
    connection: '连接',
    management: '部署域名',
    manage: '连接',
    none: '暂无域名。',
    addDomain: '添加域名',
    addHelp: '添加主机名，然后按照 Cloudflare 指引将其连接到 Worker。',
    hostname: '主机名',
    readOnly: '只有所有者可以添加或管理域名。',
    wizardTitle: '连接域名',
    wizardIntro:
      '在 Cloudflare 中将此主机名添加为您自己的 Worker 的自定义域名。',
    automatic: '如果主机名位于有效的 Cloudflare 区域，DNS 和 TLS 会自动配置。',
    externalDns:
      '如果 DNS 由其他服务管理，请将区域转移到 Cloudflare，或使用 workers.dev 主机名。',
    noWorkersCname: '不要创建指向 workers.dev 的 CNAME。',
    checkConnection: '检查连接',
    checking: '检查中…',
    ready: '连接已启用。',
    active: '已启用',
    failed: '尚未检测到有效连接。请检查主机名后重试。',
    disconnect: '断开连接',
    disconnectConfirm:
      '要从 Linkrovia 断开此域名吗？请另行在 Cloudflare 中删除自定义域名。',
    disconnected: '已从 Linkrovia 断开。请另行在 Cloudflare 中删除自定义域名。',
    diagnose: '诊断（高级）',
    advanced: '可选的 Cloudflare 账户和区域信息',
    accountId: '账户 ID',
    zoneId: '区域 ID',
    token: 'API 令牌',
    diagnoseButton: '诊断',
    tokenWarning: '令牌只使用一次，不会显示在 URL 中，也不会保存。',
    httpsOnly: '浏览器验证需要 HTTPS。本地 HTTP 预览请使用指引或高级诊断。',
    backToDomains: '返回域名',
  },
  'zh-TW': {
    domains: '網域',
    listHelp: '查看部署網域和自訂網域連線。',
    back: '返回連結',
    connection: '連線',
    management: '部署網域',
    manage: '連線',
    none: '尚無網域。',
    addDomain: '新增網域',
    addHelp: '新增主機名稱，然後依照 Cloudflare 指引連線至 Worker。',
    hostname: '主機名稱',
    readOnly: '只有擁有者可以新增或管理網域。',
    wizardTitle: '連線網域',
    wizardIntro: '在 Cloudflare 將此主機名稱新增為您自己的 Worker 自訂網域。',
    checkConnection: '檢查連線',
    checking: '檢查中…',
    ready: '連線已啟用。',
    active: '已啟用',
    failed: '尚未偵測到有效連線，請檢查主機名稱後重試。',
    disconnect: '中斷連線',
    disconnectConfirm:
      '要從 Linkrovia 中斷此網域嗎？請另行在 Cloudflare 刪除自訂網域。',
    disconnected: '已從 Linkrovia 中斷，請另行在 Cloudflare 刪除自訂網域。',
    diagnose: '診斷（進階）',
    advanced: '選填的 Cloudflare 帳戶和區域資訊',
    accountId: '帳戶 ID',
    zoneId: '區域 ID',
    token: 'API 權杖',
    diagnoseButton: '診斷',
    tokenWarning: '權杖只使用一次，不會顯示於 URL，也不會保存。',
    httpsOnly: '瀏覽器驗證需要 HTTPS。本機 HTTP 預覽請使用指引或進階診斷。',
    backToDomains: '返回網域',
  },
  es: {
    domains: 'Dominios',
    listHelp:
      'Revisa las conexiones del despliegue y los dominios personalizados.',
    back: 'Volver a enlaces',
    connection: 'Conexión',
    management: 'Host de despliegue',
    manage: 'Conectar',
    none: 'Aún no hay dominios.',
    addDomain: 'Añadir un dominio',
    addHelp:
      'Añade un nombre de host y sigue la guía de Cloudflare para conectarlo a este Worker.',
    hostname: 'Nombre de host',
    readOnly: 'Solo el propietario puede añadir o gestionar dominios.',
    wizardTitle: 'Conectar dominio',
    wizardIntro:
      'Añade este host como dominio personalizado de tu Worker en Cloudflare.',
    checkConnection: 'Comprobar conexión',
    checking: 'Comprobando…',
    ready: 'La conexión está activa.',
    active: 'Activo',
    failed:
      'Cloudflare aún no indica una conexión activa. Comprueba el host y vuelve a intentarlo.',
    disconnect: 'Desconectar',
    disconnectConfirm:
      '¿Desconectar este dominio de Linkrovia? Elimina el dominio personalizado en Cloudflare por separado.',
    disconnected:
      'Desconectado de Linkrovia. Elimina el dominio personalizado en Cloudflare por separado.',
    diagnose: 'Diagnosticar (avanzado)',
    advanced: 'Datos opcionales de cuenta y zona de Cloudflare',
    accountId: 'ID de cuenta',
    zoneId: 'ID de zona',
    token: 'Token de API',
    diagnoseButton: 'Diagnosticar',
    tokenWarning:
      'El token se usa una vez, no aparece en la URL ni se conserva.',
    httpsOnly:
      'La verificación del navegador requiere HTTPS. En una vista previa HTTP local, usa la guía o el diagnóstico avanzado.',
    backToDomains: 'Volver a dominios',
  },
  it: {
    domains: 'Domini',
    listHelp:
      'Controlla le connessioni del deployment e dei domini personalizzati.',
    back: 'Torna ai link',
    connection: 'Connessione',
    management: 'Host di deployment',
    manage: 'Connetti',
    none: 'Nessun dominio.',
    addDomain: 'Aggiungi dominio',
    addHelp:
      'Aggiungi un hostname e segui la guida Cloudflare per collegarlo a questo Worker.',
    hostname: 'Hostname',
    readOnly: 'Solo il proprietario può aggiungere o gestire domini.',
    wizardTitle: 'Connetti dominio',
    wizardIntro:
      'Aggiungi questo hostname come dominio personalizzato del tuo Worker in Cloudflare.',
    checkConnection: 'Controlla connessione',
    checking: 'Controllo…',
    ready: 'Connessione attiva.',
    active: 'Attivo',
    failed:
      'Cloudflare non segnala ancora una connessione attiva. Controlla l’hostname e riprova.',
    disconnect: 'Disconnetti',
    disconnectConfirm:
      'Disconnettere questo dominio da Linkrovia? Rimuovi separatamente il dominio personalizzato in Cloudflare.',
    disconnected:
      'Disconnesso da Linkrovia. Rimuovi separatamente il dominio personalizzato in Cloudflare.',
    diagnose: 'Diagnosi (avanzata)',
    advanced: 'Dati facoltativi dell’account e della zona Cloudflare',
    accountId: 'ID account',
    zoneId: 'ID zona',
    token: 'Token API',
    diagnoseButton: 'Diagnosi',
    tokenWarning:
      'Il token viene usato una volta, non appare nell’URL e non viene conservato.',
    httpsOnly:
      'La verifica nel browser richiede HTTPS. Nella preview HTTP locale usa la guida o la diagnosi avanzata.',
    backToDomains: 'Torna ai domini',
  },
  fr: {
    domains: 'Domaines',
    listHelp:
      'Consultez les connexions du déploiement et des domaines personnalisés.',
    back: 'Retour aux liens',
    connection: 'Connexion',
    management: 'Hôte de déploiement',
    manage: 'Connecter',
    none: 'Aucun domaine.',
    addDomain: 'Ajouter un domaine',
    addHelp:
      'Ajoutez un nom d’hôte, puis suivez le guide Cloudflare pour le connecter à ce Worker.',
    hostname: 'Nom d’hôte',
    readOnly: 'Seul le propriétaire peut ajouter ou gérer des domaines.',
    wizardTitle: 'Connecter un domaine',
    wizardIntro:
      'Ajoutez cet hôte comme domaine personnalisé de votre Worker dans Cloudflare.',
    checkConnection: 'Vérifier la connexion',
    checking: 'Vérification…',
    ready: 'La connexion est active.',
    active: 'Actif',
    failed:
      'Cloudflare ne signale pas encore de connexion active. Vérifiez l’hôte et réessayez.',
    disconnect: 'Déconnecter',
    disconnectConfirm:
      'Déconnecter ce domaine de Linkrovia ? Supprimez séparément le domaine personnalisé dans Cloudflare.',
    disconnected:
      'Déconnecté de Linkrovia. Supprimez séparément le domaine personnalisé dans Cloudflare.',
    diagnose: 'Diagnostiquer (avancé)',
    advanced: 'Informations facultatives du compte et de la zone Cloudflare',
    accountId: 'ID du compte',
    zoneId: 'ID de zone',
    token: 'Jeton API',
    diagnoseButton: 'Diagnostiquer',
    tokenWarning:
      'Le jeton est utilisé une fois, n’apparaît pas dans l’URL et n’est pas conservé.',
    httpsOnly:
      'La vérification dans le navigateur nécessite HTTPS. En aperçu HTTP local, utilisez le guide ou le diagnostic avancé.',
    backToDomains: 'Retour aux domaines',
  },
};

const guidance: Partial<
  Record<
    Locale,
    Pick<
      DomainMessages,
      'cloudflareSteps' | 'automatic' | 'externalDns' | 'noWorkersCname'
    >
  >
> = {
  'zh-TW': {
    cloudflareSteps: [
      '開啟 Cloudflare Workers & Pages 並選取您的 Worker。',
      '開啟 Settings → Domains & Routes → Add → Custom Domain。',
      '輸入下方主機名稱並完成 Cloudflare 指示。',
      '返回此處檢查連線。',
    ],
    automatic: '主機名稱位於有效的 Cloudflare 區域時，DNS 與 TLS 會自動設定。',
    externalDns:
      '若由其他服務管理 DNS，請將區域移轉至 Cloudflare，或使用 workers.dev 主機名稱。',
    noWorkersCname: '請勿建立指向 workers.dev 的 CNAME。',
  },
  es: {
    cloudflareSteps: [
      'Abre Cloudflare Workers & Pages y selecciona tu Worker.',
      'Abre Settings → Domains & Routes → Add → Custom Domain.',
      'Introduce el host indicado y completa los pasos de Cloudflare.',
      'Vuelve aquí y comprueba la conexión.',
    ],
    automatic:
      'DNS y TLS se configuran automáticamente cuando el host está en una zona activa de Cloudflare.',
    externalDns:
      'Si el DNS se gestiona externamente, transfiere la zona a Cloudflare o usa el host workers.dev del Worker.',
    noWorkersCname: 'No crees un CNAME que apunte a workers.dev.',
  },
  it: {
    cloudflareSteps: [
      'Apri Cloudflare Workers & Pages e seleziona il Worker.',
      'Apri Settings → Domains & Routes → Add → Custom Domain.',
      'Inserisci l’hostname indicato e completa i passaggi Cloudflare.',
      'Torna qui e controlla la connessione.',
    ],
    automatic:
      'DNS e TLS vengono configurati automaticamente quando l’hostname è in una zona Cloudflare attiva.',
    externalDns:
      'Se il DNS è gestito altrove, trasferisci la zona a Cloudflare oppure usa l’hostname workers.dev del Worker.',
    noWorkersCname: 'Non creare un CNAME che punti a workers.dev.',
  },
  fr: {
    cloudflareSteps: [
      'Ouvrez Cloudflare Workers & Pages et sélectionnez votre Worker.',
      'Ouvrez Settings → Domains & Routes → Add → Custom Domain.',
      'Saisissez l’hôte indiqué et terminez les étapes Cloudflare.',
      'Revenez ici et vérifiez la connexion.',
    ],
    automatic:
      'Le DNS et TLS sont configurés automatiquement lorsque l’hôte est dans une zone Cloudflare active.',
    externalDns:
      'Si le DNS est géré ailleurs, transférez la zone vers Cloudflare ou utilisez l’hôte workers.dev du Worker.',
    noWorkersCname: 'Ne créez pas de CNAME pointant vers workers.dev.',
  },
};

export function domainMessages(locale: Locale): DomainMessages {
  const translated = translations[locale] ?? {};
  return {
    ...en,
    ...common,
    ...translated,
    statuses: { ...en.statuses, ...(translated.statuses ?? {}) },
    errors: { ...en.errors, ...(translated.errors ?? {}) },
    ...(guidance[locale] ?? {}),
  };
}
