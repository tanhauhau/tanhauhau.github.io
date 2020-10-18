const rollup = require('rollup');
const {
  nodeResolve: rollupPluginNodeResolve,
} = require('@rollup/plugin-node-resolve');
const rollupPluginPostCss = require('rollup-plugin-postcss');
const rollupPluginSvelte = require('rollup-plugin-svelte');
const rollupPluginCommonJs = require('@rollup/plugin-commonjs');
const rollupPluginReplace = require('@rollup/plugin-replace');
// const { terser } = require('rollup-plugin-terser');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs').promises;
const { mkdirp } = require('./mkdirp');

const imagemin = require('imagemin');
const imageminWebp = require('imagemin-webp');
const imageminJpegtran = require('imagemin-jpegtran');
const imageminPngquant = require('imagemin-pngquant');
const imageminGifsicle = require('imagemin-gifsicle');

module.exports = async function(
  codeMap,
  location,
  { ssr, hostname, resolveMap = {} } = {}
) {
  const bundle = await rollup.rollup({
    input: location,
    plugins: [
      {
        load(id) {
          if (id in codeMap) {
            return codeMap[id];
          }
          return null;
        },
        resolveId(source, importer) {
          if (source in resolveMap) {
            return { id: resolveMap[source] };
          } else if (source in codeMap) {
            return { id: source };
          } else if (source.startsWith('@@')) {
            return { id: path.join(importer, '../' + source) };
          }
          return null;
        },
      },

      // file-loader
      {
        async resolveId(source, importer) {
          if (source.startsWith('file://')) {
            let isOptional = false;
            source = source.replace('file://', '');
            if (source.startsWith('@')) {
              source = source.replace(/^@/, location);
              isOptional = true;
            }
            const resolved = await this.resolve(source, importer);
            if (resolved) {
              return {
                ...resolved,
                id: 'file://' + resolved.id,
              };
            } else if (isOptional) {
              return {
                id: 'optional://' + source,
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
          } else if (id.startsWith('optional://')) {
            return `export default null`;
          }
        },
        resolveFileUrl({ fileName, moduleId }) {
          if (moduleId.startsWith('file://')) {
            return JSON.stringify(hostname + '/' + fileName);
          }
        },
      },

      rollupPluginNodeResolve({
        browser: true,
        dedupe: importee =>
          importee === 'svelte' || importee.startsWith('svelte/'),
      }),
      rollupPluginCommonJs(),
      rollupPluginSvelte({
        hydratable: true,
        emitCss: true,
        generate: ssr ? 'ssr' : 'dom',
      }),
      (function() {
        const images = {};
        const webps = {};
        return {
          async resolveId(source, importer) {
            if (source.startsWith('webp://')) {
              source = source.replace('webp://', '');
              const resolved = await this.resolve(source, importer);
              if (resolved) {
                return {
                  ...resolved,
                  id: 'webp://' + resolved.id,
                };
              }
            }
            return null;
          },
          async load(id) {
            if (!id.startsWith('webp://') && !/\.(svg|png|jpg|gif)$/.test(id))
              return;
            const isWebp = id.startsWith('webp://');
            id = id.replace('webp://', '');
            let extname = isWebp ? '.webp' : path.extname(id);
            const hash = crypto
              .createHash('sha1')
              .update(await fs.readFile(id))
              .digest('hex')
              .substr(0, 16);
            let data = `${hash}${extname}`;
            if (isWebp) {
              webps[id] = data;
            } else {
              images[id] = data;
            }
            return `export default "${data}"`;
          },
          async generateBundle(outputOptions) {
            if (ssr) return;

            const base = outputOptions.dir || path.dirname(outputOptions.file);
            await mkdirp(base);

            const keys = Object.keys(images);

            const optimisedImages = await imagemin(keys, {
              plugins: [
                imageminJpegtran(),
                imageminPngquant({
                  quality: [0.6, 0.8],
                }),
                imageminGifsicle(),
              ],
            });

            await Promise.all(
              keys.map(async (name, idx) => {
                const output = images[name];
                const outputDirectory = path.join(base, path.dirname(output));
                await mkdirp(outputDirectory);
                return fs.writeFile(
                  path.join(base, output),
                  optimisedImages[idx].data
                );
              })
            );

            const webpKeys = Object.keys(webps);
            const webpImages = await imagemin(webpKeys, {
              plugins: [imageminWebp({ quality: 50 })],
            });
            await Promise.all(
              webpKeys.map(async (name, idx) => {
                const output = webps[name];
                const outputDirectory = path.join(base, path.dirname(output));
                await mkdirp(outputDirectory);
                return fs.writeFile(
                  path.join(base, output),
                  webpImages[idx].data
                );
              })
            );
          },
        };
      })(),
      rollupPluginPostCss({
        extract: true,
        exclude: [/^file:\/\//],
      }),

      rollupPluginReplace({
        'process.env.BROWSER': !ssr,
        __$$HOSTNAME$$__: encodeURIComponent(hostname),
      }),

      // terser(),
    ],
  });
  return bundle;
};
