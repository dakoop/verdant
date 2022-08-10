import { ObjectId, Version, VersionId } from "./version";
import { toArray, map, each, iterValues, max, IIterator } from "@lumino/algorithm";
import { PartialJSONArray } from "@lumino/coreutils";

export class VersionStore<T extends Version> {
    constructor(versions: T[]=[]) {
        this.versions = {};
        each(versions, v => void this.addVersion(v));
    }

    get objectId(): ObjectId {
        return this.current.objectId;
    }

    public addVersion(version: T) {
        this.versions[version.id] = version;
        return version.id;
    }

    public getVersion(version: VersionId): T {
        return this.versions[version];
    }

    public mostRecentVersion(): T {
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

}
