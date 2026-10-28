import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        krem: { DEFAULT: "#F5EFE3", gelap: "#EDE4D2" },
        garis: "#E4DAC8",
        marun: { DEFAULT: "#722F37", gelap: "#5E2229" },
        tinta: { DEFAULT: "#2B2320", lembut: "#6E6159" },
        emas: "#B08D57",
        dash: {
          bg: "var(--dash-bg, #F4ECDF)",
          "bg-alt": "var(--dash-bg-alt, #EBDFCB)",
          surface: "var(--dash-surface, #FFFFFF)",
          primary: { DEFAULT: "var(--dash-primary, #7B1E2B)", dark: "var(--dash-primary-dark, #5E1520)" },
          "on-primary": "var(--dash-on-primary, #FFFFFF)",
          text: { DEFAULT: "var(--dash-text, #2B1D16)", muted: "var(--dash-text-muted, #6E5E52)" },
          border: "var(--dash-border, #DCCDB6)",
          star: "var(--dash-star, #C9962B)",
          overlay: "var(--dash-overlay, rgb(43 29 22 / 0.45))",
        },
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', "Georgia", "serif"],
        sans: ['"Inter Variable"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
