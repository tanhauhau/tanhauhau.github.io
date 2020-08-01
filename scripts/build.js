const { existsSync } = require('fs');
const fs = require('fs').promises;
const path = require('path');
const glob = require('tiny-glob');
const mdsvex = require('mdsvex');
const svelte = require('svelte/compiler');
const crypto = require('crypto');
const { init, parse } = require('es-module-lexer');
const render = require('./render-svelte');
const bundle = require('./bundle');
const { mkdirp } = require('./mkdirp');
const visit = require('unist-util-visit');
const getDefinitions = require(`mdast-util-definitions`);

const CONTENT_FOLDER = path.join(__dirname, '../content');
const USE_CONTENT = new Set(['blog', 'notes', 'talk']);
const OUTPUT_FOLDER = path.join(__dirname, '../docs');
const LAYOUT_FOLDER = path.join(__dirname, '../src/layout');
const ROUTES_FOLDER = path.join(__dirname, '../src/routes');
const DEFAULT_LAYOUT = 'blog';
const HOSTNAME = 'https://lihautan.com/';

(async () => {
  // cleanup
  try {
    await cleanup(OUTPUT_FOLDER);
  } catch {}

  // start

  let layouts = await getLayouts(LAYOUT_FOLDER, DEFAULT_LAYOUT);
  let pages = await glob('**/*.md', { cwd: CONTENT_FOLDER });
  pages = pages
    .map(page => {
      const [type, filename] = splitTypePath(page);
      if (!USE_CONTENT.has(type)) return null;
      const slug = getSlug(type, filename);
      const twitterImagePath = getTwitterImagePath(page);
      const mdPath = path.join(CONTENT_FOLDER, page);

      return {
        type,
        filename,
        slug,
        twitterImagePath,
        mdPath,
        componentName: titleCase(slug),
      };
    })
    .filter(Boolean);

  await init;

  pages = await Promise.all(
    pages.map(async meta => {
      const markdown = await fs.readFile(meta.mdPath, 'utf8');
      return {
        meta,
        source: {
          markdown,
          hash: crypto
            .createHmac('sha256', '')
            .update(markdown)
            .digest('hex'),
        },
      };
    })
  );

  const jsTemplate = await fs.readFile(
    path.join(__dirname, './template/page.js'),
    'utf-8'
  );

  pages = await Promise.all(
    pages.map(async ({ meta, source: { markdown } }) => {
      try {
        const svelteCode = await mdsvex.compile(markdown, {
          layout: layouts,
          smartypants: false,
          remarkPlugins: [
            function imageExternal() {
              const map = { ["'"]: '&#39;', ['"']: '&#34;' };
              return tree => {
                let i = 0;
                const images = [];
                visit(tree, ['image', 'imageReference'], node => {
                  if (/^https?\:\/\//.test(node.url)) return;
                  images[i] = node.url;
                  node.url = `{__build_img__${i}}`;
                  if (node.title) {
                    node.title = node.title.replace(
                      /['"]/g,
                      value => map[value]
                    );
                  }
                  if (node.alt) {
                    node.alt = node.alt.replace(/['"]/g, value => map[value]);
                  }

                  i++;
                });
                tree.children.push({
                  type: 'html',
                  value: [
                    '<script context="module">',
                    ...images.map(
                      (img, idx) => `import __build_img__${idx} from '${img}'`
                    ),
                    '</script>',
                  ].join('\n'),
                });
              };
            },
            function tableOfContents() {
              function toHtml(headings) {
                const html = [
                  '<section><ul class="sitemap" id="sitemap" role="navigation" aria-label="Table of Contents">',
                ];
                let previousDepth = 2;
                for (const heading of headings) {
                  let { depth } = heading;
                  while (depth > previousDepth) {
                    html.push('<ul>');
                    previousDepth++;
                  }
                  while (depth < previousDepth) {
                    html.push('</ul>');
                    previousDepth--;
                  }
                  html.push(
                    `<li><a href="#${heading.link}">${heading.title}</a></li>`
                  );
                  previousDepth = depth;
                }
                html.push('</ul></section>');
                return html.join('');
              }

              return tree => {
                const titles = [];
                const indexes = [];
                tree.children.forEach((node, index) => {
                  if (node.type !== 'heading') return;
                  indexes.push(index);
                  const link = node.children
                    .map(child =>
                      child.type !== 'html' && child.value
                        ? child.value.toLowerCase()
                        : ''
                    )
                    .filter(Boolean)
                    .join(' ')
                    .replace(/[^a-z]+/g, '-')
                    .replace(/(^-|-$)/g, '');
                  titles.push({
                    title: node.children
                      .map(child =>
                        child.type !== 'html' && child.value ? child.value : ''
                      )
                      .join(' '),
                    link,
                    depth: node.depth,
                  });
                  node.children.unshift({
                    type: 'html',
                    value: `<a href="#${link}" id="${link}">`,
                  });
                  node.children.push({
                    type: 'html',
                    value: '</a>',
                  });
                });
                let offset = 0;
                let isStart = true;

                for (const idx of indexes) {
                  if (!isStart) {
                    tree.children.splice(idx + offset++, 0, {
                      type: 'html',
                      value: '</section>',
                    });
                  }
                  tree.children.splice(idx + offset++, 0, {
                    type: 'html',
                    value: '<section>',
                  });
                  isStart = false;
                }

                if (titles.length) {
                  tree.children.splice(
                    tree.children[0].type === 'yaml' ? 1 : 0,
                    0,
                    {
                      type: 'html',
                      value: toHtml(titles),
                    }
                  );
                }
              };
            },
            function forNotes() {
              return (tree, vfile) => {
                vfile.data.fm = {
                  ...vfile.data.fm,
                  slug: meta.slug,
                  type: meta.type,
                };
                if (meta.type === 'notes') {
                  const [_, date, name] = meta.filename.match(
                    /(\d+-\d+-\d+)\s*-\s*(.+)\.md$/
                  );
                  Object.assign(vfile.data.fm, {
                    date,
                    name,
                    layout: 'note',
                  });
                }
              };
            },
          ],
        });

        const [ssrBundle, clientBundle] = await Promise.all([
          bundle(
            { [meta.mdPath + '.svelte']: svelteCode.code },
            meta.mdPath + '.svelte',
            { ssr: true, hostname: HOSTNAME + meta.slug }
          ).then(_ => _.generate({ format: 'commonjs', exports: 'named' })),
          bundle(
            {
              [meta.mdPath]: jsTemplate,
              [path.join(
                meta.mdPath,
                '../@@page-markup.svelte'
              )]: svelteCode.code,
            },
            meta.mdPath,
            { hostname: HOSTNAME + meta.slug }
          ),
        ]);

        const ssrOutput = await render(ssrBundle.output[0].code).then(_ =>
          _.render()
        );

        return {
          meta,
          output: {
            ssr: ssrOutput,
            client: {
              // css: clientCss,
              js: clientBundle,
            },
          },
        };
      } catch (error) {
        console.log('Failed to prepare ' + meta.mdPath);
        console.log(error);
        throw error;
      }
    })
  );

  const template = await fs.readFile(
    path.join(__dirname, './template/index.html'),
    'utf-8'
  );

  pages = await Promise.all(
    pages.map(async ({ meta, output }) => {
      try {
        const outputFolder = path.join(OUTPUT_FOLDER, meta.slug);
        await mkdirp(outputFolder);

        const clientOutput = await output.client.js.write({
          entryFileNames: '[hash].js',
          dir: outputFolder,
        });

        const preloads = [];
        const styles = [];
        const scripts = [];

        for (const { fileName } of clientOutput.output) {
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

        await fs.writeFile(
          path.join(outputFolder, 'index.html'),
          renderTemplate(template, {
            head: output.ssr.head + preloads.join('') + styles.join(''),
            body: output.ssr.html + scripts.join(''),
          }),
          'utf-8'
        );

        return {
          metadata: { ...output.ssr.metadata, type: meta.type },
          slug: meta.slug,
        };
      } catch (error) {
        console.log('Failed to compile ' + meta.mdPath);
        console.log(error);
        throw error;
      }
    })
  );

  const result = {
    notes: [],
    blog: [],
    talk: [],
  };

  pages.forEach(page => {
    result[page.metadata.type].push(page);
  });

  result.blog = result.blog
    .sort((a, b) =>
      a.metadata.date === b.metadata.date
        ? 0
        : a.metadata.date < b.metadata.date
        ? 1
        : -1
    )
    .filter(_ => !_.metadata.wip);
  result.talk = result.talk
    .sort((a, b) =>
      a.metadata.date === b.metadata.date
        ? 0
        : a.metadata.date < b.metadata.date
        ? 1
        : -1
    )
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
  ]);

  await Promise.all([
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
})();

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

function renderTemplate(template, map) {
  return template.replace(/{{([^}]+)}}/g, (_, key) => map[key] || '');
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

function encodeUrl(url) {
  const map = { ['%3A']: ':', ['%2F']: '/' };
  url = encodeURIComponent(url);
  return url.replace(/(%3A|%2F)/g, match => map[match]);
}
