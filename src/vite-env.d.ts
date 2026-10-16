/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
  readonly VITE_BACKEND_URL?: string;
  readonly VITE_BRAND_NAME?: string;
  readonly VITE_CURRENCY?: string;
  readonly VITE_LOCALE?: string;
}
