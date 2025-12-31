/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CHAT_AI_ASSISTANT_API_URL?: string
  readonly VITE_CHAT_AI_TOKEN?: string
  readonly REACT_APP_CHAT_AI_ASSISTANT_API_URL?: string
  readonly REACT_APP_CHAT_AI_TOKEN?: string
  readonly NEXT_PUBLIC_CHAT_AI_ASSISTANT_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

