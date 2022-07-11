import * as nbformat from "@jupyterlab/nbformat";

import { Nodey, NodeyCell } from "./nodey";

/*
 * Simple raw cell type (rare, since most cells are code or markdown)
 */
export class NodeyRawCell extends Nodey implements NodeyCell {
  literal: string | undefined;
  raw: nbformat.IRawCell | undefined;

  constructor(options: NodeyRawCell.Options) {
    super(options);
    this.updateState(options);
  }

  public updateState(options: NodeyRawCell.Options) {
    super.updateState(options);
    if (options.literal) this.literal = options.literal;
    if (options.raw) this.raw = options.raw;
  }

  public toJSON(): NodeyRawCell.SERIALIZE {
    let jsn = super.toJSON() as NodeyRawCell.SERIALIZE;
    if (this.literal) jsn.literal = this.literal;
    if (this.raw) jsn.raw = this.raw;
    return jsn;
  }

  get typeChar() {
    return "r";
  }
}

export namespace NodeyRawCell {
  export type Options = {
    literal?: any;
    raw?: nbformat.IRawCell
  } & Nodey.Options;

  export interface SERIALIZE extends Nodey.SERIALIZE {
    literal?: string;
    raw?: nbformat.IRawCell;
  }

  export function fromJSON(dat: NodeyRawCell.SERIALIZE): NodeyRawCell {
    return new NodeyRawCell(dat);
  }
}
