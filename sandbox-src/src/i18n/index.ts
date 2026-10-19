// ==============================================================================
// JACKAL SANDBOX — GERENCIADOR REATIVO DE INTERNACIONALIZAÇÃO (i18n)
// ==============================================================================

import { pt, TranslationKey } from './locales/pt';
import { en } from './locales/en';

export type Language = 'pt' | 'en';

class I18nManager {
  private currentLang: Language = 'pt';
  private dictionaries: Record<Language, Record<TranslationKey, string>> = { pt, en };
  private listeners: Array<(lang: Language) => void> = [];

  constructor() {
    const saved = localStorage.getItem('jackal_sandbox_lang') as Language;
    if (saved === 'en' || saved === 'pt') {
      this.currentLang = saved;
    } else {
      const browserLang = navigator.language.toLowerCase();
      this.currentLang = browserLang.startsWith('en') ? 'en' : 'pt';
    }
  }

  public getLang(): Language {
    return this.currentLang;
  }

  public setLang(lang: Language): void {
    if (this.currentLang === lang) return;
    this.currentLang = lang;
    localStorage.setItem('jackal_sandbox_lang', lang);
    for (const listener of this.listeners) {
      listener(this.currentLang);
    }
  }

  public toggleLang(): Language {
    const next: Language = this.currentLang === 'pt' ? 'en' : 'pt';
    this.setLang(next);
    return next;
  }

  public t(key: TranslationKey, params?: Record<string, string | number>): string {
    const dict = this.dictionaries[this.currentLang] || this.dictionaries.pt;
    let text = dict[key] || this.dictionaries.pt[key] || key;

    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(new RegExp(`{${k}}`, 'g'), String(v));
      }
    }
    return text;
  }

  public subscribe(cb: (lang: Language) => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }
}

export const i18n = new I18nManager();
export const t = (key: TranslationKey, params?: Record<string, string | number>) => i18n.t(key, params);
