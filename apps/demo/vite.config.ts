import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^flowdit-chatbot-library$/, replacement: path.resolve(__dirname, '../../packages/chatbot-library/index.ts') },
      { find: /^flowdit-chatbot-library\/(.*)/, replacement: path.resolve(__dirname, '../../packages/chatbot-library/$1') },
      { find: '@chatbot', replacement: path.resolve(__dirname, '../../packages/chatbot-library') },
    ],
  },
})
