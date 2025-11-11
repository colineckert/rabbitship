import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/game": path.resolve(__dirname, "./src/server/game"),
      "@/rabbit": path.resolve(__dirname, "./src/server/rabbit"),
      "@/http": path.resolve(__dirname, "./src/server/http"),
      "@/ws": path.resolve(__dirname, "./src/server/ws"),
      "@/client": path.resolve(__dirname, "./src/client"),
    },
  },
});
