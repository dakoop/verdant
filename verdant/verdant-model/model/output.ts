import { CodeCellModel } from "@jupyterlab/cells";
import { IOutput } from "@jupyterlab/nbformat";
import { IOutputAreaModel } from "@jupyterlab/outputarea";
import { JSONExt } from "@lumino/coreutils";
import { BlobData, BlobHash } from "./blob";

import { Version, VersionId } from './version';

export class OutputVersion extends Version {
    // not sure there is a lot in parent versions here?
    // outputs depend on the cell not the output...
    constructor(options: OutputVersion.IOptions) {
        super(options);
        this.raw = options.raw
        this.blobHashes = options.blobHashes;
        this.cellVersionId = options.cellVersionId;
    }

    public toJSON(): OutputVersion.IOptions {
        return {
            ...super.toJSON(),
            raw: this.raw,
            blobHashes: this.blobHashes,
            cellVersionId: this.cellVersionId,
        }
    }

    //@ts-ignore
    public outputModel(blobs: { [hash: BlobHash]: BlobData }): IOutputAreaModel {
        // need to check for blob and knit in if necessary
        const outputsData = JSONExt.deepCopy(this.raw);
        for(let i=0; i < outputsData.length; i++) {
            const output = outputsData[i];
            const hash = this.blobHashes[i];
            if ((output as IOutput).output_type == 'execute_result'
                    || (output as IOutput).output_type == 'display_data'
                    || (output as IOutput).output_type == 'update_display_data') {
                output.data = blobs[hash as BlobHash].data;
            }
        }
        return this.contentFactory.createOutputArea({ values: outputsData });
    }

    public contentFactory: CodeCellModel.IContentFactory;
    public raw: IOutput[];
    public blobHashes: string[];
    public cellVersionId: VersionId;
}

export namespace OutputVersion {
    export interface IOptions extends Version.IOptions {
        // FIXME include trusted? Or just do IOutputAreaModel?
        raw: IOutput[];
        blobHashes: string[];
        cellVersionId: VersionId;
    }

    export function fromJSON(jsn: IOptions) {
        return new OutputVersion(jsn);
    }
}