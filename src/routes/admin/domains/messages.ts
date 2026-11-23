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
    'The token is sent securely for each check or connection, never shown in the URL, and is not retained.',
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
    tokenWarning:
      'トークンは確認または接続のために送信され、URL に表示せず保存もしません。',
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
    tokenWarning: '令牌用于检查或连接，不会显示在 URL 中，也不会保存。',
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
    tokenWarning: '權杖用於檢查或連線，不會顯示於 URL，也不會保存。',
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
      'El token se usa para comprobar o conectar, no aparece en la URL ni se conserva.',
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
      'Il token viene usato per la verifica o la connessione, non appare nell’URL e non viene conservato.',
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
      'Le jeton sert à vérifier ou connecter, n’apparaît pas dans l’URL et n’est pas conservé.',
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

export type AutomaticDomainMessages = {
  title: string;
  intro: string;
  workerName: string;
  preflight: string;
  preflightReady: string;
  preflightAttached: string;
  preflightFailed: string;
  confirm: string;
  attach: string;
  attached: string;
  pending: string;
  error: string;
  manual: string;
  optionalIds: string;
  detachTitle: string;
  detachConfirm: string;
  detachButton: string;
  detached: string;
};

const automaticMessages: Record<Locale, AutomaticDomainMessages> = {
  en: {
    title: 'Connect automatically',
    intro:
      'For a hostname managed by Cloudflare, enter an API token with permission to manage Workers custom domains. Check access before connecting.',
    workerName: 'Worker name',
    preflight: 'Check access',
    preflightReady:
      'Access checked. Review the hostname and confirm to connect.',
    preflightAttached:
      'This hostname is already attached. Check its connection below.',
    preflightFailed:
      'The access check failed. Check the token, account and zone IDs, and hostname, then try again.',
    confirm:
      'I authorize connecting this hostname to this Worker in Cloudflare:',
    attach: 'Connect hostname',
    attached: 'Cloudflare accepted the connection. Check the connection below.',
    pending:
      'Cloudflare is preparing the connection. Wait a moment, then check it below.',
    error:
      'Could not connect the hostname. Check the details and permissions, then try again or use the manual guide.',
    manual: 'Connect manually',
    optionalIds: 'Optional: enter both IDs together. ',
    detachTitle: 'Remove from Cloudflare',
    detachConfirm:
      'I authorize removing this hostname from the Worker in Cloudflare:',
    detachButton: 'Remove hostname',
    detached: 'The hostname was removed from Cloudflare.',
  },
  ja: {
    title: '自動で接続',
    intro:
      'Cloudflare で管理するホスト名は、Workers のカスタムドメインを管理できる API トークンを入力します。接続前にアクセスを確認してください。',
    workerName: 'Worker 名',
    preflight: 'アクセスを確認',
    preflightReady:
      'アクセスを確認しました。ホスト名を確認し、接続を承認してください。',
    preflightAttached:
      'このホスト名はすでに接続されています。下で接続を確認してください。',
    preflightFailed:
      'アクセスを確認できませんでした。トークン、アカウント ID、ゾーン ID、ホスト名を確認して再試行してください。',
    confirm:
      'このホスト名を Cloudflare のこの Worker に接続することを承認します：',
    attach: 'ホスト名を接続',
    attached: 'Cloudflare が接続を受け付けました。下で接続を確認してください。',
    pending:
      'Cloudflare が接続を準備しています。しばらく待ってから下で確認してください。',
    error:
      '接続できませんでした。入力内容と権限を確認して再試行するか、手動の案内を利用してください。',
    manual: '手動で接続',
    optionalIds: '任意：ID は両方入力してください。',
    detachTitle: 'Cloudflare から削除',
    detachConfirm:
      'このホスト名を Cloudflare の Worker から削除することを承認します：',
    detachButton: 'ホスト名を削除',
    detached: 'Cloudflare からホスト名を削除しました。',
  },
  'zh-CN': {
    title: '自动连接',
    intro:
      '对于由 Cloudflare 管理的主机名，请输入有权管理 Workers 自定义域名的 API 令牌。连接前请检查访问权限。',
    workerName: 'Worker 名称',
    preflight: '检查访问权限',
    preflightReady: '访问权限已检查。请核对主机名并确认连接。',
    preflightAttached: '此主机名已连接。请在下方检查连接。',
    preflightFailed:
      '访问检查失败。请检查令牌、账户和区域 ID 及主机名，然后重试。',
    confirm: '我授权将此主机名连接到 Cloudflare 中的此 Worker：',
    attach: '连接主机名',
    attached: 'Cloudflare 已接受连接。请在下方检查连接。',
    pending: 'Cloudflare 正在准备连接。请稍后在下方检查。',
    error: '无法连接主机名。请检查信息和权限后重试，或使用手动指南。',
    manual: '手动连接',
    optionalIds: '可选：请同时输入两个 ID。',
    detachTitle: '从 Cloudflare 删除',
    detachConfirm: '我授权从 Cloudflare 的 Worker 中删除此主机名：',
    detachButton: '删除主机名',
    detached: '已从 Cloudflare 删除主机名。',
  },
  'zh-TW': {
    title: '自動連線',
    intro:
      '對於由 Cloudflare 管理的主機名稱，請輸入有權管理 Workers 自訂網域的 API 權杖。連線前請檢查存取權限。',
    workerName: 'Worker 名稱',
    preflight: '檢查存取權限',
    preflightReady: '存取權限已檢查。請核對主機名稱並確認連線。',
    preflightAttached: '此主機名稱已連線。請在下方檢查連線。',
    preflightFailed:
      '存取檢查失敗。請檢查權杖、帳戶和區域 ID 及主機名稱，然後重試。',
    confirm: '我授權將此主機名稱連線至 Cloudflare 中的此 Worker：',
    attach: '連線主機名稱',
    attached: 'Cloudflare 已接受連線。請在下方檢查連線。',
    pending: 'Cloudflare 正在準備連線。請稍後在下方檢查。',
    error: '無法連線主機名稱。請檢查資料和權限後重試，或使用手動指南。',
    manual: '手動連線',
    optionalIds: '選填：請同時輸入兩個 ID。',
    detachTitle: '從 Cloudflare 移除',
    detachConfirm: '我授權從 Cloudflare 的 Worker 移除此主機名稱：',
    detachButton: '移除主機名稱',
    detached: '已從 Cloudflare 移除主機名稱。',
  },
  es: {
    title: 'Conectar automáticamente',
    intro:
      'Para un host gestionado por Cloudflare, introduce un token API con permiso para gestionar dominios personalizados de Workers. Comprueba el acceso antes de conectar.',
    workerName: 'Nombre del Worker',
    preflight: 'Comprobar acceso',
    preflightReady: 'Acceso comprobado. Revisa el host y confirma la conexión.',
    preflightAttached:
      'Este host ya está conectado. Comprueba la conexión abajo.',
    preflightFailed:
      'No se pudo comprobar el acceso. Revisa el token, los ID de cuenta y zona y el host, y vuelve a intentarlo.',
    confirm: 'Autorizo conectar este host a este Worker en Cloudflare:',
    attach: 'Conectar host',
    attached: 'Cloudflare aceptó la conexión. Compruébala abajo.',
    pending:
      'Cloudflare está preparando la conexión. Espera y compruébala abajo.',
    error:
      'No se pudo conectar el host. Revisa los datos y permisos y vuelve a intentarlo, o usa la guía manual.',
    manual: 'Conectar manualmente',
    optionalIds: 'Opcional: introduce ambos ID. ',
    detachTitle: 'Eliminar de Cloudflare',
    detachConfirm: 'Autorizo eliminar este host del Worker en Cloudflare:',
    detachButton: 'Eliminar host',
    detached: 'El host se eliminó de Cloudflare.',
  },
  it: {
    title: 'Connetti automaticamente',
    intro:
      'Per un hostname gestito da Cloudflare, inserisci un token API con il permesso di gestire i domini personalizzati Workers. Verifica l’accesso prima di connettere.',
    workerName: 'Nome del Worker',
    preflight: 'Verifica accesso',
    preflightReady:
      'Accesso verificato. Controlla l’hostname e conferma la connessione.',
    preflightAttached:
      'Questo hostname è già collegato. Verifica la connessione qui sotto.',
    preflightFailed:
      'Verifica dell’accesso non riuscita. Controlla token, ID di account e zona e hostname, poi riprova.',
    confirm:
      'Autorizzo la connessione di questo hostname a questo Worker in Cloudflare:',
    attach: 'Connetti hostname',
    attached: 'Cloudflare ha accettato la connessione. Verificala qui sotto.',
    pending:
      'Cloudflare sta preparando la connessione. Attendi e verificala qui sotto.',
    error:
      'Impossibile connettere l’hostname. Controlla dati e permessi e riprova, oppure usa la guida manuale.',
    manual: 'Connetti manualmente',
    optionalIds: 'Facoltativo: inserisci entrambi gli ID. ',
    detachTitle: 'Rimuovi da Cloudflare',
    detachConfirm:
      'Autorizzo la rimozione di questo hostname dal Worker in Cloudflare:',
    detachButton: 'Rimuovi hostname',
    detached: 'Hostname rimosso da Cloudflare.',
  },
  fr: {
    title: 'Connecter automatiquement',
    intro:
      'Pour un hôte géré par Cloudflare, saisissez un jeton API autorisé à gérer les domaines personnalisés Workers. Vérifiez l’accès avant la connexion.',
    workerName: 'Nom du Worker',
    preflight: 'Vérifier l’accès',
    preflightReady: 'Accès vérifié. Vérifiez l’hôte et confirmez la connexion.',
    preflightAttached:
      'Cet hôte est déjà connecté. Vérifiez la connexion ci-dessous.',
    preflightFailed:
      'La vérification a échoué. Vérifiez le jeton, les ID du compte et de la zone et l’hôte, puis réessayez.',
    confirm:
      'J’autorise la connexion de cet hôte à ce Worker dans Cloudflare :',
    attach: 'Connecter l’hôte',
    attached: 'Cloudflare a accepté la connexion. Vérifiez-la ci-dessous.',
    pending:
      'Cloudflare prépare la connexion. Patientez puis vérifiez-la ci-dessous.',
    error:
      'Impossible de connecter l’hôte. Vérifiez les informations et les autorisations, puis réessayez ou suivez le guide manuel.',
    manual: 'Connecter manuellement',
    optionalIds: 'Facultatif : saisissez les deux ID. ',
    detachTitle: 'Supprimer de Cloudflare',
    detachConfirm:
      'J’autorise la suppression de cet hôte du Worker dans Cloudflare :',
    detachButton: 'Supprimer l’hôte',
    detached: 'L’hôte a été supprimé de Cloudflare.',
  },
};

