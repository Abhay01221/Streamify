import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface EditorSettings {
  language: string;
  fontSize: number;
  tabSize: number;
  theme: 'vs-dark' | 'light';
  vimMode: boolean;
  autoSave: boolean;
  minimap: boolean;
  wordWrap: boolean;
}

interface EditorState {
  settings: EditorSettings;
  code: Record<string, Record<string, string>>; // problemSlug -> language -> code
  updateSettings: (settings: Partial<EditorSettings>) => void;
  setCode: (problemSlug: string, language: string, code: string) => void;
  getCode: (problemSlug: string, language: string) => string | null;
  resetCode: (problemSlug: string, language: string) => void;
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      settings: {
        language: 'python',
        fontSize: 14,
        tabSize: 4,
        theme: 'vs-dark',
        vimMode: false,
        autoSave: true,
        minimap: false,
        wordWrap: false,
      },
      code: {},

      updateSettings: (settings) =>
        set((state) => ({
          settings: { ...state.settings, ...settings },
        })),

      setCode: (problemSlug, language, code) =>
        set((state) => ({
          code: {
            ...state.code,
            [problemSlug]: {
              ...(state.code[problemSlug] || {}),
              [language]: code,
            },
          },
        })),

      getCode: (problemSlug, language) => {
        const state = get();
        return state.code[problemSlug]?.[language] ?? null;
      },

      resetCode: (problemSlug, language) =>
        set((state) => {
          const newCode = { ...state.code };
          if (newCode[problemSlug]) {
            delete newCode[problemSlug][language];
          }
          return { code: newCode };
        }),
    }),
    { name: 'coders-editor' }
  )
);
