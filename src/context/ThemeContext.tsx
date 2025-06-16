import React, { createContext, useContext } from "react";
import { SynapseDarkTheme } from "../theme/SynapseTheme";
import type { ExtendedTheme } from "../theme/SynapseTheme";

type ThemeContextType = {
  theme: ExtendedTheme;
  isDarkMode: boolean;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const theme = SynapseDarkTheme;
  const isDarkMode = true;

  return (
    <ThemeContext.Provider value={{ theme, isDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