export function automaticDomainMessages(
  locale: Locale,
): AutomaticDomainMessages {
  return automaticMessages[locale] ?? automaticMessages.en;
}

const operationMessages: Record<Locale, Record<string, string>> = {
  en: {
    permissions:
      'The token lacks access. Check the permissions and account and zone scope, then retry.',
    unsupported:
      'This hostname requires an active Cloudflare DNS zone and a Worker reachable at its workers.dev hostname. Check both, or follow the manual guide.',
    conflict:
      'A DNS record or another Worker may already use this hostname. Review it in Cloudflare before retrying.',
    operation_unknown:
      'Cloudflare did not confirm the result. Check the hostname in Cloudflare before retrying to avoid a duplicate change.',
    invalid_credentials:
      'The token or account and zone IDs are invalid. Check them and try again.',
    domain_changed:
      'The domain changed since this page opened. Reload the page and try again.',
    busy: 'Another operation is in progress. Wait, reload the page, and try again.',
    tokenLink: 'Create a Cloudflare API token',
    scopes:
      'For this account and zone, grant Account → Workers Scripts → Edit; Zone → Zone → Read; DNS → Read; and Workers Routes → Edit (Write).',
  },
  ja: {
    permissions:
      'トークンの権限が不足しています。権限と対象アカウント・ゾーンを確認して再試行してください。',
    unsupported:
      '有効な Cloudflare DNS ゾーンと workers.dev で到達可能な Worker が必要です。両方を確認するか、手動の案内を利用してください。',
    conflict:
      'このホスト名は DNS レコードまたは別の Worker で使用されている可能性があります。Cloudflare で確認してから再試行してください。',
    operation_unknown:
      'Cloudflare の処理結果を確認できませんでした。重複操作を避けるため、再試行前に Cloudflare でホスト名を確認してください。',
    invalid_credentials:
      'トークンまたはアカウント・ゾーン ID が無効です。確認して再試行してください。',
    domain_changed:
      'この画面を開いてからドメインが変更されました。ページを再読み込みして再試行してください。',
    busy: '別の操作が進行中です。待ってからページを再読み込みし、再試行してください。',
    tokenLink: 'Cloudflare API トークンを作成',
    scopes:
      '対象のアカウントとゾーンに、Account → Workers Scripts → Edit、Zone → Zone → Read、DNS → Read、Workers Routes → Edit（Write）を設定してください。',
  },
  'zh-CN': {
    permissions: '令牌权限不足。请检查权限及账户和区域范围后重试。',
    unsupported:
      '需要有效的 Cloudflare DNS 区域以及可通过 workers.dev 访问的 Worker。请检查两者或使用手动指南。',
    conflict:
      'DNS 记录或其他 Worker 可能已使用此主机名。请先在 Cloudflare 中检查。',
    operation_unknown:
      '无法确认 Cloudflare 操作结果。重试前请先在 Cloudflare 中检查主机名，避免重复操作。',
    invalid_credentials: '令牌或账户和区域 ID 无效。请检查后重试。',
    domain_changed: '打开页面后域名已更改。请重新加载页面后重试。',
    busy: '另一操作正在进行。请稍候并重新加载页面后重试。',
    tokenLink: '创建 Cloudflare API 令牌',
    scopes:
      '请为相关账户和区域授予 Account → Workers Scripts → Edit；Zone → Zone → Read、DNS → Read 和 Workers Routes → Edit（Write）。',
  },
  'zh-TW': {
    permissions: '權杖權限不足。請檢查權限以及帳戶和區域範圍後重試。',
    unsupported:
      '需要有效的 Cloudflare DNS 區域以及可透過 workers.dev 存取的 Worker。請檢查兩者或使用手動指南。',
    conflict:
      'DNS 記錄或其他 Worker 可能已使用此主機名稱。請先在 Cloudflare 檢查。',
    operation_unknown:
      '無法確認 Cloudflare 的操作結果。重試前請先在 Cloudflare 檢查主機名稱，避免重複操作。',
    invalid_credentials: '權杖或帳戶和區域 ID 無效。請檢查後重試。',
    domain_changed: '開啟頁面後網域已變更。請重新載入頁面後重試。',
    busy: '另一操作正在進行。請稍候並重新載入頁面後重試。',
    tokenLink: '建立 Cloudflare API 權杖',
    scopes:
      '請為相關帳戶和區域授予 Account → Workers Scripts → Edit；Zone → Zone → Read、DNS → Read 及 Workers Routes → Edit（Write）。',
  },
  es: {
    permissions:
      'El token no tiene acceso suficiente. Revisa los permisos y el alcance de la cuenta y zona.',
    unsupported:
      'Se necesitan una zona DNS activa de Cloudflare y un Worker accesible en workers.dev. Comprueba ambos o usa la guía manual.',
    conflict:
      'Un registro DNS u otro Worker ya podría usar este host. Revísalo en Cloudflare antes de reintentar.',
    operation_unknown:
      'Cloudflare no confirmó el resultado. Comprueba el host en Cloudflare antes de reintentar para evitar duplicados.',
    invalid_credentials:
      'El token o los ID de cuenta y zona no son válidos. Compruébalos y vuelve a intentarlo.',
    domain_changed:
      'El dominio cambió desde que abriste la página. Recárgala y vuelve a intentarlo.',
    busy: 'Hay otra operación en curso. Espera, recarga la página y vuelve a intentarlo.',
    tokenLink: 'Crear un token API de Cloudflare',
    scopes:
      'Para la cuenta y zona correspondientes, concede Account → Workers Scripts → Edit; Zone → Zone → Read; DNS → Read y Workers Routes → Edit (Write).',
  },
  it: {
    permissions:
      'Il token non dispone dell’accesso necessario. Controlla permessi e ambito di account e zona.',
    unsupported:
      'Servono una zona DNS Cloudflare attiva e un Worker raggiungibile su workers.dev. Controlla entrambi o usa la guida manuale.',
    conflict:
      'Un record DNS o un altro Worker potrebbe già usare questo hostname. Controlla su Cloudflare prima di riprovare.',
    operation_unknown:
      'Cloudflare non ha confermato il risultato. Controlla l’hostname su Cloudflare prima di riprovare per evitare duplicati.',
    invalid_credentials:
      'Il token o gli ID di account e zona non sono validi. Controllali e riprova.',
    domain_changed:
      'Il dominio è cambiato dall’apertura della pagina. Ricaricala e riprova.',
    busy: 'Un’altra operazione è in corso. Attendi, ricarica la pagina e riprova.',
    tokenLink: 'Crea un token API Cloudflare',
    scopes:
      'Per account e zona interessati, concedi Account → Workers Scripts → Edit; Zone → Zone → Read; DNS → Read e Workers Routes → Edit (Write).',
  },
  fr: {
    permissions:
      'Le jeton ne dispose pas des accès nécessaires. Vérifiez les autorisations et la portée du compte et de la zone.',
    unsupported:
      'Une zone DNS Cloudflare active et un Worker accessible sur workers.dev sont nécessaires. Vérifiez les deux ou suivez le guide manuel.',
    conflict:
      'Un enregistrement DNS ou un autre Worker utilise peut-être déjà cet hôte. Vérifiez dans Cloudflare avant de réessayer.',
    operation_unknown:
      'Cloudflare n’a pas confirmé le résultat. Vérifiez l’hôte dans Cloudflare avant de réessayer pour éviter une opération en double.',
    invalid_credentials:
      'Le jeton ou les ID du compte et de la zone sont invalides. Vérifiez-les et réessayez.',
    domain_changed:
      'Le domaine a changé depuis l’ouverture de cette page. Rechargez-la et réessayez.',
    busy: 'Une autre opération est en cours. Patientez, rechargez la page et réessayez.',
    tokenLink: 'Créer un jeton API Cloudflare',
    scopes:
      'Pour le compte et la zone concernés, accordez Account → Workers Scripts → Edit ; Zone → Zone → Read ; DNS → Read et Workers Routes → Edit (Write).',
  },
};

export function domainOperationMessages(
  locale: Locale,
): Record<string, string> {
  return operationMessages[locale] ?? operationMessages.en;
}
