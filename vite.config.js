import { defineConfig } from 'vite';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const cssToJsPlugin = () => {
  let config;
  return {
    name: 'css-to-js-plugin',
    configResolved(resolved_config) {
      config = resolved_config;
      
      const css_path = resolve(config.root, 'src/v-scroll.css'),
            out_dir = resolve(config.root, 'public/theme');
      
      if (!existsSync(out_dir)) {
        mkdirSync(out_dir, { recursive: true });
      }

      if (existsSync(css_path)) {
        const css_content = readFileSync(css_path, 'utf-8'),
              compressed_css = css_content
                .replace(/\/\*[\s\S]*?\*\//g, '')
                .replace(/\s+/g, ' ')
                .replace(/\s*([{}:;,>+~])\s*/g, '$1')
                .trim(),
              js_content = `export default \`${compressed_css}\`;\n`,
              js_path = resolve(out_dir, 'v-scroll.js');
        
        writeFileSync(js_path, js_content, 'utf-8');
        console.log(`[css-to-js-plugin] Generated ${js_path}`);
      }
    }
  };
};

export default defineConfig(({ command }) => ({
  base: './',
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