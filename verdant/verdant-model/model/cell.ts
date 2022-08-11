import { CellModel, ICellModel, ICodeCellModel } from "@jupyterlab/cells";
import { ICell } from "@jupyterlab/nbformat";
import { NotebookModel } from "@jupyterlab/notebook";
import { JSONExt } from "@lumino/coreutils";
import { OutputVersion } from "./output";
import { HistoryStore } from "./store";
import { Version, VersionId } from "./version";
import jsonStableStringify from "json-stable-stringify";

export class CellVersion extends Version {
    // duplicate makes parent versions
    // split makes parent version
    // merge makes parent versions
    // copy-and-paste could link cell versions
    constructor(history: HistoryStore, options: CellVersion.IOptions={}) {
        super(history, options);
        this.jpModel = null;
        this.raw = options.raw;
        this.outputVersionIds = options.outputVersionIds ?? [];
    }

    public async fromJupyterModel(jpModel: ICellModel) {
        this.jpModel = jpModel;
        if (!this.jpModel) return;

        if (this.jpModel.type == 'code') {
            const outputModel = (this.jpModel as ICodeCellModel).outputs;
            const outputVersion = new OutputVersion(this.history);
            await outputVersion.fromJupyterModel(outputModel);
            this.addOutputVersion(outputVersion);
            this.currentOutputVersion = outputVersion;
            this.objectId = this.jpModel.id;
            this.raw = this.jpModel.toJSON();
            delete this.raw.outputs; // strip outputs
        } else {
            this.raw = this.jpModel.toJSON();
            this.currentOutputVersion = null;
        }
    }

    public async updateFromJupyterModel(jpModel: ICellModel) {
        let changed = false;
        let newRaw = null;
        let currentOutputVersion = this.currentOutputVersion;
        if (jpModel.type == 'code') {
            const outputModel = (jpModel as ICodeCellModel).outputs;
            if (!currentOutputVersion) {
                currentOutputVersion = new OutputVersion(this.history);
            }
            const newOutputVersion = await currentOutputVersion.updateFromJupyterModel(outputModel);
            if (newOutputVersion) {
                // new output version
                currentOutputVersion = newOutputVersion;
            }

            newRaw = jpModel.toJSON();
            delete newRaw.outputs; // strip outputs
        } else {
            newRaw = jpModel.toJSON();
        }

        console.log("OLD:")
        if (!this.raw || jsonStableStringify(this.raw) != jsonStableStringify(newRaw)) {
            changed = true;
        }

        if (!changed) {
            console.log("CELL UNCHANGED", this.id);
            if (currentOutputVersion.id != this.currentOutputVersion.id) {
                // have a new output, cell doesn't change though 
                console.log("CELL OUTPUT CHANGED", currentOutputVersion.id, this.currentOutputVersion.id);
                this.addOutputVersion(currentOutputVersion)
            }
            return null;
        } else {
            console.log("CELL CHANGED", this.id, this.raw, newRaw);
            const cellVersion = new CellVersion(this.history, {
                raw: newRaw,
                parentVersions: [this.id]
            });
            cellVersion.addOutputVersion(currentOutputVersion);
            return cellVersion;
        }            
    }

    public createJupyterModel(outputVersionId: VersionId, 
                              contentFactory: NotebookModel.IContentFactory): ICellModel {
        const options: CellModel.IOptions = {
            // FIXME unsure how necessary the deep copy is
            cell: JSONExt.deepCopy(this.raw),
            id: this.raw.id as VersionId,
        };
        switch (this.raw.cell_type) {
            case 'code':
                this.currentOutputVersion = this.history.outputVersions.getVersion(outputVersionId);
                // FIXME do we have to go back to JSON?
                options.cell.outputs = this.currentOutputVersion.createJupyterModel(contentFactory.codeCellContentFactory).toJSON();
                const codeCell = contentFactory.createCodeCell(options);
                this.jpModel = codeCell;
                return codeCell;
            case 'markdown':
                const markdownCell = contentFactory.createMarkdownCell(options);
                this.jpModel = markdownCell;
                return markdownCell;
            case 'raw':
                const rawCell = contentFactory.createRawCell(options);
                this.jpModel = rawCell;
                return rawCell;
            default:
                throw new Error("Unknown cell type: " + this.raw.cell_type);
        }
    }

    public updateJupyterModel(outputVersionId: VersionId, contentFactory: NotebookModel.IContentFactory): ICellModel {
        const options: CellModel.IOptions = {
            // FIXME unsure how necessary the deep copy is
            cell: JSONExt.deepCopy(this.raw),
            id: this.raw.id as VersionId,
        };
        switch (this.raw.cell_type) {
            case 'code':
                this.currentOutputVersion = this.history.outputVersions.getVersion(outputVersionId);
                // FIXME do we have to go back to JSON?
                options.cell.outputs = this.currentOutputVersion.createJupyterModel(contentFactory.codeCellContentFactory).toJSON();
                const codeCell = this.contentFactory.createCodeCell(options);
                this.jpModel = codeCell;
                return codeCell;
            case 'markdown':
                this.currentOutputVersion = null;
                const markdownCell = this.contentFactory.createMarkdownCell(options);
                this.jpModel = markdownCell;
                return markdownCell;
            case 'raw':
                this.currentOutputVersion = null;
                const rawCell = this.contentFactory.createRawCell(options);
                this.jpModel = rawCell;
                return rawCell;
            default:
                throw new Error("Unknown cell type: " + this.raw.cell_type);
        }
    }


    public addOutputVersion(outputVersion: OutputVersion) {
        if (outputVersion) {
            this.history.outputVersions.addVersion(outputVersion);
            // add to local output versions, too (that gets translated into outputVersionIds)
            this.outputVersionIds.push(outputVersion.id);
            this.currentOutputVersion = outputVersion;
        }
    }


    public toJSON(): CellVersion.IOptions {
        return {
            ...super.toJSON(),
            raw: this.raw,
            outputVersionIds: this.outputVersionIds,
        }
    }

    public addOutputVersionId(versionId: VersionId) {
        // FIXME send the full outputVersion and check/set it's cellVersionId?
        this.outputVersionIds.push(versionId);
    }

    public jpModel: ICellModel;
    public currentOutputVersion: OutputVersion;
    public contentFactory: NotebookModel.IContentFactory;
    public outputVersionIds: VersionId[]
    //@ts-ignore
    public outputVersions: {[ver: VersionId]: OutputVersion};
    public raw: ICell;
}

export namespace CellVersion {
    export interface IOptions extends Version.IOptions {
        raw?: ICell;
        outputVersionIds?: VersionId[];
    }

    export function fromJSON(history: HistoryStore, jsn: IOptions) {
        return new CellVersion(history, jsn);
    }
}