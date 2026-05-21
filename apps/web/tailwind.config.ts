import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: "#08111f",
        mint: "#68f1c4",
        gold: "#d8b66b",
        graphite: "#111827"
      },
      boxShadow: {
        glow: "0 24px 80px rgba(104, 241, 196, 0.18)"
      }
    }
  },
  plugins: []
};

export default config;

