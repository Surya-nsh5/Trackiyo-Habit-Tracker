import { create } from 'zustand';
import Cookies from 'js-cookie';

interface ThemeState {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  initializeTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDarkMode: Cookies.get('theme') !== 'light', // Default to dark unless explicitly light

  toggleDarkMode: () => {
    const { isDarkMode } = get();
    const newMode = !isDarkMode;
    
    if (newMode) {
      document.documentElement.classList.add('dark');
      Cookies.set('theme', 'dark', { expires: 365, path: '/' });
    } else {
      document.documentElement.classList.remove('dark');
      Cookies.set('theme', 'light', { expires: 365, path: '/' });
    }
    
    set({ isDarkMode: newMode });
  },

  initializeTheme: () => {
    const { isDarkMode } = get();
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}));
