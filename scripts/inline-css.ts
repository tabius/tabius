import { readdirSync, readFileSync, writeFileSync } from 'fs';

const fileList = readdirSync('./dist/browser');
const cssFileName = fileList.find(name => name.startsWith('styles.') && name.endsWith('.css'));
const htmlFilePath = './dist/browser/index.html';
const htmlFile = readFileSync(htmlFilePath).toString();
const cssFile = readFileSync(`./dist/browser/${cssFileName}`).toString();
const htmlFileWithCss = htmlFile.replace(`<link rel="stylesheet" href="${cssFileName}">`, `<style>${cssFile}</style>`);

writeFileSync(htmlFilePath, htmlFileWithCss);
