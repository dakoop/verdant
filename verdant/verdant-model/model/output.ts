import { each, iterItems } from "@lumino/algorithm";
import { CodeCellModel } from "@jupyterlab/cells";
import { IMimeBundle, IOutput } from "@jupyterlab/nbformat";
import { IOutputAreaModel } from "@jupyterlab/outputarea";
import { JSONExt, PartialJSONValue } from "@lumino/coreutils";
import { BlobData, BlobHash } from "./blob";
import { HistoryStore } from "./store";

import { Version, VersionId } from './version';
import jsonStableStringify from "json-stable-stringify";

export class OutputVersion extends Version {
    // not sure there is a lot in parent versions here?
    // outputs depend on the cell not the output...
    constructor(history: HistoryStore, options: OutputVersion.IOptions={}) {
        super(history, options);
        this.jpModel = null;
        this.raw = options.raw
        this.mimeHashes = options.mimeHashes;
        this.cellVersionId = options.cellVersionId;
    }

    // make blobhashes an ordered list?
    public async fromJupyterModel(jpModel: IOutputAreaModel) {
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
                    const bundleIterator = iterItems(output.data);
                    let item;
                    while (item = bundleIterator.next()) {
                        const [mimeType, mimeData] = item;
                        console.log("EACH:", mimeType, mimeData);
                        const blobData = new BlobData( {data: mimeData as PartialJSONValue} );
                        await blobData.computeHash();
                        console.log("BLOB DATA HASH:", blobData.hash);
                        if (! this.history.blobs[blobData.hash]) {
                            this.history.blobs[blobData.hash] = blobData;
                        }
                        mimeBundle[mimeType] = blobData.hash;
                    }
                    console.log("MIME BUNDLE:", mimeBundle);
                    mimeHashes.push(mimeBundle);
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
    
    public async updateFromJupyterModel(jpModel: IOutputAreaModel) {
        let changed = false;
        
        // if (!this.raw || this.jpModel.length != this.raw.length) {
        //     changed = true;
        // }

        const outputs = []
        const mimeHashes = [];
        for (let i = 0; i < (jpModel.length ?? 0); i++) {
            // const oldOutput = this.raw && this.raw.length > i ? this.raw[i] : null;
            const output = jpModel.get(i);

            switch (output.type) {
                case 'execute_result':
                case 'display_data':
                case 'update_display_data':
                    const mimeBundle = {};
                    // const oldMimeBundle = this.mimeHashes[i];
                    // if (!oldMimeBundle || Object.keys(output.data).length != Object.keys(oldMimeBundle).length) {
                    //     changed = true;
                    // }
                    const bundleIterator = iterItems(output.data);
                    let item;
                    while (item = bundleIterator.next()) {
                        const [mimeType, mimeData] = item;
                        const blobData = new BlobData( {data: mimeData as PartialJSONValue} );
                        await blobData.computeHash();

                        // const oldBlobHash = oldMimeBundle[mimeType];
                        // if (!oldBlobHash || blobData.hash != oldBlobHash) {
                        //     changed = true;
                        // }
                        if (! this.history.blobs[blobData.hash]) {
                            this.history.blobs[blobData.hash] = blobData;
                        }
                        mimeBundle[mimeType] = blobData.hash;
                    }
                    // if (mimeBundle != this.mimeHashes[i]) {
                    //     changed = true;
                    // }
                    mimeHashes.push(mimeBundle);

                    const outputJSON = output.toJSON();
                    delete outputJSON.data;
                    // if (!oldOutput || outputJSON != oldOutput) {
                    //     changed = true;
                    // }
                    outputs.push(outputJSON);
                    break;
                default:
                    // if (this.mimeHashes != null) {
                    //     changed = true;
                    // }
                    mimeHashes.push(null);
                    const newOutput = output.toJSON();
                    // if (!oldOutput || oldOutput != newOutput) {
                    //     changed = true;
                    // }
                    outputs.push(newOutput);
                    break;
            }
        }

        if (jsonStableStringify(outputs) != jsonStableStringify(this.raw) 
            || jsonStableStringify(mimeHashes) != jsonStableStringify(this.mimeHashes)) {
            changed = true;
        }
        if (changed) {
            console.log("OUTPUT CHANGED", this.id, outputs, this.raw, mimeHashes, this.mimeHashes);
            // different number of outputs
            const newVersion = new OutputVersion(this.history, {
                raw: outputs,
                mimeHashes: mimeHashes,
            });
            return newVersion;
        }
        console.log("OUTPUT UNCHANGED", this.id);
        return null;
    }

    public createJupyterModel(contentFactory: CodeCellModel.IContentFactory): IOutputAreaModel {
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
        console.log("CREATING OUTPUT AREA:", outputsData);
        return contentFactory.createOutputArea({ values: outputsData });
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
        return new OutputVersion(history, jsn);
    }
}