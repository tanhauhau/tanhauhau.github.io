const path = require('path');

exports.CONTENT_FOLDER = path.join(__dirname, '../content');
exports.USE_CONTENT = new Set(['blog', 'notes', 'talk']);
exports.OUTPUT_FOLDER = path.join(__dirname, '../docs');
exports.LAYOUT_FOLDER = path.join(__dirname, '../src/layout');
exports.ROUTES_FOLDER = path.join(__dirname, '../src/routes');
exports.DEFAULT_LAYOUT = 'blog';
exports.HOSTNAME = 'https://lihautan.com/';
