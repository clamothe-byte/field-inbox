import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import es from "./es.json";
import de from "./de.json";
import fr from "./fr.json";

export const SUPPORTED_LOCALES = [
  { code: "en-US", language: "en", endonym: "English" },
  { code: "es-ES", language: "es", endonym: "Español" },
  { code: "de-DE", language: "de", endonym: "Deutsch" },
  { code: "fr-FR", language: "fr", endonym: "Français" },
] as const;

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
    de: { translation: de },
    fr: { translation: fr },
  },
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
