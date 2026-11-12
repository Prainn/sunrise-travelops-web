/// <reference types="vite/client" />

/**
 * Vite 环境变量类型定义
 */
interface ImportMetaEnv {
  readonly VITE_APP_PORT: string;
  readonly VITE_APP_BASE_API: string;
  readonly VITE_APP_API_URL: string;
  readonly VITE_APP_TITLE?: string;
  /** 为 "true" 时 WhatsApp 工作台使用实时流；仅在 API 入口已验证 HTTP/2 与无缓冲 SSE 代理的环境开启。 */
  readonly VITE_APP_WHATSAPP_STREAM?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const __APP_INFO__: {
  pkg: {
    name: string;
    version: string;
  };
  buildTimestamp: number;
};
