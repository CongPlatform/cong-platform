import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // React Compiler is an optimization, not a runtime requirement. Keeping the
  // dev transform on Vite's standard React/Oxc path avoids an extra
  // @rolldown/plugin-babel worker in development, which has shown instability
  // on some Windows + Vite 8 setups.
  plugins: [react()],

  server: {
    host: "127.0.0.1",

    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
      },
    },
  },
});
