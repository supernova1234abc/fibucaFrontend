import { useLanguage } from "../context/LanguageContext";

export default function LanguageSwitcher({ compact = false }) {
  const { lang, setLang, isSw } = useLanguage();

  return (
    <div className={`inline-flex items-center gap-2 ${compact ? "" : "text-sm"}`}>
      {!compact && (
        <span className="text-slate-600 font-medium">{isSw ? "Lugha" : "Language"}</span>
      )}
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        className="border border-slate-300 rounded-md px-2 py-1 text-sm bg-white"
        aria-label={isSw ? "Chagua lugha" : "Choose language"}
      >
        <option value="en">English</option>
        <option value="sw">Kiswahili</option>
      </select>
    </div>
  );
}
