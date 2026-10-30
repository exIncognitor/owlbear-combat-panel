import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: ".standalone-dist",
    rollupOptions: {
      input: "panel.html",
      output: { inlineDynamicImports: true },
    },
  },
});
