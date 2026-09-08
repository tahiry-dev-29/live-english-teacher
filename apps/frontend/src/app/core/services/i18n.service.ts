import { Injectable, signal, computed, effect } from '@angular/core';

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
    'voices.hd': 'HD Audio',
    'voices.selected': 'Selected',
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
    'general.app_language': 'Langue de l\'application',
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
    'voices.hd': 'Audio HD',
    'voices.selected': 'Sélectionnée',
    'language.learning': 'Langue d\'apprentissage',
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
    'voices.hd': 'Audio HD',
    'voices.selected': 'Seleccionada',
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
  private static readonly STORAGE_KEY = 'app_language';

  readonly lang = signal<AppLanguage>(this.load());

  readonly t = computed(() => {
    const current = this.lang();
    return (key: string): string => TRANSLATIONS[current]?.[key] ?? key;
  });

  constructor() {
    this.applyLang(this.lang());

    effect(() => {
      const l = this.lang();
      localStorage.setItem(I18nService.STORAGE_KEY, l);
      this.applyLang(l);
    });
  }

  setLang(lang: AppLanguage): void {
    this.lang.set(lang);
  }

  private applyLang(lang: AppLanguage): void {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('lang', lang);
  }

  private load(): AppLanguage {
    try {
      return (localStorage.getItem(I18nService.STORAGE_KEY) as AppLanguage) || 'en';
    } catch {
      return 'en';
    }
  }
}
