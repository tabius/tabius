const fs = require('fs');
fs.writeFile('app/environments/build.ts', prepareBuildInfo(), error => error && console.error(error));

function prepareBuildInfo() {
  return 'export const buildInfo = {\n' +
      '  buildDate: ' + Date.now() + ',\n' +
      '};\n';
}
