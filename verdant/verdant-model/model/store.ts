import { PartialJSONObject, UUID } from "@lumino/coreutils";
import { CellVersion } from "./cell";
import { NotebookVersion } from "./notebook";
import { OutputVersion } from "./output";
import { ObjectId, VersionId } from "./version";
import { VersionStore } from "./version-store";
import { BlobHash, BlobData } from './blob';

export class HistoryStore {
    constructor(options: HistoryStore.IOptions={}) {
        this.notebookId = options.id ?? UUID.uuid4();
        this.currentVersion = options.currentVersion ?? null;
        this.notebookVersions = new VersionStore<NotebookVersion>();
        this.cellVersions = new VersionStore<CellVersion>();
        this.outputVersions = new VersionStore<OutputVersion>();

        if (options.notebookVersions) {
            for (const ver of options.notebookVersions) {
                this.notebookVersions.addVersion(NotebookVersion.fromJSON(ver));
            }
        }
        if (options.cellVersions) {
            for (const ver of options?.cellVersions) {
                this.cellVersions.addVersion(CellVersion.fromJSON(ver));
            }
        }
        if (options.outputVersions) {
            for (const ver of options?.outputVersions) {
                this.outputVersions.addVersion(OutputVersion.fromJSON(ver));
            }
        }
    }

    notebookId: ObjectId;
    currentVersion: VersionId;
    notebookVersions: VersionStore<NotebookVersion>;
    cellVersions: VersionStore<CellVersion>;
    outputVersions: VersionStore<OutputVersion>;
    //@ts-ignore
    blobs: { [hash: BlobHash]: BlobData };
}

export namespace HistoryStore {
    export const METADATA_KEY: string = 'ipyhistory';
    export interface IOptions extends PartialJSONObject {
        id?: ObjectId;
        currentVersion?: VersionId; // which notebook version
        notebookVersions?: NotebookVersion.IOptions[];
        cellVersions?: CellVersion.IOptions[];
        outputVersions?: OutputVersion.IOptions[];
    }

    export function fromJSON(jsn: IOptions) {
        return new HistoryStore(jsn);
    }
}
