import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        obsidian: "#070a12",
        panel: "#0f1624",
        neon: "#65e4ff",
        violet: "#a277ff"
      },
      boxShadow: {
        glow: "0 0 34px rgba(101, 228, 255, 0.22)"
      }
    }
  },
  plugins: []
};

export default config;
