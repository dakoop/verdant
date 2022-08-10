import { CellModel, ICellModel, ICodeCellModel } from "@jupyterlab/cells";
import { ICell } from "@jupyterlab/nbformat";
import { NotebookModel } from "@jupyterlab/notebook";
import { JSONExt } from "@lumino/coreutils";
import { OutputVersion } from "./output";
import { HistoryStore } from "./store";
import { Version, VersionId } from "./version";

export class CellVersion extends Version {
    // duplicate makes parent versions
    // split makes parent version
    // merge makes parent versions
    // copy-and-paste could link cell versions
    constructor(history: HistoryStore, jpModel: ICellModel=null, options: CellVersion.IOptions={}) {
        super(history, options);
        if (jpModel) {
            this.fromJupyterModel(jpModel);
        } else {
            this.jpModel = null;
            this.raw = options.raw;
            this.outputVersionIds = options.outputVersionIds;
        }
    }

    public fromJupyterModel(jpModel: ICellModel) {
        this.jpModel = jpModel;
        if (!this.jpModel) return;

        if (this.jpModel.type == 'code') {
            const outputModel = (this.jpModel as ICodeCellModel).outputs;
            const outputVersion = new OutputVersion(this.history, outputModel);
            this.addOutputVersion(outputVersion);
            this.currentOutputVersion = outputVersion;
            this.raw = this.jpModel.toJSON();
            delete this.raw.outputs; // strip outputs
        } else {
            this.currentOutputVersion = null;
        }
    }

    public createJupyterModel(outputVersionId: VersionId): ICellModel {
        const options: CellModel.IOptions = {
            // FIXME unsure how necessary the deep copy is
            cell: JSONExt.deepCopy(this.raw),
            id: this.raw.id as VersionId,
        };
        switch (this.raw.cell_type) {
            case 'code':
                this.currentOutputVersion = this.history.outputVersions.getVersion(outputVersionId);
                // FIXME do we have to go back to JSON?
                options.cell.outputs = this.currentOutputVersion.createJupyterModel().toJSON();
                const codeCell = this.contentFactory.createCodeCell(options);
                this.jpModel = codeCell;
                return codeCell;
            case 'markdown':
                const markdownCell = this.contentFactory.createMarkdownCell(options);
                this.jpModel = markdownCell;
                return markdownCell;
            case 'raw':
                const rawCell = this.contentFactory.createRawCell(options);
                this.jpModel = rawCell;
                return rawCell;
            default:
                throw new Error("Unknown cell type: " + this.raw.cell_type);
        }
    }

    public addOutputVersion(outputVersion: OutputVersion) {
        this.history.outputVersions.addVersion(outputVersion);
        // add to local output versions, too (that gets translated into outputVersionIds)
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
        return new CellVersion(history, null, jsn);
    }
}