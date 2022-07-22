import { CodeCellModel } from "@jupyterlab/cells";
import { IMimeBundle, IOutput } from "@jupyterlab/nbformat";
import { IOutputAreaModel } from "@jupyterlab/outputarea";
import { JSONExt } from "@lumino/coreutils";
import { BlobData, BlobHash } from "./blob";
import { HistoryStore } from "./store";

import { Version, VersionId } from './version';

export class OutputVersion extends Version {
    // not sure there is a lot in parent versions here?
    // outputs depend on the cell not the output...
    constructor(jpModel: IOutputAreaModel=null, options: OutputVersion.IOptions={}) {
        super(options);
        this.jpModel = jpModel;
        this.raw = options.raw
        this.blobHashes = options.blobHashes;
        this.cellVersionId = options.cellVersionId;
    }

    // make blobhashes an ordered list?
    public fromJupyterModel(jpModel: IOutputAreaModel, history: HistoryStore) {
        this.jpModel = jpModel;
        if (! this.jpModel) return;

        const outputs = []
        const blobHashes = [];
        for (let i = 0; i < (this.jpModel.length ?? 0); i++) {
            const output = this.jpModel.get(i);
            switch (output.type) {
                case 'execute_result':
                case 'display_data':
                case 'update_display_data':
                    // encode data as blob
                    const data = new BlobData({data: output.data as IMimeBundle})
                    history.blobs[data.hash] = data;
                    blobHashes.push(data.hash);
                    const outputJSON = output.toJSON();
                    outputs.push(outputJSON);            
                    break;
                default:
                    blobHashes.push(null);
                    outputs.push(output.toJSON());
            }
        }

        this.raw = outputs;
        this.blobHashes = blobHashes;
    }
    
    public createJupyterModel(history: HistoryStore): IOutputAreaModel {
        // need to check for blob and knit in if necessary
        const outputsData = JSONExt.deepCopy(this.raw);
        for(let i=0; i < outputsData.length; i++) {
            const output = outputsData[i];
            const hash = this.blobHashes[i];
            switch ((output as IOutput).output_type) {
                case 'execute_result':
                case 'display_data':
                case 'update_display_data':
                    output.data = history.blobs[hash as BlobHash].data;
                default:
                    break;
            }
        }
        return this.contentFactory.createOutputArea({ values: outputsData });
    }

    public toJSON(): OutputVersion.IOptions {
        return {
            ...super.toJSON(),
            raw: this.raw,
            blobHashes: this.blobHashes,
            cellVersionId: this.cellVersionId,
        }
    }


    public jpModel: IOutputAreaModel;
    public contentFactory: CodeCellModel.IContentFactory;
    public raw: IOutput[];
    public blobHashes: string[];
    public cellVersionId: VersionId;
}

export namespace OutputVersion {
    export interface IOptions extends Version.IOptions {
        // FIXME include trusted? Or just do IOutputAreaModel?
        raw?: IOutput[];
        blobHashes?: string[];
        cellVersionId?: VersionId;
    }

    export function fromJSON(jsn: IOptions) {
        return new OutputVersion(null, jsn);
    }
}