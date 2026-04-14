import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--neutral-50)",
        foreground: "var(--neutral-700)",
        'green-primary': 'var(--green-primary)',
        'green-light': 'var(--green-light)',
        'green-dark': 'var(--green-dark)',
        'red-soft': 'var(--red-soft)',
        'red-text': 'var(--red-text)',
        'neutral-50': 'var(--neutral-50)',
        'neutral-100': 'var(--neutral-100)',
        'neutral-700': 'var(--neutral-700)',
        'neutral-400': 'var(--neutral-400)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.3s ease-out forwards',
      },
    },
  },
  plugins: [],
};
export default config;
