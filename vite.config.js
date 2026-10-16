import { resolve } from 'node:path';
export default {
  build: { rollupOptions: { input: { main: resolve('index.html'), brand: resolve('brand.html'), strategy: resolve('strategy.html'), briefs: resolve('image-briefs.html') } } },
};
