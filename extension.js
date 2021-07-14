'use strict';

const footnoteHere = require('@peaceroad/markdown-it-footnote-here');

const workspace = require('vscode').workspace;
const fs = require('fs');

const cssFile = 'footnote-here.css';
const cssFilePath = __dirname + '/style/' + cssFile;
const cachedCssFilePath = __dirname + '/style/_' + cssFile;

function cacheCssFile () {
  if (!fs.existsSync(cachedCssFilePath)) {
    fs.writeFileSync(cachedCssFilePath, fs.readFileSync(cssFilePath));
  }
  return;
}

async function activate() {
  workspace.onDidChangeConfiguration(event => {
    if (event.affectsConfiguration('p7dMarkdownItFootnoteHere')) {
      if (workspace.getConfiguration('p7dMarkdownItFootnoteHere').get('disableStyle')) {
        cacheCssFile();
        fs.writeFileSync(cssFilePath, '');
      } else {
        cacheCssFile();
        fs.writeFileSync(cssFilePath, fs.readFileSync(cachedCssFilePath));
      }
    }
  });

  return {
    extendMarkdownIt(md) {
      return md.use(footnoteHere);
    }
  };
}

exports.activate = activate;