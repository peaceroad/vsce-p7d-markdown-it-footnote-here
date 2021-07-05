'use strict';

const footnoteHere = require('@peaceroad/markdown-it-footnote-here');

function activate() {
  return {
    extendMarkdownIt(md) {
      return md.use(footnoteHere);
    }
  };
}

exports.activate = activate;