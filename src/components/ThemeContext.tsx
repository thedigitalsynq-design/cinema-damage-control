import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type DesignTheme = 'obsidian' | 'vision-pro';

interface ThemeContextType {
  theme: DesignTheme;
  setTheme: (t: DesignTheme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'obsidian',
  setTheme: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme] = useState<DesignTheme>('obsidian');

  const setTheme = (_t: DesignTheme) => {
    // Dark mode only is enforced
  };

  const toggleTheme = () => {
    // Dark mode only is enforced
  };

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('dark', 'theme-obsidian');
    root.classList.remove('theme-vision-pro');
    try {
      localStorage.setItem('cinema_theme', 'obsidian');
    } catch {
      // ignore
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// eslint-disable-next-line react/only-export-components
export function useTheme() {
  return useContext(ThemeContext);
}
