
import { useState, useRef, useEffect } from "react";
import { MdLanguage, MdCheck, MdExpandMore } from "react-icons/md";
import { useLang } from "../../context/LanguageContext";

export default function LanguageSelector({ compact = false }) {
  const { lang, changeLang, LANGUAGES } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  return (
    <div className="lang-selector" ref={ref}>
      {/* Trigger button */}
      <button
        type="button"
        className={`lang-trigger ${compact ? "lang-trigger--compact" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <MdLanguage size={16} className="lang-globe" />
        {!compact && (
          <>
            <span className="lang-flag">{current.flag}</span>
            <span className="lang-current">{current.nativeLabel}</span>
          </>
        )}
        <MdExpandMore
          size={15}
          className={`lang-chevron ${open ? "lang-chevron--open" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <ul className="lang-dropdown animate-scaleIn" role="listbox">
          {LANGUAGES.map((l) => (
            <li
              key={l.code}
              role="option"
              aria-selected={lang === l.code}
              className={`lang-option ${lang === l.code ? "lang-option--active" : ""}`}
              onClick={() => {
                changeLang(l.code);
                setOpen(false);
              }}
            >
              <span className="lang-opt-flag">{l.flag}</span>
              <span className="lang-opt-native">{l.nativeLabel}</span>
              <span className="lang-opt-english">{l.label}</span>
              {lang === l.code && <MdCheck size={14} className="lang-opt-check" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}