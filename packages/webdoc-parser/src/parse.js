// @flow

import type {LanguageConfig, LanguageIntegration} from "./types/LanguageIntegration";
import type {RootDoc, SourceFile} from "@webdoc/types";
import {createPackageDoc, createRootDoc} from "@webdoc/model";
import {langJS, langTS} from "./symbols-babel";
import type {Symbol} from "./types/Symbol";
import assemble from "./assembler";
import fs from "fs";
import mod from "./transformer/document-tree-modifiers";
import {parserLogger} from "./Logger";
import path from "path";
import transform from "./transformer";

declare var Webdoc: any;

// File-extension -> LanguageIntegration mapping
const languages: { [id: string]: LanguageIntegration } = {};

// Register a language-integration that will be used to generate a symbol-tree for files with its
// file-extensions.
export function registerLanguage(lang: LanguageIntegration): void {
  for (const ext of lang.extensions) {
    if (languages[ext]) {
      parserLogger.warn("LanguageIntegration",
        `.${ext} file extension has already been registered`);
    }

    languages[ext] = lang;
  }
}

// Register built-in languages
registerLanguage(langJS);
registerLanguage(langTS);

// Default language-config for parsing documentation
const DEFAULT_LANG_CONFIG: LanguageConfig = {
  reportUndocumented: false,
};

// $FlowFixMe
if (!global.Webdoc) {
  // $FlowFixMe
  global.Webdoc = {};
}

// $FlowFixMe
global.Webdoc.DEFAULT_LANG_CONFIG = DEFAULT_LANG_CONFIG;

// Used when you want to parse all the symbols in the code. This includes unit-testing.
export function applyDefaultLangConfig(cfg: LanguageConfig) {
  // $FlowFixMe
  global.Webdoc.DEFAULT_LANG_CONFIG = cfg;
}

export function buildSymbolTree(
  file: string,
  source?: SourceFile | string,
  config: LanguageConfig = Webdoc.DEFAULT_LANG_CONFIG,
): Symbol {
  if (typeof source === "undefined") {
    source = ".js";
  }
  if (typeof source === "string") {
    source = {
      path: source,
      package: {
        id: "id-virtual-root",
        api: [],
        name: "",
        path: "",
        stack: [],
        location: "",
        metadata: {},
        members: [],
        type: "PackageDoc",
      },
    };
  }

  const fileName = source.path;
  const lang = languages[fileName.substring(fileName.lastIndexOf(".") + 1, fileName.length)];

  if (!lang) {
    throw new Error(`.${lang} file language is not registered`);
  }

  return lang.parse(file, source, config);
}

// TODO: Asynchronous API for parsing

/**
 * Parses the file(s) into a doc-tree. This consists of the following phases:
 *
 * * Capture Phase: Documentation comments are extracted out of each file and assembled into
 *     a temporary list of partial-doc trees.
 * * Transform Phase: Each file's partial-doc tree is transformed into docs and assembled in
 *     monolithic doc-tree.
 * * Mod Phase: The "@memberof" tag is handled by moving docs to their final path;
 *     <this> member docs are moved to the appropriate scope.
 *     Plugins are allowed access to make any post-transform changes as well. Undocumented entities
 *     are removed from the doc-tree.
 *
 * @param {string | SourceFile[]} target
 * @param {RootDoc} root
 * @return {RootDoc}
 */
export function parse(target: string | SourceFile[], root?: RootDoc = createRootDoc()): RootDoc {
  if (typeof target === "string") {
    target = [{
      content: target,
      path: ".js",
      package: createPackageDoc(),
    }];
  }

  const partialDoctrees = new Array(Array.isArray(target) ? target.length : target.size);

  // Build a symbol-tree for all the files
  for (let i = 0; i < target.length; i++) {
    const {content, path: source} = target[i];

    partialDoctrees[i] = buildSymbolTree(
      content || fs.readFileSync(path.join(process.cwd(), source), "utf8"),
      target[i],
    );
  }

  const rsym = assemble(partialDoctrees);

  root.children = root.members;

  transform(rsym, root);
  mod(root);

  return root;
}
