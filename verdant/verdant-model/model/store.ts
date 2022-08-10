import { PartialJSONObject, UUID } from "@lumino/coreutils";
import { iterValues, map, toArray } from "@lumino/algorithm";
import { CellVersion } from "./cell";
import { NotebookVersion } from "./notebook";
import { OutputVersion } from "./output";
import { ObjectId, VersionId } from "./version";
import { VersionStore } from "./version-store";
import { BlobHash, BlobData } from './blob';
// import { validateMimeValue } from "@jupyterlab/nbformat";

export class HistoryStore {
    constructor(options: HistoryStore.IOptions={}) {
        this.notebookId = options.id ?? UUID.uuid4();
        this.notebookVersions = new VersionStore<NotebookVersion>();
        this.cellVersions = new VersionStore<CellVersion>();
        this.outputVersions = new VersionStore<OutputVersion>();
        this.blobs = {};

        if (options.notebookVersions) {
            for (const ver of options.notebookVersions) {
                this.notebookVersions.addVersion(NotebookVersion.fromJSON(this, ver));
            }
        }
        if (options.cellVersions) {
            for (const ver of options?.cellVersions) {
                this.cellVersions.addVersion(CellVersion.fromJSON(this, ver));
            }
        }
        if (options.outputVersions) {
            for (const ver of options?.outputVersions) {
                this.outputVersions.addVersion(OutputVersion.fromJSON(this, ver));
            }
        }

        if (options.blobs) {
            for (const blob of options?.blobs) {
                this.blobs[blob.hash] = BlobData.fromJSON(blob);
            }
        }
        
        if (options.currentVersionId) {
            this.currentVersion = this.notebookVersions.getVersion(options.currentVersionId);
        } else {
            this.currentVersion = null;
        }
    }

    public toJSON(): HistoryStore.IOptions {
        return {
            id: this.notebookId,
            currentVersionId: this.currentVersion.id,
            notebookVersions: this.notebookVersions.toJSON() as NotebookVersion.IOptions[],
            cellVersions: this.cellVersions.toJSON() as CellVersion.IOptions[],
            outputVersions: this.outputVersions.toJSON() as OutputVersion.IOptions[],
            blobs: toArray(map(iterValues(this.blobs), (blob: BlobData) => blob.toJSON()))
        }
    }

    notebookId: ObjectId;
    currentVersion: NotebookVersion;
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
        currentVersionId?: VersionId; // which notebook version
        notebookVersions?: NotebookVersion.IOptions[];
        cellVersions?: CellVersion.IOptions[];
        outputVersions?: OutputVersion.IOptions[];
        blobs?: BlobData.IOptions[]
    }

    export function fromJSON(jsn: IOptions) {
        return new HistoryStore(jsn);
    }
}
