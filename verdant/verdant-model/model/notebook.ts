import { INotebookModel } from '@jupyterlab/notebook';
import { PartialJSONObject } from '@lumino/coreutils';
import jsonStableStringify from 'json-stable-stringify';
import { CellVersion } from './cell';
import { HistoryStore } from './store';
import { ObjectId, Version, VersionId } from './version';

export class NotebookVersion extends Version {
    // could allow merged notebooks
    // can allow duplicate notebooks
    // copy-and-paste?
    // order matters here, cell versions must have an order

    constructor(history: HistoryStore, options: NotebookVersion.IOptions={}) {
        super(history, options);
        this.cellOrder = options.cellOrder;
        this.outputOrder = options.outputOrder;
        this.metadata = this.cleanMetadata(options.metadata);
    }

    public async fromJupyterModel(jpModel: INotebookModel) {
        this.jpModel = jpModel;
        if (!this.jpModel) return;

        this.cellOrder = [];
        this.outputOrder = [];
        // keep some mapping from cell id to model/version?
        for (let i = 0; i < (this.jpModel.cells?.length ?? 0); i++) {
            const cellModel = this.jpModel.cells.get(i);
            const cellVersion = new CellVersion(this.history);
            await cellVersion.fromJupyterModel(cellModel);
            this.addCellVersion(cellVersion);
            this.cellOrder.push(cellVersion.id);
            // console.log("OUTPUT VERSION IS NULL?", cellVersion);
            this.outputOrder.push(cellVersion.currentOutputVersion?.id);
        }
        this.metadata = this.cleanMetadata(this.jpModel.metadata.toJSON());
    }

    public async updateFromJupyterModel(jpModel: INotebookModel) {
        let changed = false;
        const cellOrder = [];
        const outputOrder = [];

        for (let i = 0; i < (jpModel.cells?.length ?? 0); i++) {
            const cellModel = jpModel.cells.get(i);
            // search existing for this cell version
            // if notebook has cell version, pull it and check it
            let cellVersion = this.findCellVersion(cellModel.id);
            if (!cellVersion) {
                cellVersion = new CellVersion(this.history);                
            }
            const newCellVersion = await cellVersion.updateFromJupyterModel(cellModel);
            if (newCellVersion) {
                changed = true;
                cellVersion = newCellVersion;
                this.addCellVersion(cellVersion);
            }
            cellOrder.push(cellVersion.id);
            // console.log("OUTPUT VERSION IS NULL?", cellVersion);
            outputOrder.push(cellVersion.currentOutputVersion?.id);
        }

        const metadata = this.cleanMetadata(jpModel.metadata.toJSON());
        if (jsonStableStringify(cellOrder) != jsonStableStringify(this.cellOrder)
            || jsonStableStringify(outputOrder) != jsonStableStringify(this.outputOrder)
            || jsonStableStringify(metadata) != jsonStableStringify(this.metadata)) {
            changed = true;
        }
        if (changed) {
            console.log("NOTEBOOK CHANGED");
            const notebookVersion = new NotebookVersion(this.history, {
                cellOrder,
                outputOrder,
                metadata,
                parentVersions: [this.id]
            });
            return notebookVersion;
        }
        console.log("NOTEBOOK UNCHANGED");
        return null;
    }


    public updateJupyterModel(jpModel: INotebookModel) {
        const cells = [];
        for (let i = 0; i < (this.cellOrder?.length ?? 0); i++) {
            const cellVersion = this.history.cellVersions.getVersion(this.cellOrder[i]);
            // FIXME for true delta updates, may have to do this more carefully
            // currently just clobber
            const cellModel = cellVersion.createJupyterModel(this.outputOrder[i], jpModel.contentFactory);
            cells.push(cellModel);
        }

        console.log("CELLS:", cells);

        jpModel.cells.beginCompoundOperation();
        jpModel.cells.clear();
        jpModel.cells.pushAll(cells);
        jpModel.cells.endCompoundOperation();
    
        jpModel.metadata.clear();
        for (const key in this.metadata) {
            if (key != NotebookVersion.METADATA_KEY) {
                jpModel.metadata.set(key, this.metadata[key]);
            }
        }
        jpModel.dirty = true;
    }

    public createJupyterModel(jpModel: INotebookModel) {
        jpModel.cells.clear()
        for (let i = 0; i < (this.cellOrder?.length ?? 0); i++) {
            const cellVersion = this.history.cellVersions.getVersion(this.cellOrder[i]);
            const cellModel = cellVersion.createJupyterModel(this.outputOrder[i], jpModel.contentFactory);
            // FIXME shouldn't need this here because cell does it
            //
            // if (cellModel.type == 'code') {
            //     const outputVersion = this.history.outputVersions.getVersion(this.outputOrder[i]);
            //     const outputModel = outputVersion.createJupyterModel(jpModel.contentFactory.codeCellContentFactory);
            //     const codeCellModel = cellModel as ICodeCellModel;
            //     codeCellModel.clearExecution();
            //     for (let j = 0; j < (outputModel.length ?? 0); j++) {
            //         // FIXME is toJSON correct here?
            //         codeCellModel.outputs.add(outputModel.get(j).toJSON());
            //     }
            // }
            jpModel.cells.push(cellModel);
        }
        for (const key in this.metadata) {
            if (key != NotebookVersion.METADATA_KEY) {
                jpModel.metadata.set(key, this.metadata[key]);
            }
        }
    }

    // public setMetadata(metadata: PartialJSONObject) {
    //     this.metadata = {};
    //     if (metadata) {
    //         for (const key in metadata) {
    //             // don't expose the history here
    //             if (key != NotebookVersion.METADATA_KEY) {
    //                 this.metadata[key] = metadata[key];
    //             }
    //         }
    //     }
    // }

    public cleanMetadata(metadata: PartialJSONObject): PartialJSONObject {
        const outMetadata = {};
        if (metadata) {
            for (const key in metadata) {
                // don't expose the history here
                if (key != NotebookVersion.METADATA_KEY) {
                    outMetadata[key] = metadata[key];
                }
            }
        }
        return outMetadata;
    }



    public addCellVersion(cell: CellVersion) {
        this.history.cellVersions.addVersion(cell);
    }

    public findCellVersion(cellId: ObjectId) {
        for (let i = 0; i < this.cellOrder.length; i++) {
            const cellVersion = this.history.cellVersions.getVersion(this.cellOrder[i]);
            if (cellVersion.objectId == cellId) return cellVersion;
        }
    }

    public toJSON(): NotebookVersion.IOptions {
        return {
            ...super.toJSON(),
            cellOrder: this.cellOrder,
            outputOrder: this.outputOrder,
            metadata: this.metadata,
        };
    }
    public history: HistoryStore;
    public jpModel: INotebookModel;
    public cellOrder: VersionId[];
    public outputOrder: (VersionId | null)[];
    public metadata: PartialJSONObject;
}

export namespace NotebookVersion {
    export const METADATA_KEY = 'ipyhistory';
    export interface IOptions extends Version.IOptions {
        cellOrder?: VersionId[]; // links to ids for cell versions
        outputOrder?: (VersionId | null)[];
        metadata?: PartialJSONObject;
    }

    export function fromJSON(history: HistoryStore, jsn: IOptions) {
        return new NotebookVersion(history, jsn);
    }

    export async function fromJupyterModel(history: HistoryStore, model: INotebookModel) {
        const ver = new NotebookVersion(history);
        await ver.fromJupyterModel(model);
        return ver;
    }
}