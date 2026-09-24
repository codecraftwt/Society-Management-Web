// src/context/LanguageContext.jsx
import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { translations, LANGUAGES } from "../locales";

const interpolate = (str, params) => {
  if (!str || typeof str !== "string" || !params || typeof params !== "object") return str;
  let out = str;
  Object.keys(params).forEach((k) => {
    out = out.replace(new RegExp(`\\{{1,2}\\s*${k}\\s*\\}{1,2}`, "g"), params[k]);
  });
  return out;
};

const resolveT = (lang, key, arg1, arg2) => {
  let fb = typeof arg1 === "string" ? arg1 : (typeof arg2 === "string" ? arg2 : undefined);
  let p = (typeof arg1 === "object" && arg1 !== null) ? arg1 : ((typeof arg2 === "object" && arg2 !== null) ? arg2 : undefined);
  let str = translations[lang]?.[key] ?? translations["en"]?.[key] ?? fb ?? key;
  return interpolate(str, p);
};

const defaultT = (key, arg1, arg2) => resolveT("en", key, arg1, arg2);

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
    (key, arg1, arg2) => resolveT(lang, key, arg1, arg2),
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
}

export default LanguageContext;