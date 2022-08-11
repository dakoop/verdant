import { ICellModel } from "@jupyterlab/cells";
// import { ICell, ICodeCell, IMimeBundle, IOutput } from "@jupyterlab/nbformat";
import { INotebookModel } from "@jupyterlab/notebook";
// import { map, toArray } from "@lumino/algorithm";
// import { PartialJSONObject, UUID } from "@lumino/coreutils";
import { HistoryStore } from "./store";
// import { BlobHash, BlobData } from "./blob";
// import { CellVersion } from "./cell";
import { NotebookVersion } from "./notebook";
import { VersionId } from "./version";
// import { OutputVersion } from "./output";
// import { ObjectId, VersionId } from "./version";

// FIXME most of this is now covered by the individual classes so this class can just coordinate instead
export class IPyHistory {
    constructor(store: HistoryStore=null) {
        this.history = store ?? new HistoryStore();
        // if (notebookModel) {
        //     this.notebookModel = notebookModel;
        //     this.history.currentVersion = new NotebookVersion(this.history, notebookModel);
        //     this.history.notebookVersions.addVersion(this.history.currentVersion);
        // } else {
        //     // get things from the history store and construct notebook model
        // }
    }

    public async fromJupyterModel(notebookModel: INotebookModel) {
        this.notebookModel = notebookModel;
        this.history.currentVersion = new NotebookVersion(this.history);
        await this.history.currentVersion.fromJupyterModel(notebookModel);
        this.history.notebookVersions.addVersion(this.history.currentVersion);
    }

    get currentVersion() {
        return this.history.currentVersion;
    }

    set currentVersion(version) {
        this.history.currentVersion = version;
    }

    public persistToMetadata() {
        this.notebookModel.metadata.set(NotebookVersion.METADATA_KEY, this.toJSON());
        this.notebookModel.dirty = true;
        // const metadata = this.currentVersion.metadata;
        // for (const key in metadata) {
        //     // don't expose the history here
        //     if (key != NotebookVersion.METADATA_KEY) {
        //     }
        // }
    }

    public async updateFromJupyterModel(jpModel: INotebookModel) {
        const newVersion = await this.currentVersion.updateFromJupyterModel(jpModel);
        if (newVersion) {
            console.log("GOT NEW VERSION", newVersion);
            this.history.currentVersion = newVersion;
            this.history.notebookVersions.addVersion(newVersion);
        }
        this.notebookModel = jpModel;
    }

    public updateFromHistory(versionId: VersionId=null) {
        console.log("UPDATE CALLED", versionId);
        // FIXME just something to get the oldest version to try this out
        if (!versionId) {
            let version = this.currentVersion;
            while (version.parentVersions.length > 0) {
                version = this.history.notebookVersions.getVersion(version.parentVersions[0]);
            }
            versionId = version.id;
        }
        console.log("GETTING VERSION:", versionId);
        this.currentVersion = this.history.notebookVersions.getVersion(versionId);
        this.currentVersion.updateJupyterModel(this.notebookModel);
    }

    public toJSON(): HistoryStore.IOptions {
        return this.history.toJSON();
    }

    // public setNotebookModel(notebookModel: INotebookModel) {
    //     this.notebookModel = notebookModel;

    //     this.currentVersion = this.notebookVersion.fromJupyterModel();

    //     this.currentVersion = nbVersion.id;
    //     this.notebookModel.metadata.set('ipyhistory-test',this.toJSON());
    // }


    // public addNotebookVersion(cellOrder: VersionId[], outputOrder: VersionId[], metadata: PartialJSONObject): NotebookVersion {
    //     const nbVersion = new NotebookVersion({ objectId: this.notebookId, cellOrder, outputOrder, metadata });
    //     this.notebookVersions.addVersion(nbVersion);
    //     return nbVersion;
    // }

    // public addCellVersion(raw: ICell, outputVersionIds: VersionId[]=[]): CellVersion {
    //     const cellVersion = new CellVersion({ objectId: raw.id as ObjectId, raw, outputVersionIds });
    //     this.cellVersions.addVersion(cellVersion);
    //     return cellVersion;
    // }

    // public addOutputVersion(cellVersionId: VersionId, raw: IOutput[], blobHashes: string[]): OutputVersion {
    //     // cannot dump blobHashes into output metadata individually because that doesn't
    //     // exist for stream/error (which may mean those shouldn't be cached?)
    //     //
    //     // FIXME deal with tags for dfnotebook
    //     const outputVersion = new OutputVersion({ objectId: UUID.uuid4(), raw, blobHashes, cellVersionId });
    //     this.outputVersions.addVersion(outputVersion);
    //     return outputVersion;
    // }

