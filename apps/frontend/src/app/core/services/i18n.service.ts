import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { CookieService } from 'ngx-cookie-service';
import {
  migrateLocalStorageToCookie,
  readPrefCookie,
  writePrefCookie,
} from '../utils/cookie.util';

export type AppLanguage = 'en' | 'fr' | 'es';

const TRANSLATIONS: Record<AppLanguage, Record<string, string>> = {
  en: {
    'settings.title': 'Settings',
    'settings.general': 'General',
    'settings.ai_model': 'AI Model',
    'settings.voices': 'Voices',
    'settings.language': 'Language',
    'settings.save': 'Save',
    'settings.cancel': 'Cancel',
    'general.theme': 'Theme',
    'general.theme.dark': 'Dark',
    'general.theme.light': 'Light',
    'general.theme.system': 'System',
    'general.font_size': 'Font Size',
    'general.font.small': 'Small',
    'general.font.medium': 'Medium',
    'general.font.large': 'Large',
    'general.app_language': 'App Language',
    'ai.provider': 'AI Provider & Model',
    'ai.provider.beta': 'Beta',
    'ai.custom_keys': 'Custom API Keys',
    'ai.custom_keys.optional': 'Optional',
    'ai.keys.groq': 'Groq API Key',
    'ai.keys.gemini': 'Gemini API Key',
    'ai.keys.custom': 'Custom',
    'ai.keys.server_default': 'Server default',
    'ai.keys.tutorial': 'How to get your API keys',
    'ai.keys.clear': 'Clear',
    'voices.title': 'AI Tutor Voices',
    'voices.provider': 'TTS Provider',
    'voices.hd': 'HD Audio',
    'voices.selected': 'Selected',
    'voices.model': 'Audio Model',
    'voices.stt_model': 'Speech-to-Text (STT) Model',
    'language.learning': 'Learning Language',
    'language.learning_hint': 'Also selectable from the chat input',
    'chat.placeholder': 'Type a message...',
    'chat.language': 'Language',
  },
  fr: {
    'settings.title': 'Paramètres',
    'settings.general': 'Général',
    'settings.ai_model': 'Modèle IA',
    'settings.voices': 'Voix',
    'settings.language': 'Langue',
    'settings.save': 'Enregistrer',
    'settings.cancel': 'Annuler',
    'general.theme': 'Thème',
    'general.theme.dark': 'Sombre',
    'general.theme.light': 'Clair',
    'general.theme.system': 'Système',
    'general.font_size': 'Taille de police',
    'general.font.small': 'Petit',
    'general.font.medium': 'Moyen',
    'general.font.large': 'Grand',
    'general.app_language': "Langue de l'application",
    'ai.provider': 'Fournisseur & Modèle IA',
    'ai.provider.beta': 'Bêta',
    'ai.custom_keys': 'Clés API personnalisées',
    'ai.custom_keys.optional': 'Optionnel',
    'ai.keys.groq': 'Clé API Groq',
    'ai.keys.gemini': 'Clé API Gemini',
    'ai.keys.custom': 'Personnalisée',
    'ai.keys.server_default': 'Défaut serveur',
    'ai.keys.tutorial': 'Comment obtenir vos clés API',
    'ai.keys.clear': 'Effacer',
    'voices.title': 'Voix du tuteur IA',
    'voices.provider': 'Fournisseur TTS',
    'voices.hd': 'Audio HD',
    'voices.selected': 'Sélectionnée',
    'voices.model': 'Modèle audio',
    'voices.stt_model': 'Modèle Reconnaissance Vocale (STT)',
    'language.learning': "Langue d'apprentissage",
    'language.learning_hint': 'Aussi sélectionnable depuis la barre de chat',
    'chat.placeholder': 'Tapez un message...',
    'chat.language': 'Langue',
  },
  es: {
    'settings.title': 'Configuración',
    'settings.general': 'General',
    'settings.ai_model': 'Modelo IA',
    'settings.voices': 'Voces',
    'settings.language': 'Idioma',
    'settings.save': 'Guardar',
    'settings.cancel': 'Cancelar',
    'general.theme': 'Tema',
    'general.theme.dark': 'Oscuro',
    'general.theme.light': 'Claro',
    'general.theme.system': 'Sistema',
    'general.font_size': 'Tamaño de fuente',
    'general.font.small': 'Pequeño',
    'general.font.medium': 'Mediano',
    'general.font.large': 'Grande',
    'general.app_language': 'Idioma de la aplicación',
    'ai.provider': 'Proveedor & Modelo IA',
    'ai.provider.beta': 'Beta',
    'ai.custom_keys': 'Claves API personalizadas',
    'ai.custom_keys.optional': 'Opcional',
    'ai.keys.groq': 'Clave API Groq',
    'ai.keys.gemini': 'Clave API Gemini',
    'ai.keys.custom': 'Personalizada',
    'ai.keys.server_default': 'Predeterminada del servidor',
    'ai.keys.tutorial': 'Cómo obtener sus claves API',
    'ai.keys.clear': 'Borrar',
    'voices.title': 'Voces del tutor IA',
    'voices.provider': 'Proveedor TTS',
    'voices.hd': 'Audio HD',
    'voices.selected': 'Seleccionada',
    'voices.model': 'Modelo de audio',
    'voices.stt_model': 'Modelo Reconocimiento de Voz (STT)',
    'language.learning': 'Idioma de aprendizaje',
    'language.learning_hint': 'También seleccionable desde la entrada de chat',
    'chat.placeholder': 'Escribe un mensaje...',
    'chat.language': 'Idioma',
  },
};

@Injectable({
  providedIn: 'root',
})
export class I18nService {
  private static readonly COOKIE_NAME = 'app_language';

  private readonly cookies = inject(CookieService);
  private readonly documentRef = inject(DOCUMENT, { optional: true });

  readonly lang = signal<AppLanguage>(this.load());

  readonly t = computed(() => {
    const current = this.lang();
    return (key: string): string => TRANSLATIONS[current]?.[key] ?? key;
  });

  constructor() {
    this.applyLang(this.lang());

    effect(() => {
      const l = this.lang();
      writePrefCookie(this.cookies, I18nService.COOKIE_NAME, l);
      this.applyLang(l);
    });
  }

  setLang(lang: AppLanguage): void {
    this.lang.set(lang);
  }

  private applyLang(lang: AppLanguage): void {
    // Best practice Angular SSR-safe : DOCUMENT injecté plutôt que global document.
    this.documentRef?.documentElement?.setAttribute('lang', lang);
  }

  private load(): AppLanguage {
    // 1. Cookie = source de vérité.
    const fromCookie = readPrefCookie(this.cookies, I18nService.COOKIE_NAME);
    if (fromCookie === 'en' || fromCookie === 'fr' || fromCookie === 'es') {
      return fromCookie;
    }

    // 2. Migration one-shot depuis l'ancien localStorage, puis nettoyage.
    const migrated = migrateLocalStorageToCookie(I18nService.COOKIE_NAME);
    if (migrated === 'en' || migrated === 'fr' || migrated === 'es') {
      writePrefCookie(this.cookies, I18nService.COOKIE_NAME, migrated);
      return migrated;
    }
    return 'en';
  }
}
