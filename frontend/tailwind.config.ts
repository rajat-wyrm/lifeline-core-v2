import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        "card-foreground": "var(--card-foreground)",
        primary: {
          DEFAULT: "#0284c7", // Sky 600 - trust & precision
          foreground: "#ffffff",
          dark: "#0369a1"
        },
        emergency: {
          DEFAULT: "#dc2626", // Red 600
          light: "#fee2e2",
          dark: "#991b1b"
        },
        warning: {
          DEFAULT: "#d97706", // Amber 600
          light: "#fef3c7"
        },
        success: {
          DEFAULT: "#16a34a", // Green 600
          light: "#dcfce7"
        },
        navy: {
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617"
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"]
      }
    },
  },
  plugins: [],
};
export default config;
