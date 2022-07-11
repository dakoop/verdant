import * as nbformat from "@jupyterlab/nbformat";

import { Nodey, NodeyCell } from "./nodey";
/*
 * Markdown nodey
 */
export class NodeyMarkdown extends Nodey implements NodeyCell {
  markdown: string | undefined;
  raw: nbformat.IMarkdownCell | undefined;

  constructor(options: NodeyMarkdown.Options) {
    super(options);
    this.updateState(options);
  }

  public updateState(options: NodeyMarkdown.Options) {
    super.updateState(options);
    if (options.markdown) this.markdown = options.markdown;
    if (options.raw) this.raw = options.raw;
  }

  public toJSON(): NodeyMarkdown.SERIALIZE {
    let jsn = super.toJSON() as NodeyMarkdown.SERIALIZE;
    if (this.markdown) jsn.markdown = this.markdown;
    if (this.raw) jsn.raw = this.raw;
    return jsn;
  }

  get typeChar() {
    return "m";
  }
}

export namespace NodeyMarkdown {
  export type Options = {
    markdown?: string;
    raw?: nbformat.IMarkdownCell
  } & Nodey.Options;

  export interface SERIALIZE extends Nodey.SERIALIZE {
    markdown?: string;
    raw?: nbformat.IMarkdownCell;
  }

  export const typeChar = "m";

  export function fromJSON(dat: NodeyMarkdown.SERIALIZE): NodeyMarkdown {
    return new NodeyMarkdown(dat);
  }
}
