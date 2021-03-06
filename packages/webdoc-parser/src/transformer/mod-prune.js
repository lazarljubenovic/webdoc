// @flow

import type {Doc, RootDoc} from "@webdoc/types";
import {removeChildDoc} from "@webdoc/model";

export default function prune(doc: Doc, root: RootDoc) {
  if (doc.tags && doc.tags.find((tag) => tag.name === "ignore")) {
    removeChildDoc(doc);
    return;
  } else {
    for (let i = 0; i < doc.members.length; i++) {
      prune(doc.members[i], root);
    }
  }

  // Prune undocumented docs with no children too
  if (doc.parserOpts && doc.parserOpts.undocumented && doc.members.length === 0) {
    removeChildDoc(doc);
  }
  if (doc.type !== "PropertyDoc" && doc.type !== "MethodDoc" && doc.type !== "FunctionDoc") {
    // only class members could be "instance"
    if (doc.scope === "instance") {
      delete doc.scope;
    }
  }
}
