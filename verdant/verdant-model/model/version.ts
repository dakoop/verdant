import { PartialJSONObject, UUID } from "@lumino/coreutils";
import { HistoryStore } from "./store";

export type VersionId = string;
export type ObjectId = string;

export class Version {
    constructor(history: HistoryStore, options: Version.IOptions) {
        this.history = history;
        this.id = options.id ?? UUID.uuid4();
        this.objectId = options.objectId;
        this.timestamp = options.timestamp ?? Date.now();
        this.user = options.user ?? 'dummyUserName';
        this.parentVersions = options.parentVersions ?? [];
    }

    public toJSON(): Version.IOptions {
        return {
            id: this.id,
            objectId: this.objectId,
            timestamp: this.timestamp,
            user: this.user,
            parentVersions: this.parentVersions,
        }
    }

    history: HistoryStore;
    id: VersionId; // version id, unique
    objectId: ObjectId; // object id, not unique
    timestamp: number;
    user: string;
    parentVersions: string[];
}

export namespace Version {
    export interface IOptions extends PartialJSONObject {
        id?: VersionId;
        objectId?: ObjectId;
        timestamp?: number;
        user?: string;
        parentVersions?: string[];
    }

    export function fromJSON(history: HistoryStore, jsn: IOptions) {
        return new Version(history, jsn);
    }
}