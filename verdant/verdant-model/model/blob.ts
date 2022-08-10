// import { IMimeBundle } from "@jupyterlab/nbformat";
import { PartialJSONObject, PartialJSONValue } from "@lumino/coreutils";
import jsonStableStringify from "json-stable-stringify";

export type BlobHash = string;

export class BlobData {
    constructor(options: BlobData.IOptions) {
        this.hash = options.hash;
        this.data = options.data;
        if (! this.hash) this.computeHash();
    }

    public async computeHash() {
        // https://stackoverflow.com/questions/65805172/how-to-create-a-hash-with-hmacsha256-in-deno
        const encoder = new TextEncoder()
        const keyBuf = encoder.encode("passw@rd");
        
        const key = await crypto.subtle.importKey(
          "raw",
          keyBuf,
          {name: "HMAC", hash: "SHA-256"},
          true,
          ["sign", "verify"],
        )
        
        console.log("ORIG DATA:", this.data);
        const message = jsonStableStringify(this.data);
        console.log("Message:", message);
        const data = encoder.encode(message);
        const result = await crypto.subtle.sign("HMAC", key , data.buffer);
        console.log("RESULT:", result, new Uint8Array(result));
        // https://stackoverflow.com/questions/12710001/how-to-convert-uint8-array-to-base64-encoded-string
        const arr = new Uint8Array(result);
        let resultStr = "";
        for (let i = 0; i < arr.byteLength; i++) {
            resultStr += String.fromCharCode(arr[i]);
          }
        return btoa(resultStr);
    }

    public toJSON(): BlobData.IOptions {
        return {
            hash: this.hash,
            data: this.data
        }
    }

    hash: BlobHash;
    data: PartialJSONValue;
}

export namespace BlobData {
    export interface IOptions extends PartialJSONObject {
        hash?: BlobHash;
        data: PartialJSONValue;
    }

    export function fromJSON(jsn: IOptions) {
        return new BlobData(jsn);
    }
}