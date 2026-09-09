const path = require('path');
module.exports = {
  content: [path.join(__dirname, 'test.html')],
  corePlugins: { preflight: false },
  plugins: [require(path.join(__dirname, '..', '..', 'plugin.cjs'))],
};
