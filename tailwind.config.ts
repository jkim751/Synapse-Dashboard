import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      keyframes: {
        "modal-in": {
          from: { opacity: "0", transform: "scale(0.95) translateY(8px)" },
          to: { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "dropdown-in": {
          from: { opacity: "0", transform: "translateY(-6px) scale(0.97)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "slide-down": {
          from: { opacity: "0", transform: "translateY(-4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "modal-in": "modal-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in": "fade-in 0.15s ease-out",
        "dropdown-in": "dropdown-in 0.15s ease-out",
        "slide-down": "slide-down 0.15s ease-out",
      },
      colors: {
        lamaSky: "#FC7118 ",
        lamaSkyLight: "#FC71181A",
        lamaPurple: "#FC7118",
        lamaPurpleLight: "#FC711833",
        lamaYellow: "#FC7118",
        lamaYellowLight: "#FC7118",
      },
    },
  },
  plugins: [],
};
export default config;
