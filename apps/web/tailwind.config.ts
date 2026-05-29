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
        graphite: "#111827",
        navy: {
          50: "#0a1929",
          100: "#0d1f35",
          200: "#102642",
          300: "#152d4f",
          400: "#1a355c",
          500: "#1f3d69",
        },
        emerald: {
          glow: "#34d399",
        },
      },
      boxShadow: {
        glow: "0 24px 80px rgba(104, 241, 196, 0.18)",
        "glow-sm": "0 8px 32px rgba(104, 241, 196, 0.12)",
        "glow-gold": "0 8px 32px rgba(216, 182, 107, 0.15)",
        "card-hover": "0 8px 40px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(104, 241, 196, 0.15)",
        "inner-glow": "inset 0 1px 1px rgba(255, 255, 255, 0.08)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "premium-gradient": "linear-gradient(135deg, rgba(104, 241, 196, 0.1), rgba(216, 182, 107, 0.05))",
        "glass-gradient": "linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02))",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out forwards",
        "slide-up": "slideUp 0.5s ease-out forwards",
        "slide-down": "slideDown 0.3s ease-out forwards",
        "scale-in": "scaleIn 0.3s ease-out forwards",
        "glow-pulse": "glowPulse 3s ease-in-out infinite",
        "counter-up": "counterUp 1s ease-out forwards",
        "float": "float 6s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
        "progress-fill": "progressFill 1.5s ease-out forwards",
        "badge-pop": "badgePop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(104, 241, 196, 0.1)" },
          "50%": { boxShadow: "0 0 40px rgba(104, 241, 196, 0.25)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        progressFill: {
          "0%": { width: "0%" },
          "100%": { width: "var(--progress-width)" },
        },
        badgePop: {
          "0%": { opacity: "0", transform: "scale(0.5)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};

export default config;