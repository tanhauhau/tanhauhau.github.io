const { existsSync } = require('fs');
const fs = require('fs').promises;
const path = require('path');
const glob = require('tiny-glob');
const svelte = require('svelte/compiler');
const render = require('./render-svelte');
const bundle = require('./bundle');
const { mkdirp } = require('./mkdirp');
const getDefinitions = require(`mdast-util-definitions`);
const buildPage = require('./buildPage');
const { encodeUrl } = require('./encodeUrl');
const { renderTemplate } = require('./renderTemplate');
const crypto = require('crypto');

const {
  CONTENT_FOLDER,
  USE_CONTENT,
  OUTPUT_FOLDER,
  LAYOUT_FOLDER,
  ROUTES_FOLDER,
  DEFAULT_LAYOUT,
  HOSTNAME,
} = require('./config');

const skipCache = !!process.env.SKIP_CACHE;

(async () => {
  console.time('all');

  await cleanup(OUTPUT_FOLDER);

  let [jsTemplate, template, layouts, pages] = await Promise.all([
    fs.readFile(path.join(__dirname, './template/page.js'), 'utf-8'),
    fs.readFile(path.join(__dirname, './template/index.html'), 'utf-8'),
    getLayouts(LAYOUT_FOLDER, DEFAULT_LAYOUT),
    glob('**/*.md', { cwd: CONTENT_FOLDER }),
  ]);

  await Promise.all([
    buildPages(pages, layouts, jsTemplate, template),
    buildRoutes(template),
    copyAll(path.join(__dirname, './template/assets'), OUTPUT_FOLDER),
  ]);
  console.timeEnd('all');
})();

async function buildPages(pages, layouts, jsTemplate, template) {
  console.time('buildPages');
  const cacheMap = getCacheMap();

  pages = await Promise.all(
    pages.map(async page => {
      const [type, filename] = splitTypePath(page);
      if (!USE_CONTENT.has(type)) return null;
      const slug = getSlug(type, filename);
      const twitterImagePath = getTwitterImagePath(page);
      const mdPath = path.join(CONTENT_FOLDER, page);

      const markdown = await fs.readFile(mdPath, 'utf8');
      const hash = crypto
        .createHmac('sha256', '')
        .update(markdown)
        .digest('hex');

      if (cacheMap[page] === hash) return null;

      cacheMap[page] = hash;
      return {
        type,
        filename,
        slug,
        twitterImagePath,
        mdPath,
        componentName: titleCase(slug),
      };
    })
  );
  pages = pages.filter(Boolean);

  pages = await buildPage(pages, { layouts, jsTemplate, template });

  const result = {
    notes: [],
    blog: [],
    talk: [],
  };

  pages.forEach(page => {
    result[page.metadata.type].push(page);
  });

  result.blog = result.blog
    .sort(reverseSortByDate)
    .filter(_ => !_.metadata.wip);
  result.talk = result.talk
    .sort(reverseSortByDate)
    .filter(_ => !_.metadata.wip);

  await Promise.all([
    fs.writeFile(
      path.join(OUTPUT_FOLDER, 'blogs.json'),
      JSON.stringify(result.blog),
      'utf-8'
    ),
    fs.writeFile(
      path.join(OUTPUT_FOLDER, 'notes.json'),
      JSON.stringify(result.notes),
      'utf-8'
    ),
    fs.writeFile(
      path.join(OUTPUT_FOLDER, 'talks.json'),
      JSON.stringify(result.talk),
      'utf-8'
    ),
    buildList({
      data: {
        data: result.blog,
      },
      template,
      templatePath: path.join(__dirname, './template/pages.js'),
      componentPath: path.join(__dirname, '../src/layout/Blogs.svelte'),
      outputPath: 'blogs',
    }),
    buildList({
      data: {
        data: result.notes,
      },
      template,
      templatePath: path.join(__dirname, './template/notes.js'),
      componentPath: path.join(__dirname, '../src/layout/Notes.svelte'),
      outputPath: 'notes',
    }),
    buildList({
      data: {
        data: result.talk,
      },
      template,
      templatePath: path.join(__dirname, './template/talks.js'),
      componentPath: path.join(__dirname, '../src/layout/Talks.svelte'),
      outputPath: 'talks',
    }),
  ]);

  await writeCacheMap(cacheMap);

  console.timeEnd('buildPages');
}

async function buildRoutes(template) {
  console.time('buildRoutes');
  let routes = await getRoutes(ROUTES_FOLDER);
  const templatePath = path.join(__dirname, './template/route.js');
  await Promise.all(
    Object.keys(routes).map(async key => {
      const componentPath = routes[key];
      await buildRoute({
        template,
        templatePath,
        componentPath,
        outputPath: key,
      });
    })
  );
  console.timeEnd('buildRoutes');
}

function splitTypePath(filename) {
  const index = filename.indexOf('/');
  return [filename.slice(0, index), filename.slice(index + 1)];
}

function getTwitterImagePath(filename) {
  const imgPath = path.join(
    path.dirname(path.join(CONTENT_FOLDER, filename)),
    'hero-twitter.jpg'
  );
  if (existsSync(imgPath)) {
    return imgPath;
  }
  return null;
}

function getSlug(type, filename) {
  switch (type) {
    case 'notes':
      return 'notes/' + filename.replace(/\.md$/, '');
    case 'blog':
    case 'talk':
      return filename.split('/')[0];
  }
}

function titleCase(str) {
  return (
    'Page' +
    str
      .split(/[- ]+/)
      .map(part => part[0].toUpperCase() + part.slice(1).toLowerCase())
      .join('')
  );
}

