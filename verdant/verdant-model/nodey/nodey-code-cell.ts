import { NodeyCell } from "./nodey";
import { NodeyCode } from "./nodey-code";

/*
 * Code Cell-level nodey
 */
export class NodeyCodeCell extends NodeyCode implements NodeyCell {
  get typeChar() {
    return "c";
  }

  // Note this is simplified from Nodey Code
  public toJSON(): NodeyCode.SERIALIZE {
    let jsn = super.toJSON() as NodeyCode.SERIALIZE;
    if (this.literal) jsn.literal = this.literal;
    jsn.start = this.start;
    jsn.end = this.end;
    return jsn;
  }
}

export namespace NodeyCodeCell {
  export function fromJSON(dat: NodeyCode.SERIALIZE): NodeyCodeCell {
    // FIXME can type & content be defaulted in SERIALIZE?
    return new NodeyCodeCell({type: "Module", content: [], ...dat});
  }
}
