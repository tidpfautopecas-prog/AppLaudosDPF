import { pdfGenerator } from './pdfGenerator';

export interface AppSettings {
  sharepointApiUrl: string;
  defaultFileNameFormat: string;
}

// ✅ NOVA CHAVE DPF
const SETTINGS_KEY = 'dpf_app_settings';

export const defaultSettings: AppSettings = {
  // ✅ API DPF
  sharepointApiUrl: 'https://api-sharepointdpf.onrender.com',
  defaultFileNameFormat: 'Laudo-{TICKET}-{YYYY}{MM}{DD}_{HH}{mm}',
};

export const saveSettings = (settings: AppSettings): void => {
  try {
    const settingsJson = JSON.stringify(settings);
    localStorage.setItem(SETTINGS_KEY, settingsJson);

    pdfGenerator.setApiUrl(settings.sharepointApiUrl);

  } catch (error) {
    console.error("Erro ao salvar configurações:", error);
  }
};

export const getSettings = (): AppSettings => {
  try {
    const settingsJson = localStorage.getItem(SETTINGS_KEY);
    if (settingsJson) {
      return { ...defaultSettings, ...JSON.parse(settingsJson) };
    }
    return defaultSettings;
  } catch (error) {
    console.error("Erro ao carregar configurações:", error);
    return defaultSettings;
  }
};

// Inicializa automaticamente
const initialSettings = getSettings();
pdfGenerator.setApiUrl(initialSettings.sharepointApiUrl);