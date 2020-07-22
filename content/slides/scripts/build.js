const mdsvex = require('mdsvex');
const svelte = require('svelte/compiler');
const path = require('path');
const fs = require('fs').promises;
const { watch, watchFile } = require('fs');
const slide = 'monorepo-webpack';

const watchMode = process.argv.includes('--watch');

const contentPath = path.join(__dirname, '..', slide, 'index.mdx');
const componentFolder = path.join(__dirname, 'components');
const userComponentFolder = path.join(__dirname, '..', slide, 'components');
const svelteFolder = path.join(__dirname, '_svelte');
const outputFolder = path.join(__dirname, '..', slide, 'preview');

const watchers = [];

(async () => {
  await buildSlides(contentPath, outputFolder + '/slides');
  await buildComponents(
    componentFolder,
    userComponentFolder,
    outputFolder + '/components'
  );
  await copySvelteLib(svelteFolder, outputFolder + '/svelte');
  console.log('🎉 Build!');
  console.log('😎 Watching...');
  watchSlides(contentPath, outputFolder + '/slides');
  watchComponents(
    componentFolder,
    userComponentFolder,
    outputFolder + '/components'
  );
})();

async function buildSlides(contentPath, outputFolder) {
  mkdirp(outputFolder);

  const content = await fs.readFile(contentPath, 'utf-8');
  const pages = content
    .split('+++\n')
    .map(page => page.trim())
    .filter(Boolean);

  const compiledPages = await Promise.all(pages.map(compilePage));
  for (let i = 0; i < compiledPages.length; i++) {
    await fs.writeFile(
      outputFolder + `/Slides-${i}.js`,
      compiledPages[i],
      'utf-8'
    );
  }
  const slidesIndex = [
    ...compiledPages.map((_, i) => `import Slides${i} from './Slides-${i}.js'`),
    '',
    'export default [',
    ...compiledPages.map((_, i) => `Slides${i}, `),
    '];',
  ].join('\n');
  await fs.writeFile(outputFolder + '/index.js', slidesIndex, 'utf-8');
}

async function watchSlides(contentPath, outputFolder) {
  watchers.push(
    watchFile(contentPath, () => {
      buildSlides(contentPath, outputFolder);
    })
  );
}

async function buildComponents(
  componentFolder,
  userComponentFolder,
  outputFolder
) {
  await mkdirp(outputFolder);

  const components = await fs.readdir(componentFolder);
  const userComponents = await fs.readdir(userComponentFolder);
  const compiledComponents = await Promise.all([
    ...components.map(component =>
      compileComponent(path.join(componentFolder, component))
    ),
    ...userComponents.map(component =>
      compileComponent(path.join(userComponentFolder, component))
    ),
  ]);

  await Promise.all(
    compiledComponents.map((component, index) => {
      const filename = (index >= components.length
        ? userComponents[index - components.length]
        : components[index]
      ).replace(/\.svelte$/, '.js');
      return fs.writeFile(
        path.join(outputFolder, filename),
        component,
        'utf-8'
      );
    })
  );
}

async function buildComponent(component, outputFolder) {
  const compiledComponent = await compileComponent(component);
  return fs.writeFile(
    path.join(
      outputFolder,
      path.basename(component).replace(/\.svelte$/, '.js')
    ),
    compiledComponent,
    'utf-8'
  );
}

async function watchComponents(
  componentFolder,
  userComponentFolder,
  outputFolder
) {
  watchers.push(
    watch(componentFolder, (event, filename) => {
      if (event === 'change') {
        buildComponent(path.join(componentFolder, filename), outputFolder);
      }
    })
  );
  watchers.push(
    watch(userComponentFolder, (event, filename) => {
      if (event === 'change') {
        buildComponent(path.join(userComponentFolder, filename), outputFolder);
      }
    })
  );
}

async function copySvelteLib(svelteFolder, outputFolder) {
  await mkdirp(outputFolder);

  const components = await fs.readdir(svelteFolder);
  await Promise.all(
    components.map(component => {
      return fs.copyFile(
        path.join(svelteFolder, component),
        path.join(outputFolder, component)
      );
    })
  );
}

async function compilePage(page) {
  const svelteCode = await mdsvex.compile(page);
  const svelteCompiledCode = svelte.compile(svelteCode.code, {
    format: 'esm',
  }).js.code;
  return replaceImports(svelteCompiledCode);
}

async function compileComponent(component) {
  const content = await fs.readFile(component, 'utf-8');
  if (component.endsWith('.js')) {
    return content;
  }
  const svelteCompiledCode = svelte.compile(content, {
    format: 'esm',
    name: path.basename(component).replace(/\.svelte$/, ''),
  }).js.code;
  return replaceImports(svelteCompiledCode);
}

function replaceImports(content) {
  return content
    .replace(
      /(?:svelte\/(animate|easing|internal|motion|store|transition))/g,
      '/svelte/$1.js'
    )
    .replace(/(import .+ from )"(?:(.+)\.svelte)"/g, '$1"$2.js"');
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

process.on('beforeExit', () => {
  watchers.forEach(watcher => watcher.close());
});
