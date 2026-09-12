import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

const projectDirectory = fileURLToPath(new URL('.', import.meta.url))

function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',

    resolveId(id) {
      if (!id.startsWith('figma:asset/')) {
        return null
      }

      const filename = id.replace('figma:asset/', '')

      return path.resolve(
        projectDirectory,
        'src/assets',
        filename
      )
    },
  }
}

export default defineConfig({
  /*
   * Caminho público da aplicação.
   * Todos os assets serão gerados usando /rhconnect/.
   */
  base: '/rhconnect/',

  plugins: [
    figmaAssetResolver(),
    react(),
    tailwindcss(),
  ],

  resolve: {
    alias: {
      '@': fileURLToPath(
        new URL('./src', import.meta.url)
      ),
    },
  },

  server: {
    /*
     * Necessário para permitir acesso ao Vite
     * através da rede interna do container.
     */
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,

    /*
     * Aceita somente o domínio público do projeto.
     */
    allowedHosts: [
      'labdowill.tech',
    ],

    /*
     * Configuração do WebSocket utilizado pelo HMR.
     */
    hmr: {
      protocol: 'wss',
      host: 'labdowill.tech',
      clientPort: 443,
    },

    /*
     * Mantém o comportamento adequado atrás do Nginx.
     */
    cors: false,
  },

  preview: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: [
      'labdowill.tech',
    ],
  },

  build: {
    outDir: 'dist',
    sourcemap: false,
    emptyOutDir: true,
  },

  /*
   * Arquivos permitidos para importação direta.
   */
  assetsInclude: [
    '**/*.svg',
    '**/*.csv',
  ],
})
