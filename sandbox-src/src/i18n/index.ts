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
    // Same language as the Atlas (jackal_atlas_lang) unless the Sandbox has its own saved choice
    let saved: string | null = null;
    try {
      saved = localStorage.getItem('jackal_sandbox_lang') || localStorage.getItem('jackal_atlas_lang');
    } catch { saved = null; }
    if (saved === 'en' || saved === 'pt') {
      this.currentLang = saved;
    } else {
      const browserLang = navigator.language.toLowerCase();
      this.currentLang = browserLang.startsWith('en') ? 'en' : 'pt';
    }
    this.aplicarDocumento();
  }

  /** Page language and title follow the chosen language */
  private aplicarDocumento(): void {
    if (typeof document === 'undefined' || !document.documentElement) return;
    document.documentElement.lang = this.currentLang === 'en' ? 'en-US' : 'pt-BR';
    document.title = this.currentLang === 'en'
      ? 'Jackal Sandbox — Collaborative Relief Sandbox (Round 2)'
      : 'Jackal Sandbox — Caixa de Areia Colaborativa de Relevo (Round 2)';
  }

  public getLang(): Language {
    return this.currentLang;
  }

  public setLang(lang: Language): void {
    if (this.currentLang === lang) return;
    this.currentLang = lang;
    try {
      // Shared with the Atlas so EN/PT carries over between the 2D map and the Sandbox
      localStorage.setItem('jackal_sandbox_lang', lang);
      localStorage.setItem('jackal_atlas_lang', lang);
    } catch { /* storage blocked: the choice lasts for this page only */ }
    this.aplicarDocumento();
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

/** Inline PT/EN text for runtime messages: tr('Salvo', 'Saved') */
export function tr(pt: string, en: string): string {
  return i18n.getLang() === 'en' ? en : pt;
}
