// @flow
import type {Doc, EnumTag} from "@webdoc/types";
import {matchDataTypeClosure, StringUtils} from "./helper";

// @enum [{<DATA_TYPE>}] [<NAME>]

export function parseEnum(value: string, doc: $Shape<Doc>): EnumTag {
  const dataTypeClosure = matchDataTypeClosure(value);

  if (dataTypeClosure) {
    value = StringUtils.del(value, dataTypeClosure).trimStart();

    const dataType = dataTypeClosure[0];

    doc.dataType = [dataType, dataType];
  }

  if (value) {
    doc.name = value.trim();
  }

  return {
    value,
    type: "EnumDoc",
  };
}