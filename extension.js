import footnoteHere from '@peaceroad/markdown-it-footnote-here';
import fs from 'fs';
import path from 'path';
import { commands, workspace } from 'vscode';

const CONFIG_SECTION = 'p7dMarkdownItFootnoteHere';
const CSS_FILE = 'footnote-here.css';
const CACHED_CSS_FILE = `_${CSS_FILE}`;

const BUILTIN_FOOTNOTE_RULES = {
  block: ['footnote_def', 'footnote_block'],
  inline: ['footnote_ref', 'footnote_inline'],
  core: ['footnote_tail', 'footnote_anchor'],
};

let cachedCss = null;
let shouldDisableBuiltinFootnotes = true;

function getExtensionConfig() {
  return workspace.getConfiguration(CONFIG_SECTION);
}

function getFileSize(filePath) {
  try {
    return fs.statSync(filePath).size;
  } catch (error) {
    if (error.code === 'ENOENT') return -1;
    throw error;
  }
}

function isDirectory(dirPath) {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

function ensureCachedCss(appliedCssFile, cachedCssFile) {
  if (cachedCss !== null) return cachedCss;
  try {
    cachedCss = fs.readFileSync(cachedCssFile, 'utf8');
    return cachedCss;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  try {
    cachedCss = fs.readFileSync(appliedCssFile, 'utf8');
    if (cachedCss.length > 0) {
      fs.writeFileSync(cachedCssFile, cachedCss, 'utf8');
    }
    return cachedCss;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  cachedCss = '';
  return cachedCss;
}

function applyStyleSetting(disableStyle, cssDirectory, appliedCssFile, cachedCssFile) {
  if (!isDirectory(cssDirectory)) return;
  if (disableStyle) {
    ensureCachedCss(appliedCssFile, cachedCssFile);
    if (getFileSize(appliedCssFile) <= 0) return;
    fs.writeFileSync(appliedCssFile, '', 'utf8');
    return;
  }
  const css = ensureCachedCss(appliedCssFile, cachedCssFile);
  if (css.length === 0) return;
  if (getFileSize(appliedCssFile) === css.length) return;
  fs.writeFileSync(appliedCssFile, css, 'utf8');
}

function getStringOption(config, key, fallback) {
  const value = config.get(key, '');
  if (typeof value === 'string' && value.length > 0) return value;
  return fallback;
}

function getPluginOptions(config) {
  return {
    beforeSameBacklink: config.get('beforeSameBacklink', false),
    afterBacklink: config.get('afterBacklink', false),
    afterBacklinkContent: getStringOption(config, 'afterBacklinkContent', '↩'),
    afterBacklinkWithNumber: config.get('afterBacklinkWithNumber', false),
    afterBacklinkSuffixArabicNumerals: config.get('afterBacklinkSuffixArabicNumerals', false),
    afterBacklinkdAriaLabelPrefix: getStringOption(config, 'afterBacklinkdAriaLabelPrefix', 'Back to reference '),
    labelBra: getStringOption(config, 'labelBra', '['),
    labelKet: getStringOption(config, 'labelKet', ']'),
    labelSupTag: config.get('labelSupTag', false),
    backLabelBra: getStringOption(config, 'backLabelBra', '['),
    backLabelKet: getStringOption(config, 'backLabelKet', ']'),
    endnotesPrefix: getStringOption(config, 'endnotesPrefix', 'en-'),
    endnotesLabelPrefix: getStringOption(config, 'endnotesLabelPrefix', 'E'),
    endnotesSectionId: getStringOption(config, 'endnotesSectionId', 'endnotes'),
    endnotesSectionClass: getStringOption(config, 'endnotesSectionClass', ''),
    endnotesSectionAriaLabel: getStringOption(config, 'endnotesSectionAriaLabel', 'Notes'),
    endnotesUseHeading: config.get('endnotesUseHeading', false),
  };
}

function buildFootnoteOptions() {
  const config = getExtensionConfig();
  shouldDisableBuiltinFootnotes = !config.get('disableBuiltinFootnotes', false);
  return getPluginOptions(config);
}

function disableRule(ruler, name) {
  if (!ruler || typeof ruler.disable !== 'function') return;
  try {
    ruler.disable(name);
  } catch (_) {
    // Ignore missing rules or unsupported API.
  }
}

function disableBuiltinFootnotes(md) {
  const blockRuler = md.block && md.block.ruler;
  const inlineRuler = md.inline && md.inline.ruler;
  const coreRuler = md.core && md.core.ruler;

  BUILTIN_FOOTNOTE_RULES.block.forEach((name) => disableRule(blockRuler, name));
  BUILTIN_FOOTNOTE_RULES.inline.forEach((name) => disableRule(inlineRuler, name));
  BUILTIN_FOOTNOTE_RULES.core.forEach((name) => disableRule(coreRuler, name));
}

function ensureFootnoteEnv(env) {
  const safeEnv = (env && typeof env === 'object') ? env : {};
  if (!safeEnv.footnotes || typeof safeEnv.footnotes !== 'object') {
    safeEnv.footnotes = {};
  }
  if (!Array.isArray(safeEnv.footnotes.totalCounts)) {
    safeEnv.footnotes.totalCounts = [];
  }
  if (!safeEnv.endnotes || typeof safeEnv.endnotes !== 'object') {
    safeEnv.endnotes = {};
  }
  if (!Array.isArray(safeEnv.endnotes.totalCounts)) {
    safeEnv.endnotes.totalCounts = [];
  }
  return safeEnv;
}

function wrapRendererRule(md, name, fallback) {
  const renderer = md.renderer.rules[name];
  if (typeof renderer !== 'function') return;
  md.renderer.rules[name] = (tokens, idx, options, env, slf) => {
    const safeEnv = ensureFootnoteEnv(env);
    try {
      return renderer(tokens, idx, options, safeEnv, slf);
    } catch (error) {
      if (typeof fallback === 'function' && fallback !== renderer) {
        return fallback(tokens, idx, options, safeEnv, slf);
      }
      throw error;
    }
  };
}

export function activate(ctx) {
  const cssDirectory = path.join(ctx.extensionPath, 'style');
  const appliedCssFile = path.join(cssDirectory, CSS_FILE);
  const cachedCssFile = path.join(cssDirectory, CACHED_CSS_FILE);

  let pluginOptions = buildFootnoteOptions();
  let disableStyle = getExtensionConfig().get('disableStyle', false);
  applyStyleSetting(disableStyle, cssDirectory, appliedCssFile, cachedCssFile);

  const configListener = workspace.onDidChangeConfiguration(event => {
    if (!event.affectsConfiguration(CONFIG_SECTION)) return;
    pluginOptions = buildFootnoteOptions();
    const nextDisableStyle = getExtensionConfig().get('disableStyle', false);
    if (nextDisableStyle !== disableStyle) {
      disableStyle = nextDisableStyle;
      applyStyleSetting(disableStyle, cssDirectory, appliedCssFile, cachedCssFile);
    }
    void commands.executeCommand('workbench.action.reloadWindow');
  });
  ctx.subscriptions.push(configListener);

  return {
    extendMarkdownIt(md) {
      const fallbackFootnoteRef = md.renderer.rules.footnote_ref;
      const fallbackFootnoteAnchor = md.renderer.rules.footnote_anchor;
      if (shouldDisableBuiltinFootnotes) {
        disableBuiltinFootnotes(md);
      }
      md.use(footnoteHere, pluginOptions);
      wrapRendererRule(md, 'footnote_ref', fallbackFootnoteRef);
      wrapRendererRule(md, 'footnote_anchor', fallbackFootnoteAnchor);
      return md;
    }
  };
}
