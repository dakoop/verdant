import { IMimeBundle } from "@jupyterlab/nbformat";
import { PartialJSONObject } from "@lumino/coreutils";

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
        
        const message = this.data.toString();
        const data = encoder.encode(message);
        const result = await crypto.subtle.sign("HMAC", key , data.buffer);
        // https://stackoverflow.com/questions/12710001/how-to-convert-uint8-array-to-base64-encoded-string
        var decoder = new TextDecoder('utf8');
        return btoa(decoder.decode(new Uint8Array(result)));
    }

    hash: BlobHash;
    data: IMimeBundle;
}

export namespace BlobData {
    export interface IOptions extends PartialJSONObject {
        hash?: BlobHash;
        data: IMimeBundle;
    }
}