    // public addBlobData(data: IMimeBundle) {
    //     const blobData = new BlobData({ data });
    //     this.blobs[blobData.hash] = blobData;
    // }

    // public getVersion(versionId: VersionId) {
    //     const nb = this.notebookVersions[versionId];

    //     // paralleling @jupyterlab/notebook:NotebookModel.fromJSON
    //     const cells = [];
    //     for (const idx in nb.cellOrder) {
    //         const cellVersionId = nb.cellOrder[idx];
    //         const outputVersionId = nb.outputOrder[idx];
    //         const cellVersion = this.cellVersions[cellVersionId];
    //         const outputVersion = this.outputVersions[outputVersionId];
    //         const blobHashes = outputVersion.blobHashes;
    //         const blobs = blobHashes.map((hash: BlobHash) => this.blobs[hash]);
    //         const cellModel = cellVersion.cellModel(blobs, outputVersion);
    //         cells.push(cellModel);
    //     }

    //     // should be able to do this in a more incremental fashion...
    //     this.notebookModel.cells.beginCompoundOperation();
    //     this.notebookModel.cells.clear();
    //     this.notebookModel.cells.pushAll(cells);
    //     this.notebookModel.cells.endCompoundOperation();
    
    //     // Update the metadata.
    //     this.notebookModel.metadata.clear();
    //     const metadata = nb.metadata;
    //     for (const key in metadata) {
    //         // don't expose the history here
    //         if (key != IPyHistory.METADATA_KEY) {
    //           this.notebookModel.metadata.set(key, metadata[key]);
    //         }
    //     }
    //     this.notebookModel.dirty = true;
    // }

    // public persistMetadata() {
    //     const nbVersion = this.notebookVersions.mostRecentVersion();
    //     const metadata = this.notebookModel.metadata.toJSON();
    //     nbVersion.setMetadata(metadata);
    // }

    // public updateCellVersion(cellVersionId: VersionId, outputVersionId: VersionId=null) {
    //     // we can get the index from notebook and use that
    //     const cellVersion = this.cellVersions[cellVersionId];
    //     let outputVersion = null;
    //     if (outputVersionId) {
    //         outputVersion = this.outputVersions[outputVersionId];
    //     } else {
    //         // FIXME what is the correct behavior here?
    //         // we can get the most recent output associated with that cellVersion
    //         // or the one that corresponds to the 
    //         outputVersion = cellVersion.getLatestOutput();
    //     }
    //     if (outputVersion.cellVersionId != cellVersionId) {
    //         throw new Error("outputVerisonId must point to cellVersionId");
    //     }
    //     const blobHashes = outputVersion.blobHashes;
    //     const blobs = blobHashes.map((hash: BlobHash) => this.blobs[hash]);
    //     const cellModel = cellVersion.cellModel(blobs, outputVersion);
    //     console.log(cellModel);

    //     // swap this cell model
    //     // this.notebookModel.cells.remove(idx);
    //     // this.notebookModel.cells.insert(idx, cellModel);
    // }

    public cellChanged(cell: ICellModel) {
        // add a new cell version
        // update cellOrder
        // create new notebook version with updated cellOrder
        // update metadata if needed
    }

    public cellMoved() {
        // update cellOrder and outputOrder
        // create new notebook version with updated cellOrder and outputOrder
        // update metadata if needed
    }

    public cellDeleted() {
        // update cellOrder and outputOrder
        // create new notebook version with updated cellOrder and outputOrder
        // update metadata if needed
    }

    public cellAdded() {
        // add a new cell version
        // update cellOrder and add null to outputOrder
        // create new notebook version with updated cellOrder (and outputOrder)
        // update metadata if needed
    }

    public cellExecuted(cell: ICellModel) {
        // create a new output version
        // update outputOrder
        // create a new notebook version with updated outputOrder
        // update metadata if needed
    }

    public cellOutputCleared() {
        // update outputOrder to point to null at specific index
        // create a new notebook version with updated outputOrder
        // update metadata if needed
    }

    public cellsMerged() {
        // update 
    }

    public cellSplit() {
        // update
    }

    notebookModel: INotebookModel;
    history: HistoryStore;
}

export namespace IPyHistory {
    export function fromJSON(jsn: HistoryStore.IOptions) {
        return new IPyHistory(HistoryStore.fromJSON(jsn));        
    }

    export async function fromJupyterModel(model: INotebookModel): Promise<IPyHistory> {
        const ipyhistory = new IPyHistory(null);
        await ipyhistory.fromJupyterModel(model);
        return ipyhistory
    }
}