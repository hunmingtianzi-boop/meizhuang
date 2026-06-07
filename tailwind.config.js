/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        serifTitle: ["Georgia", "Noto Serif SC", "serif"],
      },
      boxShadow: {
        soft: "0 18px 50px rgba(58, 43, 27, 0.08)",
        lift: "0 16px 30px rgba(184, 148, 90, 0.25)",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        fadeUp: "fadeUp 0.4s ease-out both",
        shimmer: "shimmer 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
