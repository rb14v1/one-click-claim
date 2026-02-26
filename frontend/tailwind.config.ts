// tailwind.config.ts
import type { Config } from "tailwindcss";
import { BRAND_COLORS } from "./src/constants/colors";

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: BRAND_COLORS,
      },
    },
  },
  plugins: [],
};

export default config;