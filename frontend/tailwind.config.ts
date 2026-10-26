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
