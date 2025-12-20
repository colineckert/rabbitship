import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/game": path.resolve(__dirname, "./src/game"),
      "@/rabbit": path.resolve(__dirname, "./src/server/rabbit"),
      "@/http": path.resolve(__dirname, "./src/server/http"),
      "@/ws": path.resolve(__dirname, "./src/server/ws"),
      "@/client": path.resolve(__dirname, "./src/client"),
    },
  },
});
