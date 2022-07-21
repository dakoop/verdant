import { CellModel, ICellModel } from "@jupyterlab/cells";
import { ICell } from "@jupyterlab/nbformat";
import { NotebookModel } from "@jupyterlab/notebook";
import { JSONExt } from "@lumino/coreutils";
import { BlobData, BlobHash } from "./blob";
import { OutputVersion } from "./output";
import { Version, VersionId } from "./version";

export class CellVersion extends Version {
    // duplicate makes parent versions
    // split makes parent version
    // merge makes parent versions
    // copy-and-paste could link cell versions
    constructor(options: CellVersion.IOptions) {
        super(options);
        this.raw = options.raw;
        this.outputVersionIds = options.outputVersionIds;
    }

    public toJSON(): CellVersion.IOptions {
        return {
            ...super.toJSON(),
            raw: this.raw,
            outputVersionIds: this.outputVersionIds,
        }
    }

    //@ts-ignore
    public cellModel(blobs: {[hash: BlobHash]: BlobData}, outputVersion?: OutputVersion): ICellModel {
        const options: CellModel.IOptions = {
            // FIXME unsure how necessary the deep copy is
            cell: JSONExt.deepCopy(this.raw),
            id: this.raw.id as VersionId,
        };
        switch (this.raw.cell_type) {
            case 'code':
                // FIXME do we go this way or just stay in JSON world?
                options.cell.outputs = outputVersion.outputModel(blobs).toJSON();
                const codeCell = this.contentFactory.createCodeCell(options);
                return codeCell;
            case 'markdown':
                const markdownCell = this.contentFactory.createMarkdownCell(options);
                return markdownCell;
            case 'raw':
                const rawCell = this.contentFactory.createRawCell(options);
                return rawCell;
            default:
                throw new Error("Unknown cell type: " + this.raw.cell_type);
        }
    }

    public addOutputVersionId(versionId: VersionId) {
        // FIXME send the full outputVersion and check/set it's cellVersionId?
        this.outputVersionIds.push(versionId);
    }

    public contentFactory: NotebookModel.IContentFactory;
    public outputVersionIds: VersionId[]
    //@ts-ignore
    public outputVersions: {[ver: VersionId]: OutputVersion};
    public raw: ICell;
}

export namespace CellVersion {
    export interface IOptions extends Version.IOptions {
        raw: ICell;
        outputVersionIds?: VersionId[];
    }

    export function fromJSON(jsn: IOptions) {
        return new CellVersion(jsn);
    }
}