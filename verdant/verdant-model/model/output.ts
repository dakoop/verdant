import { each, iterItems } from "@lumino/algorithm";
import { CodeCellModel } from "@jupyterlab/cells";
import { IMimeBundle, IOutput } from "@jupyterlab/nbformat";
import { IOutputAreaModel } from "@jupyterlab/outputarea";
import { JSONExt, PartialJSONValue } from "@lumino/coreutils";
import { BlobData, BlobHash } from "./blob";
import { HistoryStore } from "./store";

import { Version, VersionId } from './version';

export class OutputVersion extends Version {
    // not sure there is a lot in parent versions here?
    // outputs depend on the cell not the output...
    constructor(history: HistoryStore, jpModel: IOutputAreaModel=null, options: OutputVersion.IOptions={}) {
        super(history, options);
        if (jpModel) {
            this.fromJupyterModel(jpModel);
        } else {
            this.jpModel = null;
            this.raw = options.raw
            this.mimeHashes = options.mimeHashes;
            this.cellVersionId = options.cellVersionId;
        }
    }

    // make blobhashes an ordered list?
    public fromJupyterModel(jpModel: IOutputAreaModel) {
        this.jpModel = jpModel;
        if (! this.jpModel) return;

        const outputs = []
        const mimeHashes = [];
        for (let i = 0; i < (this.jpModel.length ?? 0); i++) {
            const output = this.jpModel.get(i);
            switch (output.type) {
                case 'execute_result':
                case 'display_data':
                case 'update_display_data':
                    // want to encode each mimetype separately...
                    // encode data as blob
                    const mimeBundle = {};
                    each(iterItems(output.data), ([mimeType, mimeData]) => {
                        console.log("EACH:", mimeType, mimeData);
                        const blobData = new BlobData( {data: mimeData as PartialJSONValue} );
                        blobData.computeHash().then(() => {
                            this.history.blobs[blobData.hash] = blobData;
                            mimeBundle[mimeType] = blobData.hash;
                        });
                    });
                    console.log("MIME BUNDLE:", mimeBundle);
                    mimeHashes.push(mimeBundle);
                    // const data = new BlobData({data: output.data as PartialJSONValue})
                    // this.history.blobs[data.hash] = data;
                    // blobHashes.push(data.hash);
                    const outputJSON = output.toJSON();
                    delete outputJSON.data;
                    outputs.push(outputJSON);
                    break;
                default:
                    mimeHashes.push(null);
                    outputs.push(output.toJSON());
            }
        }

        this.raw = outputs;
        this.mimeHashes = mimeHashes;
    }
    
    public createJupyterModel(): IOutputAreaModel {
        // need to check for blob and knit in if necessary
        const outputsData = JSONExt.deepCopy(this.raw);
        for(let i=0; i < outputsData.length; i++) {
            const output = outputsData[i];
            const mimeHashes = this.mimeHashes[i];
            if (mimeHashes) {
                switch ((output as IOutput).output_type) {
                    case 'execute_result':
                    case 'display_data':
                    case 'update_display_data':
                        output.data = {} as IMimeBundle;
                        each(Object.keys(mimeHashes), mimeType => {
                            output.data[mimeType] = this.history.blobs[mimeHashes[mimeType] as BlobHash].data;
                        });
                        break
                    default:
                        break;
                }
            }
        }
        return this.contentFactory.createOutputArea({ values: outputsData });
    }

    public toJSON(): OutputVersion.IOptions {
        return {
            ...super.toJSON(),
            raw: this.raw,
            mimeHashes: this.mimeHashes,
            cellVersionId: this.cellVersionId,
        }
    }


    public jpModel: IOutputAreaModel;
    public contentFactory: CodeCellModel.IContentFactory;
    public raw: IOutput[];
    public mimeHashes: { [type: string]: PartialJSONValue }[];
    public cellVersionId: VersionId;
}

export namespace OutputVersion {
    export interface IOptions extends Version.IOptions {
        // FIXME include trusted? Or just do IOutputAreaModel?
        raw?: IOutput[];
        mimeHashes?: { [type: string]: PartialJSONValue }[];
        cellVersionId?: VersionId;
    }

    export function fromJSON(history: HistoryStore, jsn: IOptions) {
        return new OutputVersion(history, null, jsn);
    }
}