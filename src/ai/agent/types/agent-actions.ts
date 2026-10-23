export type AgentAction =
  | {
      type: 'setMusic';
      value: 'on' | 'off';
    }
  | {
      type: 'setTheme';
      value: 'light' | 'dark';
    }
  | {
      type: 'openCreatePost';
    }
  | {
      type: 'setLanguage';
      value:
        | 'de'
        | 'en'
        | 'es'
        | 'fr'
        | 'it'
        | 'ja'
        | 'pl'
        | 'pt'
        | 'tr'
        | 'uk';
    };

export const supportedAgentLanguages: Extract<
  AgentAction,
  { type: 'setLanguage' }
>['value'][] = ['de', 'en', 'uk', 'fr', 'es', 'pl', 'tr', 'it', 'pt', 'ja'];
