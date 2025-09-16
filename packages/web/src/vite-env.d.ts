/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_FEATURE_GLOBAL_MENU?: '0' | '1';
  readonly VITE_FEATURE_HOME?: '0' | '1';
  readonly VITE_FEATURE_HOME_AI?: '0' | '1';
  readonly VITE_FEATURE_PUBLIC_DEMO?: '0' | '1';
}
interface ImportMeta { readonly env: ImportMetaEnv; }
