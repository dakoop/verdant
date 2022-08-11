import { ObjectId, Version, VersionId } from "./version";
import { toArray, map, each, iterValues, max, IIterator } from "@lumino/algorithm";
import { PartialJSONArray } from "@lumino/coreutils";

export class VersionStore<T extends Version> {
    constructor(versions: T[]=[]) {
        this.versions = {};
        // this.objectIdMap = {};
        each(versions, v => void this.addVersion(v));
    }

    get objectId(): ObjectId {
        return this.current.objectId;
    }

    public addVersion(version: T) {
        this.versions[version.id] = version;
        // if (! this.objectIdMap[version.objectId]) {
        //     this.objectIdMap[version.objectId] = [];
        // }
        // this.objectIdMap[version.objectId].push(version);
        return version.id;
    }

    public getVersion(version: VersionId): T {
        return this.versions[version];
    }

    // public getVersionsByObjId(id: ObjectId) {
    //     if (this.objectIdMap[id]) {
    //         return this.objectIdMap[id];
    //     }
    //     return [];
    // }

    public mostRecentVersion(id: ObjectId): T {
        // if (id) {
        //     const versions = this.getVersionsByObjId(id);
        //     return max(versions, (a, b) => a.timestamp - b.timestamp);
        // }
        return max(this.iterVersions(), (a,b) => a.timestamp - b.timestamp);
    }

    public iterVersions(): IIterator<T> {
        return iterValues(this.versions);
    }

    public toJSON(): PartialJSONArray {
        return toArray(map(this.iterVersions(), version => version.toJSON()));
    }

    current: T;
    //@ts-ignore
    versions: {[ver: VersionId]: T};
    // objectIdMap: {[id: ObjectId]: T[] };

}
