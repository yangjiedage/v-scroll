import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

const cssToJsPlugin = () => {
  let config;
  return {
    name: 'css-to-js-plugin',
    configResolved(resolvedConfig) {
      config = resolvedConfig;
      
      const cssPath = path.resolve(config.root, 'src/v-scroll.css');
      const outDir = path.resolve(config.root, 'public/theme');
      
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }

      if (fs.existsSync(cssPath)) {
        const cssContent = fs.readFileSync(cssPath, 'utf-8');
        
        // Remove comments and whitespace to compress
        const compressedCss = cssContent
          .replace(/\/\*[\s\S]*?\*\//g, '') // remove comments
          .replace(/\s+/g, ' ') // collapse whitespace
          .replace(/\s*([{}:;,>+~])\s*/g, '$1') // remove space around separators
          .trim();
        
        const jsContent = `export default \`${compressedCss}\`;\n`;
        const jsPath = path.resolve(outDir, 'v-scroll.js');
        
        fs.writeFileSync(jsPath, jsContent, 'utf-8');
        console.log(`[css-to-js-plugin] Generated ${jsPath}`);
      }
    }
  };
};

export default defineConfig(({ command }) => ({
  resolve: {
    alias: command === 'serve' ? {
      '$/': '/public/theme/'
    } : {}
  },
  build: {
    rollupOptions: {
      external: (id) => id.startsWith('$/')
    }
  },
  plugins: [cssToJsPlugin()],
  server: {
    port: 3000
  }
}));
