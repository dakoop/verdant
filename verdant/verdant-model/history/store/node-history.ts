import { Nodey } from "../../nodey";
import { OriginPointer } from "./origin-pointer";
import { log } from "../../notebook";
import { UUID } from "@lumino/coreutils";

const DEBUG = false;

/*
 * Just a container for a list of nodey versions
 */
export class NodeHistory<T extends Nodey> {
  originPointer: OriginPointer | null = null;
  protected versions: { [ver: string]: T } = {};
  protected firstVersion: string | null = null;

  getAllVersions(): T[] {
    return Array.from(Object.values(this.versions));
    // return this.versions.slice(0);
  }

  addVersion(nodey: T): void {
    nodey.version = UUID.uuid4();
    if (! this.firstVersion) {
      this.firstVersion = nodey.version;
    }
    this.versions[nodey.version] = nodey;
  }

  getVersion(ver: string | null): T | undefined {
    if (! ver) {
      // return first version?
      ver = this.firstVersion;
    }
    return ver ? this.versions[ver] : undefined;
  }

  find(
    callbackfn: (value: T, index: number, array: T[]) => boolean
  ): T | undefined {
    return this.versionsAsArray.find(callbackfn);
  }

  foreach(callbackfn: (value: T, index: number, array: T[]) => void): void {
    return this.versionsAsArray.forEach(callbackfn);
  }

  // wrap to allow override implementation of filter
  filter(callbackfn: (value: T, index: number, array: T[]) => unknown): T[] {
    return this.versionsAsArray.filter(callbackfn);
  }

  // wrap to allow override implementation of map
  map(callbackfn: (value: T, index?: number, array?: T[]) => any): any[] {
    return this.versionsAsArray.map(callbackfn);
  }

  get id() {
    return this.latest?.id
  }

  get typeChar() {
    return this.latest?.typeChar;
  }

  get versionsAsArray() {
    return Array.from(Object.values(this.versions));
  }

  get name() {
    return this.latest?.typeChar + "." + this.latest?.id;
    // let latest = this.versions[this.versions.length - 1];
    // if (latest)
    //   return (
    //     latest.typeChar + "." + (latest.id !== undefined ? latest.id : "???")
    //   );
  }

  // FIXME this is slow? maintain sorted order?
  get latest(): T {
    return this.versionsAsArray.sort((a,b) => - b.created - a.created)[0];
    // return this.versions[this.versions.length - 1];
  }

  get length() {
    return Object.keys(this.versions).length;
  }

  addOriginPointer(origin: Nodey) {
    this.originPointer = new OriginPointer(origin);
  }

  toJSON(): NodeHistory.SERIALIZE {
    return this.serialize(this.versionsAsArray);
  }

  fromJSON(
    jsn: NodeHistory.SERIALIZE,
    factory: (dat: Nodey.SERIALIZE) => T
  ) {
    if (DEBUG) log("FACTORY DATA", jsn);
    this.versions = Object.fromEntries(
      jsn.versions.map(
        (nodeDat: Nodey.SERIALIZE) => {
          if (nodeDat.origin)
            this.originPointer = new OriginPointer(nodeDat.origin);
          let nodey = factory(nodeDat);
          //log("MADE NODEY FROM DATA", nodey, nodeDat);
          return [nodey.version, nodey];
        }
      )
    );
  }

  sliceByTime(fromTime: number, toTime: number): NodeHistory.SERIALIZE {
    return this.serialize(this.versionsAsArray.filter(
      (nodey) => nodey.created >= fromTime && nodey.created < toTime)
    );
    // let slice: T[] = [];
    // // get the first index of versions that happen on or after fromTime
    // let i = this.versions.findIndex((nodey) => {
    //   return nodey.created >= fromTime && nodey.created < toTime;
    // });
    // let nodey: T = this.versions[i]; // check each nodey to see if it is within time
    // while (nodey && nodey.created >= fromTime && nodey.created < toTime) {
    //   slice.push(nodey);
    //   i++;
    //   nodey = this.versions[i];
    // }
    // return this.serialize(slice);
  }

  sliceByVer(fromVer: string, toVer: string): NodeHistory.SERIALIZE {
    const versions : T[] = [];
    let node = this.versions[fromVer];
    while (node && node.version != toVer) {
      versions.push(node);
      node = this.versions[node.parentVersion];
    };
    return this.serialize(versions);

    // let slice = this.versions.slice(fromVer, toVer);
    // return this.serialize(slice);
  }

  // helper method
  protected serialize(vers: T[]): NodeHistory.SERIALIZE {
    let data: Nodey.SERIALIZE[] = vers.map((node) => node.toJSON());
    // let data: Nodey.SERIALIZE[] = vers.map((node) => node.toJSON());
    if (this.originPointer && data.length > 0)
      data[data.length - 1].origin = this.originPointer.origin;
    return { id: this.id, type: this.typeChar, artifact_name: this.name || "", versions: data };
  }
}

export namespace NodeHistory {
  export type SERIALIZE = {
    id?: string,
    type?: string,
    artifact_name: string;
    versions: Nodey.SERIALIZE[];
  };
}
