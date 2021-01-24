// setup prism
const visit = require('unist-util-visit');

global.Prism = require('prismjs');
require('prism-svelte');
require('prismjs/components/prism-diff');
require('prismjs/plugins/diff-highlight/prism-diff-highlight');
Prism.languages['diff-js'] = Prism.languages['diff'];
Prism.languages['diff-svelte'] = Prism.languages['diff'];

const mdsvex = require('mdsvex');
const svelte = require('svelte/compiler');
const path = require('path');
const fs = require('fs').promises;
const { watch, watchFile } = require('fs');
const rollup = require('rollup');
const rollupPluginSvelte = require('rollup-plugin-svelte');
const rollupPluginCommonJs = require('@rollup/plugin-commonjs');
const { nodeResolve: rollupPluginNodeResolve } = require('@rollup/plugin-node-resolve');
const rollupPluginPostCss = require('rollup-plugin-postcss');
const slide = 'making-an-entrance-with-svelte-transitions';

const watchMode = process.argv.includes('--watch');

const contentPath = path.join(__dirname, '..', slide, 'index.mdx');
const componentFolder = path.join(__dirname, 'components');
const userComponentFolder = path.join(__dirname, '..', slide, 'components');
const svelteFolder = path.join(__dirname, '_svelte');
const outputFolder = path.join(__dirname, '..', slide, 'preview');

(async () => {
  await copyWorkers(outputFolder + '/worker');

  await buildSlides(contentPath, outputFolder);
})();

async function copyWorkers(outputFolder) {
  await mkdirp(outputFolder);
  const workerFolder = path.join(__dirname, '../node_modules/@sveltejs/svelte-repl/workers');
  const files = await fs.readdir(workerFolder);
  for (const file of files) {
    await fs.copyFile(path.join(workerFolder, file), path.join(outputFolder, file));
  }
}

async function buildSlides(contentPath, outputFolder) {
  mkdirp(outputFolder);

  let pages;

  const watcher = await rollup.watch({
    input: '@@entry',
    plugins: [
      {
        async load(id) {
          if (id === '@@entry') {
            this.addWatchFile(contentPath);
            const content = await fs.readFile(contentPath, 'utf-8');
            pages = content
              .split('+++\n')
              .map(page => page.trim())
              .filter(Boolean);
            // prettier-ignore
            return [
              ...pages.map((_, index) => `import Slides${index} from '@@slides${index}.svelte';`), 
              '', 
              'const slides = [', 
                ...pages.map((_, index) => `Slides${index}, `), 
              '];',
              `import Slide from '${path.join(__dirname, './components/Slides.svelte')}';`,
              `new Slide({ target: document.body, props: { slides } });`,
            ].join('\n');
          } else if (id.startsWith('@@slides')) {
            const match = id.match(/@@slides(\d+)/);
            const pageIndex = Number(match[1]);
            return await cachedMdsvex(pageIndex, pages[pageIndex]);
          }
          return null;
        },
        resolveId(source, importer) {
          if (source.startsWith('@@')) {
            return { id: source };
          }
          if (importer.startsWith('@@')) {
            return this.resolve(source, contentPath);
          }
          return null;
        },
      },
      // raw-loader
      {
        async resolveId(source, importer) {
          if (source.startsWith('raw://')) {
            const resolved = await this.resolve(source.slice(6), importer);
            if (resolved) {
              return {
                ...resolved,
                id: 'raw://' + resolved.id + '.js',
              };
            }
          }
        },
        async load(id) {
          if (id.startsWith('raw://')) {
            const actualPath = id.slice(6, -3);
            const content = await fs.readFile(actualPath, 'utf-8');
            this.addWatchFile(actualPath);
            return `export default ${JSON.stringify(content)}`;
          }
        },
      },
      // file-loader
      {
        async resolveId(source, importer) {
          if (source.startsWith('file://')) {
            let isOptional = false;
            source = source.replace('file://', '');
            const resolved = await this.resolve(source, importer);
            if (resolved) {
              return {
                ...resolved,
                id: 'file://' + resolved.id,
              };
            }
          }
          return null;
        },
        async load(id) {
          if (id.startsWith('file://')) {
            const referenceId = this.emitFile({
              type: 'asset',
              name: path.basename(id),
              source: await fs.readFile(id.replace('file://', '')),
            });
            return `export default import.meta.ROLLUP_FILE_URL_${referenceId};`;
          }
        },
        resolveFileUrl({ fileName, moduleId }) {
          if (moduleId.startsWith('file://')) {
            return JSON.stringify('/' + fileName);
          }
        },
      },
      rollupPluginSvelte({
        generate: 'dom',
      }),
      rollupPluginNodeResolve({
        browser: true,
        dedupe: importee => importee === 'svelte' || importee.startsWith('svelte/'),
      }),
      rollupPluginCommonJs(),
      rollupPluginPostCss({
        extract: true,
      }),
    ],
    output: {
      entryFileNames: 'output.js',
      dir: outputFolder,
    },
    preserveEntrySignatures: false,
    watch: {
      exclude: 'node_modules/**',
      clearScreen: true,
    },
  });

  watcher.on('event', event => {
    console.log(event.code);
    if (event.error) {
      console.log(event.error);
    }
    // event.code can be one of:
    //   START        — the watcher is (re)starting
    //   BUNDLE_START — building an individual bundle
    //   BUNDLE_END   — finished building a bundle
    //   END          — finished building all bundles
    //   ERROR        — encountered an error while bundling
  });

  process.on('beforeExit', () => {
    watcher.close();
  });
}

async function mkdirp(folder) {
  if (folder === '/') return;
  mkdirp(path.dirname(folder));
  try {
    await fs.mkdir(folder);
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

const cache = {};
async function cachedMdsvex(id, source) {
  if (cache[id]) {
    const [prevSource, prevResult] = cache[id];
    if (source === prevSource) {
      return prevResult;
    }
  }
  const result = (
    await mdsvex.compile(source, {
      remarkPlugins: [
        function removeNewLine() {
          return (tree, vfile) => {
            visit(tree, ['html'], node => {
              if (node.lang) {
                node.value = node.value.replace(/(@html `)\s+(.)/gm, '$1$2');
              }
            });
          };
        },
      ],
    })
  ).code;
  cache[id] = [source, result];
  return result;
}
