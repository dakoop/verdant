import { ICellModel } from "@jupyterlab/cells";
import { ICell, ICodeCell, IMimeBundle, IOutput } from "@jupyterlab/nbformat";
import { INotebookModel } from "@jupyterlab/notebook";
import { map, toArray } from "@lumino/algorithm";
import { PartialJSONObject, PartialJSONValue, UUID } from "@lumino/coreutils";
import { BlobHash, BlobData } from "./blob";
import { CellVersion } from "./cell";
import { NotebookVersion } from "./notebook";
import { OutputVersion } from "./output";
import { ObjectId, VersionId } from "./version";
import { VersionStore } from "./version-store";

export class IPyHistory {
    constructor(notebookModel: INotebookModel, options: IPyHistory.IOptions) {
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
    
        if (notebookModel) this.setNotebookModel(notebookModel);
    }

    public setNotebookModel(notebookModel: INotebookModel) {
        this.notebookModel = notebookModel;

        // FIXME need to reconcile with existing versions if they exist...
        // maybe write the versionid into the metadata for cells, outputs, notebook

        const cellOrder = [];
        const outputOrder = [];    
        for (let i = 0; i < (this.notebookModel.cells?.length ?? 0); i++) {
            const cell = this.notebookModel.cells.get(i).toJSON();
            const cellVersion = this.addCellVersion(cell);
            let outputVersion: OutputVersion | null = null;
            if (cell.cell_type == 'code') {
                // strip outputs
                const blobHashes: (string | null)[] = [];
                for (const output of (cell as ICodeCell).outputs) {
                    // FIXME add hashing...
                    if (output) {
                        // FIXME strip mime bundles from outputs (since they'll be handled separately)
                        // store in this.blobs with hash
                        blobHashes.push(null);
                    }
                }
                outputVersion = this.addOutputVersion(cellVersion.id, (cell as ICodeCell).outputs, blobHashes);
                outputOrder.push(outputVersion.id);
                cell.outputs = []; // strip outputs
            } else {
                outputOrder.push(null);
            }
            cellOrder.push(cellVersion.id);
        }
        const nbVersion = this.addNotebookVersion(cellOrder, outputOrder, this.notebookModel.metadata.toJSON());
        this.currentVersion = nbVersion.id;
        this.notebookModel.metadata.set('ipyhistory-test',this.toJSON());
    }

    public toJSON(): IPyHistory.IOptions {
        return {
            id: this.notebookId,
            notebookVersions: toArray(map(this.notebookVersions.iterVersions(), v => v.toJSON())),
            cellVersions: toArray(map(this.cellVersions.iterVersions(), v => v.toJSON())),
            outputVersions: toArray(map(this.outputVersions.iterVersions(), v => v.toJSON())),
        }
    }

    public addNotebookVersion(cellOrder: VersionId[], outputOrder: VersionId[], metadata: PartialJSONValue): NotebookVersion {
        const nbVersion = new NotebookVersion({ objectId: this.notebookId, cellOrder, outputOrder, metadata });
        this.notebookVersions.addVersion(nbVersion);
        return nbVersion;
    }

    public addCellVersion(raw: ICell, outputVersionIds: VersionId[]=[]): CellVersion {
        const cellVersion = new CellVersion({ objectId: raw.id as ObjectId, raw, outputVersionIds });
        this.cellVersions.addVersion(cellVersion);
        return cellVersion;
    }

    public addOutputVersion(cellVersionId: VersionId, raw: IOutput[], blobHashes: string[]): OutputVersion {
        // cannot dump blobHashes into output metadata individually because that doesn't
        // exist for stream/error (which may mean those shouldn't be cached?)
        //
        // FIXME deal with tags for dfnotebook
        const outputVersion = new OutputVersion({ objectId: UUID.uuid4(), raw, blobHashes, cellVersionId });
        this.outputVersions.addVersion(outputVersion);
        return outputVersion;
    }

    public addBlobData(data: IMimeBundle) {
        const blobData = new BlobData({ data });
        this.blobs[blobData.hash] = blobData;
    }

    public getVersion(versionId: VersionId) {
        const nb = this.notebookVersions[versionId];

        // paralleling @jupyterlab/notebook:NotebookModel.fromJSON
        const cells = [];
        for (const idx in nb.cellOrder) {
            const cellVersionId = nb.cellOrder[idx];
            const outputVersionId = nb.outputOrder[idx];
            const cellVersion = this.cellVersions[cellVersionId];
            const outputVersion = this.outputVersions[outputVersionId];
            const blobHashes = outputVersion.blobHashes;
            const blobs = blobHashes.map((hash: BlobHash) => this.blobs[hash]);
            const cellModel = cellVersion.cellModel(blobs, outputVersion);
            cells.push(cellModel);
        }

        // should be able to do this in a more incremental fashion...
        this.notebookModel.cells.beginCompoundOperation();
        this.notebookModel.cells.clear();
        this.notebookModel.cells.pushAll(cells);
        this.notebookModel.cells.endCompoundOperation();
    
        // Update the metadata.
        this.notebookModel.metadata.clear();
        const metadata = nb.metadata;
        for (const key in metadata) {
            // don't expose the history here
            if (key != IPyHistory.METADATA_KEY) {
              this.notebookModel.metadata.set(key, metadata[key]);
            }
        }
        this.notebookModel.dirty = true;
    }

    public persistMetadata() {
        const nbVersion = this.notebookVersions.mostRecentVersion();
        for (const key in this.notebookModel.metadata) {
            if (key != IPyHistory.METADATA_KEY) {
                nbVersion.metadata[key] = this.notebookModel.metadata.get(key);
            }
        }
    }

    public updateCellVersion(cellVersionId: VersionId, outputVersionId: VersionId=null) {
        // we can get the index from notebook and use that
        const cellVersion = this.cellVersions[cellVersionId];
        let outputVersion = null;
        if (outputVersionId) {
            outputVersion = this.outputVersions[outputVersionId];
        } else {
            // FIXME what is the correct behavior here?
            // we can get the most recent output associated with that cellVersion
            // or the one that corresponds to the 
            outputVersion = cellVersion.getLatestOutput();
        }
        if (outputVersion.cellVersionId != cellVersionId) {
            throw new Error("outputVerisonId must point to cellVersionId");
        }
        const blobHashes = outputVersion.blobHashes;
        const blobs = blobHashes.map((hash: BlobHash) => this.blobs[hash]);
        const cellModel = cellVersion.cellModel(blobs, outputVersion);
        console.log(cellModel);

        // swap this cell model
        // this.notebookModel.cells.remove(idx);
        // this.notebookModel.cells.insert(idx, cellModel);
    }

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
    notebookId: ObjectId;
    currentVersion: VersionId;
    notebookVersions: VersionStore<NotebookVersion>;
    cellVersions: VersionStore<CellVersion>;
    outputVersions: VersionStore<OutputVersion>;
    //@ts-ignore
    blobs: {[hash: BlobHash]: BlobData};
}

export namespace IPyHistory {
    export const METADATA_KEY: string = 'ipyhistory';
    export interface IOptions extends PartialJSONObject {
        id?: ObjectId;
        currentVersion?: VersionId; // which notebook version
        notebookVersions?: NotebookVersion.IOptions[];
        cellVersions?: CellVersion.IOptions[];
        outputVersions?: OutputVersion.IOptions[];
    }

    export function fromJSON(notebookModel: INotebookModel, jsn: IOptions) {
        return new IPyHistory(notebookModel, jsn);
    }
}