import { readdirSync, readFileSync, writeFileSync } from 'fs';

const fileList = readdirSync('./dist/browser');
const cssFileName = fileList.find(name => /^styles[.-].*\.css$/.test(name));
const htmlFileName = fileList.find(name => name === 'index.html' || name === 'index.csr.html');
if (!cssFileName || !htmlFileName) {
  throw new Error(`Required build files not found: CSS=${cssFileName}, HTML=${htmlFileName}`);
}
const htmlFilePath = `./dist/browser/${htmlFileName}`;
const htmlFile = readFileSync(htmlFilePath).toString();
const cssFile = readFileSync(`./dist/browser/${cssFileName}`).toString();
const htmlFileWithCss = htmlFile.replace(`<link rel="stylesheet" href="${cssFileName}">`, `<style>${cssFile}</style>`);

writeFileSync(htmlFilePath, htmlFileWithCss);
