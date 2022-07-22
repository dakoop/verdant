import { ICodeCellModel } from '@jupyterlab/cells';
import { IOutput } from '@jupyterlab/nbformat';
import { INotebookModel, NotebookModel } from '@jupyterlab/notebook';
import { PartialJSONObject } from '@lumino/coreutils';
import { CellVersion } from './cell';
import { HistoryStore } from './store';
import { Version, VersionId } from './version';

export class NotebookVersion extends Version {
    // could allow merged notebooks
    // can allow duplicate notebooks
    // copy-and-paste?
    // order matters here, cell versions must have an order

    constructor(jpModel=null, options: NotebookVersion.IOptions={}) {
        super(options);
        this.jpModel = jpModel;
        this.cellOrder = options.cellOrder;
        this.outputOrder = options.outputOrder;
        this.setMetadata(options.metadata);
    }

    public fromJupyterModel(jpModel: INotebookModel, history: HistoryStore) {
        this.jpModel = jpModel;
        if (!this.jpModel) return;

        const cellOrder = [];
        const outputOrder = [];
        // keep some mapping from cell id to model/version?
        for (let i = 0; i < (this.jpModel.cells?.length ?? 0); i++) {
            const cellModel = this.jpModel.cells.get(i);
            const cellVersion = new CellVersion(cellModel);
            cellOrder.push(cellVersion.id);
            outputOrder.push(cellVersion.currentOutputVersion.id);
        }
        this.setMetadata(this.jpModel.metadata.toJSON());
    }

    public createJupyterModel(history: HistoryStore) {
        this.jpModel.cells.clear()
        for (let i = 0; i < (this.cellOrder?.length ?? 0); i++) {
            const cellVersion = history.cellVersions.getVersion(this.cellOrder[i]);
            const outputVersion = history.outputVersions.getVersion(this.outputOrder[i]);
            const cellModel = cellVersion.createJupyterModel(history, this.outputOrder[i]);
            if (cellModel.type == 'code') {
                const outputModel = outputVersion.createJupyterModel(history);
                const codeCellModel = cellModel as ICodeCellModel;
                codeCellModel.clearExecution();
                for (let j = 0; j < (outputModel.length ?? 0); j++) {
                    // FIXME is toJSON correct here?
                    codeCellModel.outputs.add(outputModel.get(j).toJSON());
                }
            }
            this.jpModel.cells.push(cellModel);
        }
        for (const key in this.metadata) {
            if (key != NotebookVersion.METADATA_KEY) {
                this.jpModel.metadata.set(key, this.metadata[key]);
            }
        }
    }

    public setMetadata(metadata: PartialJSONObject) {
        this.metadata = {};
        if (metadata) {
            for (const key in metadata) {
                // don't expose the history here
                if (key != NotebookVersion.METADATA_KEY) {
                    this.metadata[key] = metadata[key];
                }
            }
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

    export function fromJSON(jsn: IOptions) {
        return new NotebookVersion(jsn);
    }
}