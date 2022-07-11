import {
  Nodey,
  NodeyCell,
  NodeyMarkdown,
  NodeyCodeCell,
  NodeyCode,
  NodeyNotebook,
  NodeyOutput,
  NodeyRawCell,
} from "../nodey";
import { History } from "../history";
import { ChangeType } from "../checkpoint";

/*
 * Remember that versions and ids are 1 indexed for display, but 0 indexed in storage
 */

export namespace Namer {
  export function getVersionTitle(n?: Nodey) {
    if (!n || n.id === undefined || n.version === undefined) return "???";
    let kind = n.typeChar.toUpperCase();
    return `${kind}${n.id.substring(0,8)}.r${n.version.substring(0,8)}`;
  }

  export function getCellTitle(n?: NodeyCell) {
    if (!n) return "???";
    let kind;
    if (n instanceof NodeyMarkdown) kind = "Markdown";
    else if (n instanceof NodeyCodeCell) kind = "Code Cell";
    else if (n instanceof NodeyRawCell) kind = "Raw Cell";
    return `${kind} ${n.id === undefined ? "???" : n.id.substring(0,8)}`;
  }

  export function getCellShortTitle(n?: NodeyCell) {
    if (!n) return "???";
    return `${n.typeChar.toUpperCase()}${
      n.id === undefined ? "???" : n.id.substring(0,8)
    }`;
  }

  export function getCellVersionTitle(n?: NodeyCell) {
    if (!n) return "???";
    return `${n.typeChar.toUpperCase()}${
      n.id === undefined ? "???" : n.id.substring(0,8)
    }.r${n.version === undefined ? "???" : n.version.substring(0,8)}`;
  }

  export function getOutputTitle(n?: NodeyOutput, history?: History) {
    if (!n || !history) return "???";
    let cell = history.store.get(n.parent);
    if (!cell) return "???";
    return `${Namer.getCellTitle(cell)} Output`;
  }

  export function getOutputVersionTitle(n?: NodeyOutput, history?: History) {
    if (!n || !history) return "???";
    let cell = history.store.get(n.parent);
    if (!cell) return "???";
    return `${Namer.getCellVersionTitle(cell)}.o${
      n.version === undefined ? "???" : n.version.substring(0,8)
    }`;
  }

  export function getCodeSnippetTitle(n?: NodeyCode) {
    if (n)
      return `${n.type.toUpperCase} ${
        n.version === undefined ? "???" : n.version.substring(0,8)
      }`;
    return "???";
  }

  export function getNotebookTitle(n?: NodeyNotebook) {
    return `Notebook v${
      n ? (n.version === undefined ? "???" : n.version.substring(0,8)) : "?"
    }`;
  }

  export function getNotebookVersionLabel(n?: NodeyNotebook) {
    return `v${n ? (n.version === undefined ? "???" : n.version.substring(0,8)) : "?"}`;
  }

  export function getVersionNumberLabel(n?: string) {
    return n === undefined ? "???" : n.substring(0,8)
  }

  export function describeChange(nodey: NodeyCell, changes: ChangeType[]) {
    if (changes[0] === ChangeType.OUTPUT_CHANGED)
      return `${Namer.getCellTitle(nodey)}'s ${changes.join(", ")}`;
    return `${Namer.getCellTitle(nodey)} was ${changes.join(", ")}`;
  }
}
