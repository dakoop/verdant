import { PartialJSONValue } from '@lumino/coreutils';
import { Version, VersionId } from './version';

export class NotebookVersion extends Version {
    // could allow merged notebooks
    // can allow duplicate notebooks
    // copy-and-paste?
    // order matters here, cell versions must have an order

    constructor(options: NotebookVersion.IOptions) {
        super(options);
        this.cellOrder = options.cellOrder;
        this.outputOrder = options.outputOrder;
        this.metadata = options.metadata;
    }

    public toJSON(): NotebookVersion.IOptions {
        return {
            ...super.toJSON(),
            cellOrder: this.cellOrder,
            outputOrder: this.outputOrder,
            metadata: this.metadata,
        };
    }
    public cellOrder: VersionId[];
    public outputOrder: (VersionId | null)[];
    public metadata: PartialJSONValue;
}

export namespace NotebookVersion {
    export interface IOptions extends Version.IOptions {
        cellOrder: VersionId[]; // links to ids for cell versions
        outputOrder: (VersionId | null)[];
        metadata: PartialJSONValue;
    }

    export function fromJSON(jsn: IOptions) {
        return new NotebookVersion(jsn);
    }
}