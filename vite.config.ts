import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Dedicated yBook port — savefeed-web on 5173 was stealing the preview
    // tab and stranding mid-audit verification with a chrome-error URL.
    port: 5179,
    strictPort: true,
  },
})
