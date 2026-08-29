// src/context/LanguageContext.jsx
import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { translations, LANGUAGES } from "../locales";

const defaultT = (key, fallback) => translations["en"]?.[key] ?? fallback ?? undefined;

const defaultValue = {
  lang:       "en",
  changeLang: () => {},
  t:          defaultT,
  LANGUAGES,
};

const LanguageContext = createContext(defaultValue);

/* ─────────────────────────────────────────────────────────────
   LanguageProvider

   Props:
   - role (string): "admin" | "resident" | "guard"
     Each role gets its own localStorage key so their language
     preferences are completely independent:
       app_lang_admin    → Admin's saved language
       app_lang_resident → Resident's saved language
       app_lang_guard    → Guard's saved language
───────────────────────────────────────────────────────────── */
export function LanguageProvider({ role, children }) {
  const storageKey = `app_lang_${(role || "guest").toLowerCase()}`;

  const [lang, setLang] = useState(() => {
    return localStorage.getItem(storageKey) || "en";
  });

  /* Re-read correct stored language if role changes */
  useEffect(() => {
    const stored = localStorage.getItem(storageKey) || "en";
    setLang(stored);
  }, [storageKey]);

  const changeLang = useCallback((code) => {
    setLang(code);
    localStorage.setItem(storageKey, code);
  }, [storageKey]);

  const t = useCallback(
    (key, fallback) => translations[lang]?.[key] ?? translations["en"]?.[key] ?? fallback ?? undefined,
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, changeLang, t, LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

/* ─── Hook ─── */
export function useLang() {
  return useContext(LanguageContext);
  /* No throw — returns defaultValue if used outside a provider,
     so the app degrades gracefully instead of crashing. */
}

export default LanguageContext;