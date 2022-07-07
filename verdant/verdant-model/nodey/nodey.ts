export abstract class Nodey {
  id: string | undefined; // uuid for this node
  version: string | undefined; // version uuid
  parentVersion: string | undefined; // version uuid for parent
  created: number | undefined; // id marking which checkpoint
  parent: string | undefined; // lookup id for the parent Nodey of this Nodey

  constructor(options: Nodey.Options) {
    this.id = options.id;
    // FIXME why do we have to check for undefined?
    this.version = options.version;
    this.parentVersion = options.parentVersion;
    if (options.created !== undefined) this.created = options.created;
    if (options.parent !== undefined) this.parent = options.parent + "";
  }

  get name(): string {
    return this.typeChar + "." + this.id + "." + this.version;
  }

  get artifactName(): string {
    return this.typeChar + "." + this.id;
  }

  public updateState(_: Nodey.Options) {}

  public toJSON(): Nodey.SERIALIZE {
    let jsn = {"id": this.id};
    if (this.version) jsn["version"] = this.version;
    if (this.parentVersion) jsn["parentVersion"] = this.parentVersion;
    if (this.created) jsn["start_checkpoint"] = this.created;
    if (this.parent) jsn["parent"] = this.parent;
    return jsn;
  }

  abstract get typeChar(): string;
}

export namespace Nodey {
  export type Options = {
    id?: string; // uuid for this node
    version?: string; // version uuid
    parentVersion?: string; // parent version uuid
    created?: number; //id marking which checkpoint
    parent?: string | number; //lookup id for the parent Nodey of this Nodey
  };

  export interface SERIALIZE {
    id: string;
    version?: string;
    parentVersion?: string;
    parent?: string;
    start_checkpoint?: number;
    origin?: string; // only used if this nodey was derived from a prior seperate nodey
  }
}

/*
 * Cell-level nodey interface
 */
export interface NodeyCell extends Nodey {}
