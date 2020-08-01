const crypto = require('crypto');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const { mkdirp } = require('./mkdirp');

module.exports = async function(ssrCode) {
  const hash = crypto
    .createHmac('sha256', 'secret')
    .update(ssrCode)
    .digest('hex');

  const target = path.join(
    require.resolve('svelte'),
    '../../.cache/ssr',
    hash + '.js'
  );
  await mkdirp(path.dirname(target));
  await fs.writeFile(target, ssrCode, 'utf-8');

  return {
    render(props) {
      const {
        default: { render },
        metadata,
      } = require(target);

      const { html, css, head } = render(props);

      return {
        html,
        css,
        head,
        metadata,
      };
    },
  };
};
