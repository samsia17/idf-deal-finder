/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f7f4",
          100: "#d9ebe1",
          500: "#1f7a52",
          600: "#186641",
          700: "#135233",
        },
      },
    },
  },
  plugins: [],
};
