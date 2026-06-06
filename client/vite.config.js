import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// Vite is our dev server + build tool. The react plugin lets it understand
// React/JSX files. `server.open` pops the browser open automatically.
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        open: false,
    },
});
