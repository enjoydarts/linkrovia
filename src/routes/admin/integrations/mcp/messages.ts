export const mcpMessages = {
  en: {
    endpoint: 'Endpoint',
    enable: 'Enable MCP',
    disable: 'Disable MCP',
    keys: 'Manage API keys',
    connect:
      'Create a dedicated API key with mcp:connect and the scopes for the tools you want to use. Start with links:read for read-only link access. Revoke the key from the API keys page when you no longer need it.',
    client:
      'Configure your client to use Streamable HTTP with an Authorization: Bearer header. Clients that require an OAuth sign-in flow are unsupported.',
    secret:
      'Some clients store keys in plain text. Use your client’s secret storage or an environment variable when available.',
  },
  ja: {
    endpoint: 'エンドポイント',
    enable: 'MCP を有効にする',
    disable: 'MCP を無効にする',
    keys: 'API キーを管理',
    connect:
      'mcp:connect と、使うツールに必要なスコープを付けた専用 API キーを作成します。リンクの読み取りだけなら links:read を追加します。不要になったキーは API キー画面で失効させてください。',
    client:
      'クライアントを Streamable HTTP と Authorization: Bearer ヘッダーで設定します。OAuth ログインが必須のクライアントは利用できません。',
    secret:
      'キーを平文で保存するクライアントもあります。利用可能な場合はクライアントのシークレット保管機能か環境変数を使用してください。',
  },
  'zh-CN': {
    endpoint: '端点',
    enable: '启用 MCP',
    disable: '禁用 MCP',
    keys: '管理 API 密钥',
    connect:
      '创建专用 API 密钥，授予 mcp:connect 和所需工具的权限。若只需读取链接，请添加 links:read。不再使用时，请在 API 密钥页面撤销该密钥。',
    client:
      '将客户端配置为使用 Streamable HTTP 和 Authorization: Bearer 请求头。仅支持无需 OAuth 登录流程的客户端。',
    secret:
      '部分客户端会以明文存储密钥。如有条件，请使用客户端的密钥存储功能或环境变量。',
  },
  'zh-TW': {
    endpoint: '端點',
    enable: '啟用 MCP',
    disable: '停用 MCP',
    keys: '管理 API 金鑰',
    connect:
      '建立專用 API 金鑰，加入 mcp:connect 和所用工具的權限。若只需讀取連結，請加入 links:read。不再使用時，請在 API 金鑰頁面撤銷金鑰。',
    client:
      '將用戶端設定為使用 Streamable HTTP 與 Authorization: Bearer 標頭。需要 OAuth 登入流程的用戶端不受支援。',
    secret:
      '部分用戶端會以明文儲存金鑰。若可使用安全儲存功能或環境變數，請優先採用。',
  },
  es: {
    endpoint: 'URL de conexión',
    enable: 'Activar MCP',
    disable: 'Desactivar MCP',
    keys: 'Gestionar claves de API',
    connect:
      'Crea una clave de API exclusiva con mcp:connect y los permisos de las herramientas que necesitas. Usa links:read para consultar enlaces. Revoca la clave desde la página de claves de API cuando dejes de usarla.',
    client:
      'Configura el cliente con Streamable HTTP y la cabecera Authorization: Bearer. Los clientes que requieren inicio de sesión mediante OAuth no son compatibles.',
    secret:
      'Algunos clientes guardan las claves en texto plano. Si es posible, usa el almacén seguro del cliente o una variable de entorno.',
  },
  it: {
    endpoint: 'URL di connessione',
    enable: 'Attiva MCP',
    disable: 'Disattiva MCP',
    keys: 'Gestisci le chiavi API',
    connect:
      'Crea una chiave API dedicata con mcp:connect e i permessi degli strumenti che vuoi usare. Per leggere i link, usa links:read. Revoca la chiave dalla pagina delle chiavi API quando non ti serve più.',
    client:
      'Configura il client con Streamable HTTP e l’intestazione Authorization: Bearer. I client che richiedono l’accesso tramite OAuth non sono supportati.',
    secret:
      'Alcuni client salvano le chiavi in chiaro. Se possibile, usa l’archivio sicuro del client o una variabile d’ambiente.',
  },
  fr: {
    endpoint: 'URL de connexion',
    enable: 'Activer MCP',
    disable: 'Désactiver MCP',
    keys: 'Gérer les clés API',
    connect:
      'Créez une clé API dédiée dotée de mcp:connect et des autorisations requises par les outils. Pour consulter les liens, utilisez links:read. Révoquez la clé depuis la page des clés API lorsque vous n’en avez plus besoin.',
    client:
      'Configurez le client avec Streamable HTTP et l’en-tête Authorization: Bearer. Les clients qui exigent une connexion OAuth ne sont pas compatibles.',
    secret:
      'Certains clients conservent les clés en clair. Utilisez le stockage sécurisé du client ou une variable d’environnement si possible.',
  },
};
