"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";

export type Theme = "ocean";

const ThemeContext = createContext<Theme>("ocean");

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "ocean");
  }, []);

  return (
    <ThemeContext.Provider value="ocean">{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
