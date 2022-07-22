import { PartialJSONObject, UUID } from "@lumino/coreutils";

export type VersionId = string;
export type ObjectId = string;

export class Version {
    constructor(options: Version.IOptions) {
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

    export function fromJSON(jsn: IOptions) {
        return new Version(jsn);
    }
}