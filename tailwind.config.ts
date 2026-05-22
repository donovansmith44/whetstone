import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Placeholder warm-neutral palette. Real palette comes from
        // the frontend-design polish pass (Plan 6).
        sand: { 50: "#fdfaf5", 100: "#f6efe4", 200: "#e9ddc6" },
        ink: { 900: "#1a1814", 700: "#3d362a" },
        accent: { 500: "#a04e3c" }, // terracotta
      },
    },
  },
};

export default config;
