interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}