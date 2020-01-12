const fs = require('fs').promises;
const path = require('path');
const glob = require('tiny-glob');
const remark = require('remark');
const html = require('remark-html');
const remarkTransform = require('./markdown');

const CONTENT_SOURCE = path.resolve(__dirname, '../content');
const CACHE_FOLDER = path.resolve(__dirname, './.cache');
const OUTPUT_FOLDER = path.resolve(__dirname, '../public');

async function start() {
  await rimRaf(OUTPUT_FOLDER);

  const template = await fs.readFile(path.resolve(__dirname, './index.html'), 'utf-8');

  await mkdirp(CACHE_FOLDER);
  const files = await glob('**/*.md', { cwd: CONTENT_SOURCE });
  const articles = await Promise.all(
    files.map(async file => {
      const fullPath = path.join(CONTENT_SOURCE, file);
      const [frontmatter, source] = parseFrontMatter(
        await fs.readFile(fullPath, 'utf-8')
      );
      let [category, slug] = file.split(path.sep);
      slug = cleanSlug(slug, category);
      const id = hash(slug + source);
      const html = template.replace('{{html}}', await md2Html(source));

      return {
        id,
        fullPath,
        filename: path.basename(file),
        category,
        slug,
        source,
        html,
        frontmatter,
      };
    })
  );
  // console.log(articles);

  await Promise.all(
    articles.map(async article => {
      const folder = path.join(OUTPUT_FOLDER, article.slug);
      await mkdirp(folder);
      await fs.writeFile(
        path.join(folder, 'index.html'),
        article.html,
        'utf-8'
      );
    })
  );
}

start();

async function mkdirp(dir) {
  const parent = path.dirname(dir);
  if (parent === dir) return;

  await mkdirp(parent);
  try {
    await fs.mkdir(dir);
  } catch {}
}

async function rimRaf(dir) {
  try {
    const files = await fs.readdir(dir);
    await Promise.all(files.map(file => rimRaf(path.join(dir, file))));
  } catch {
  } finally {
    try {
      await fs.unlink(dir);
    } catch {}
    try {
      await fs.rmdir(dir);
    } catch {}
  }
}

function parseFrontMatter(str) {
  const frontmatter = {};
  if (!str.startsWith('---')) {
    return [frontmatter, str];
  }

  const frontmatterTextMatch = str.match(/^---([^]+?)---/);
  if (!frontmatterTextMatch) {
    return [frontmatter, str];
  }
  str = str.slice(frontmatterTextMatch[0].length);

  for (const line of frontmatterTextMatch[1].split('\n')) {
    if (!line) {
      continue;
    }

    const colon = line.indexOf(':');
    const key = line.slice(0, colon);
    const value = cleanFrontMatter(line.slice(colon + 1));
    frontmatter[key] = value;
  }
  return [frontmatter, str];
}

const SINGLE_QUOTE = "'";
const DOUBLE_QUOTE = '"';
function cleanFrontMatter(str) {
  str = str.trim();
  if (
    (str.startsWith(SINGLE_QUOTE) && str.endsWith(SINGLE_QUOTE)) ||
    (str.startsWith(DOUBLE_QUOTE) && str.endsWith(DOUBLE_QUOTE))
  ) {
    str = str.slice(1, str.length - 1);
  }
  return str;
}

function cleanSlug(slug, category) {
  slug = slug.replace(/[\s-"]+/g, '-').replace(/\.md$/, '');
  // business logic
  if (category === 'notes') {
    slug = 'notes/' + slug;
  }
  return slug;
}

// https://github.com/darkskyapp/string-hash/blob/master/index.js
function hash(str) {
  let hash = 5381;
  let i = str.length;

  while (i--) hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
  return (hash >>> 0).toString(36);
}

function md2Html(markdown) {
  return new Promise((resolve, reject) => {
    remark()
      .use(remarkTransform)
      .use(html)
      .process(markdown, (err, file) => {
        if (err) reject(err);
        else resolve(file);
      });
  });
}
