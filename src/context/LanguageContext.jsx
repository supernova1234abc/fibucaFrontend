import { createContext, useContext, useMemo, useState } from "react";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const saved = localStorage.getItem("fibuca_lang");
    return saved === "sw" ? "sw" : "en";
  });

  const setLang = (nextLang) => {
    const normalized = nextLang === "sw" ? "sw" : "en";
    setLangState(normalized);
    localStorage.setItem("fibuca_lang", normalized);
  };

  const value = useMemo(
    () => ({ lang, setLang, isSw: lang === "sw" }),
    [lang]
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return ctx;
}
