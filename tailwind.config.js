/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          900: "#0b1f2a",
          800: "#102b3a",
          700: "#18394b",
          600: "#2b4b5c",
          500: "#476273",
          400: "#6d8492",
          300: "#9bafba",
          200: "#c9d6dd",
          100: "#e4ecf0",
          50: "#f2f6f8"
        },
        brand: {
          50: "#edfbf3",
          100: "#d5f5e3",
          200: "#aeeacb",
          300: "#79d8aa",
          400: "#41be83",
          500: "#1ea467",
          600: "#138555",
          700: "#106a46",
          800: "#0f5439",
          900: "#0d4530"
        },
        canvas: "#f4f7f6",
        line: "#e3eae8"
      },
      fontFamily: {
        sans: ["Inter Variable", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"]
      },
      boxShadow: {
        card: "0 1px 2px rgba(11,31,42,0.04), 0 8px 24px -12px rgba(11,31,42,0.12)",
        lift: "0 2px 6px rgba(11,31,42,0.06), 0 24px 48px -24px rgba(11,31,42,0.22)"
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
        "3xl": "1.375rem"
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" }
        }
      },
      animation: {
        "fade-up": "fade-up 0.35s ease-out both",
        "fade-in": "fade-in 0.25s ease-out both"
      }
    }
  },
  plugins: []
};
