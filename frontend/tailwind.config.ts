import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

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
        // Variabel shadcn. Fallback hex = token DESIGN.md agar komponen ber-portal
        // (Dialog/Select/Toast di luar [data-area="dashboard"]) tetap terbaca.
        border: "var(--border, #DCCDB6)",
        input: "var(--input, #DCCDB6)",
        ring: "var(--ring, #7B1E2B)",
        background: "var(--background, #FFFFFF)",
        foreground: "var(--foreground, #2B1D16)",
        primary: { DEFAULT: "var(--primary, #7B1E2B)", foreground: "var(--primary-foreground, #FFFFFF)" },
        secondary: { DEFAULT: "var(--secondary, #EBDFCB)", foreground: "var(--secondary-foreground, #2B1D16)" },
        destructive: { DEFAULT: "var(--destructive, #7B1E2B)", foreground: "var(--destructive-foreground, #FFFFFF)" },
        muted: { DEFAULT: "var(--muted, #EBDFCB)", foreground: "var(--muted-foreground, #6E5E52)" },
        accent: { DEFAULT: "var(--accent, #EBDFCB)", foreground: "var(--accent-foreground, #2B1D16)" },
        popover: { DEFAULT: "var(--popover, #FFFFFF)", foreground: "var(--popover-foreground, #2B1D16)" },
        card: { DEFAULT: "var(--card, #FFFFFF)", foreground: "var(--card-foreground, #2B1D16)" },
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', "Georgia", "serif"],
        sans: ['"Inter Variable"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [animate],
};
export default config;
