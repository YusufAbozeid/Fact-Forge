import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true, // ده هيخلي Vite يقبل أي Host (زي لينكات الأنفاق)
  },
})