async function getLayouts(folder, def) {
  const files = await glob('**/*.svelte', { cwd: folder });
  const result = {};
  for (const file of files) {
    result[file.replace('.svelte', '')] = path.join(folder, file);
  }
  if (result[def]) {
    result['_'] = result[def];
  }
  return result;
}

async function getRoutes(folder) {
  const files = await glob('**/*.svelte', { cwd: folder });
  const result = {};
  for (const file of files) {
    result[file.replace('.svelte', '')] = path.join(folder, file);
  }
  return result;
}

async function cleanup(folder) {
  const files = await fs.readdir(folder);
  await Promise.all(
    files.map(async file => {
      const filepath = path.join(folder, file);
      if ((await fs.stat(filepath)).isDirectory()) {
        await cleanup(filepath);
      } else {
        await fs.unlink(filepath);
      }
    })
  );
  await fs.rmdir(folder);
}

async function buildList({
  data,
  template,
  templatePath,
  componentPath,
  outputPath,
}) {
  const outputFolder = path.join(OUTPUT_FOLDER, outputPath);

  await Promise.all([
    bundle({}, componentPath, {
      ssr: true,
      hostname: HOSTNAME + outputPath,
    })
      .then(bundle => bundle.generate({ format: 'commonjs', exports: 'named' }))
      .then(({ output }) => render(output[0].code))
      .then(renderer => renderer.render(data)),
    bundle(
      { ['@@data.json']: 'export default ' + JSON.stringify(data.data) },
      templatePath,
      {
        hostname: HOSTNAME + outputPath,
      }
    )
      .then(bundle =>
        bundle.write({ entryFileNames: '[name].js', dir: outputFolder })
      )
      .then(({ output }) => {
        const preloads = [];
        const styles = [];
        const scripts = [];

        for (const { fileName } of output) {
          if (fileName.endsWith('.js')) {
            scripts.push(
              `<script src="./${encodeUrl(fileName)}" async defer></script>`
            );
            preloads.push(
              `<link as="script" rel="preload" href="./${encodeUrl(fileName)}">`
            );
          } else if (fileName.endsWith('.css')) {
            styles.push(
              `<link href="./${encodeUrl(fileName)}" rel="stylesheet">`
            );
            preloads.push(
              `<link as="style" rel="preload" href="./${encodeUrl(fileName)}">`
            );
          }
        }
        return { preloads, styles, scripts };
      }),
  ]).then(([ssrOutput, { preloads, styles, scripts }]) =>
    fs.writeFile(
      path.join(outputFolder, 'index.html'),
      renderTemplate(template, {
        head: ssrOutput.head + preloads.join('') + styles.join(''),
        body: ssrOutput.html + scripts.join(''),
      }),
      'utf-8'
    )
  );
}

async function buildRoute({
  template,
  templatePath,
  componentPath,
  outputPath,
}) {
  await Promise.all([
    bundle({}, componentPath, {
      ssr: true,
      hostname: HOSTNAME + outputPath,
    })
      .then(bundle => bundle.generate({ format: 'commonjs', exports: 'named' }))
      .then(({ output }) => render(output[0].code))
      .then(renderer => renderer.render()),
    bundle({}, templatePath, {
      hostname: HOSTNAME + outputPath,
      resolveMap: {
        ['@@route.svelte']: componentPath,
      },
    })
      .then(bundle =>
        bundle.write({
          entryFileNames: `${outputPath}-[name].js`,
          dir: OUTPUT_FOLDER,
        })
      )
      .then(({ output }) => {
        const preloads = [];
        const styles = [];
        const scripts = [];

        for (const { fileName } of output) {
          if (fileName.endsWith('.js')) {
            scripts.push(
              `<script src="./${encodeUrl(fileName)}" async></script>`
            );
            preloads.push(
              `<link as="script" rel="preload" href="./${encodeUrl(fileName)}">`
            );
          } else if (fileName.endsWith('.css')) {
            styles.push(
              `<link href="./${encodeUrl(fileName)}" rel="stylesheet">`
            );
            preloads.push(
              `<link as="style" rel="preload" href="./${encodeUrl(fileName)}">`
            );
          }
        }
        return { preloads, styles, scripts };
      }),
  ]).then(([ssrOutput, { preloads, styles, scripts }]) =>
    fs.writeFile(
      path.join(OUTPUT_FOLDER, outputPath + '.html'),
      renderTemplate(template, {
        head: ssrOutput.head + preloads.join('') + styles.join(''),
        body: ssrOutput.html + scripts.join(''),
      }),
      'utf-8'
    )
  );
}

function reverseSortByDate(a, b) {
  return a.metadata.date === b.metadata.date
    ? 0
    : a.metadata.date < b.metadata.date
    ? 1
    : -1;
}

async function copyAll(from, to) {
  const files = await fs.readdir(from);
  await mkdirp(to);

  await Promise.all(
    files.map(async file => {
      if ((await fs.stat(path.join(from, file))).isDirectory()) {
        await mkdirp(path.join(to, file));
        return copyAll(path.join(from, file), path.join(to, file));
      }
      return fs.copyFile(path.join(from, file), path.join(to, file));
    })
  );
}

function getCacheMap() {
  if (skipCache) return {};
  try {
    return require(path.join(
      require.resolve('svelte'),
      '../../.cache/lihautan.json'
    ));
  } catch {
    return {};
  }
}

function writeCacheMap(cacheMap) {
  return fs.writeFile(
    path.join(require.resolve('svelte'), '../../.cache/lihautan.json'),
    JSON.stringify(cacheMap),
    'utf-8'
  );
}
