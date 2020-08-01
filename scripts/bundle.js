const rollup = require('rollup');
const {
  nodeResolve: rollupPluginNodeResolve,
} = require('@rollup/plugin-node-resolve');
const rollupPluginPostCss = require('rollup-plugin-postcss');
const rollupPluginSvelte = require('rollup-plugin-svelte');
const rollupPluginCommonJs = require('@rollup/plugin-commonjs');
const rollupPluginUrl = require('@rollup/plugin-url');
const rollupPluginReplace = require('@rollup/plugin-replace');
const { init, parse } = require('es-module-lexer');
const path = require('path');
const fs = require('fs');

module.exports = async function(codeMap, location, { ssr, hostname, resolveMap = {} } = {}) {
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
        load(id) {
          if (id.startsWith('file://')) {
            const referenceId = this.emitFile({
              type: 'asset',
              name: path.basename(id),
              source: fs.readFileSync(id.replace('file://', '')),
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
      rollupPluginUrl({
        emitFiles: !ssr,
        include: ['**/*.svg', '**/*.png', '**/*.jpg', '**/*.gif'],
      }),
      rollupPluginPostCss({
        extract: true,
        exclude: [/^file:\/\//],
      }),

      rollupPluginReplace({
        'process.env.BROWSER': !ssr,
        __$$HOSTNAME$$__: encodeURIComponent(hostname),
      }),
    ],
  });
  return bundle;
};
