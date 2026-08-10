// src/locales/index.js
// Central export for all translation files

import en from "./en";
import hi from "./hi";
import mr from "./mr";

export const LANGUAGES = [
  { code: "en", label: "English",  nativeLabel: "English",  flag: "🇬🇧" },
  { code: "hi", label: "Hindi",    nativeLabel: "हिन्दी",   flag: "🇮🇳" },
  { code: "mr", label: "Marathi",  nativeLabel: "मराठी",    flag: "🇮🇳" },
];

export const translations = { en, hi, mr };

export { en, hi, mr };