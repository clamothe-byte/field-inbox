/**
 * bindLocale — canonical locale wiring for Field-embedded products.
 * Vendored from clamothe-byte/Discoverpwd/src/app/bridge/bindLocale.ts.
 * Field sends `set-locale { locale }` and this resolves it to the nearest
 * supported locale, then calls `apply` (i18next changeLanguage, etc.).
 */
export interface BindLocaleOptions {
  supportedLocales: string[];
  apply: (code: string) => void;
  storageKey?: string;
  persist?: boolean;
}

export function bindLocale(
  opts: BindLocaleOptions,
): Record<string, (params: unknown) => void> {
  const { supportedLocales, apply, storageKey = "locale", persist = true } = opts;

  const resolve = (raw: unknown): string | null => {
    const want = String(raw ?? "").trim().toLowerCase();
    if (!want) return null;
    const exact = supportedLocales.find((c) => c.toLowerCase() === want);
    if (exact) return exact;
    const lang = want.split("-")[0];
    return supportedLocales.find((c) => c.toLowerCase().split("-")[0] === lang) ?? null;
  };

  const activate = (raw: unknown) => {
    const code = resolve(raw);
    if (!code) return;
    if (persist) {
      try { localStorage.setItem(storageKey, code); } catch { /* non-fatal */ }
    }
    apply(code);
  };

  return {
    "set-locale": (params) => {
      const p = (params ?? {}) as { locale?: string; value?: string; code?: string };
      activate(p.locale ?? p.value ?? p.code);
    },
  };
}
