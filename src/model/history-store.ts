import {
  Nodey,
  NodeyCode,
  NodeyOutput,
  NodeyCodeCell,
  NodeyMarkdown,
  NodeyCell,
  NodeyNotebook
} from "./nodey";

import { VerNotebook } from "../components/notebook";

import { History } from "./history";

import { FileManager } from "../file-manager";

import { Star, UnsavedStar } from "./history-stage";

type jsn = { [id: string]: any };

export class HistoryStore {
  readonly fileManager: FileManager;
  readonly history: History;

  private _notebookHistory: NodeHistory<NodeyNotebook>;
  private _codeCellStore: NodeHistory<NodeyCodeCell>[] = [];
  private _markdownStore: NodeHistory<NodeyMarkdown>[] = [];
  private _outputStore: NodeHistory<NodeyOutput>[] = [];
  private _snippetStore: NodeHistory<NodeyCode>[] = [];

  // this is a store for temporary nodes, stored by cell and cleaned out
  // every time a save or run event occurs
  private _starStore: { [id: string]: UnsavedStar[] } = {};

  constructor(history: History, fileManager: FileManager) {
    this.history = history;
    this.fileManager = fileManager;
    this._notebookHistory = new NodeHistory<NodeyNotebook>();
  }

  get currentNotebook(): NodeyNotebook | Star<NodeyNotebook> {
    return this._notebookHistory.latest;
  }

  public getNotebook(ver: number): NodeyNotebook {
    return this._notebookHistory.versions[ver];
  }

  get cells(): NodeyCell[] {
    let notebook = this.currentNotebook;
    if (notebook instanceof Star) notebook = notebook.value;
    return notebook.cells.map(name => this.get(name) as NodeyCell);
  }

  public getHistoryOf(name: string | Nodey): NodeHistory<Nodey> {
    let typeChar: string;
    let id: number;
    let ver: string;
    if (typeof name === "string") {
      var idVal;
      [typeChar, idVal, ver] = name.split(".");
      id = parseInt(idVal);
    } else if (name instanceof Nodey) {
      typeChar = name.typeChar;
      id = name.id;
      ver = name.version;
    }

    switch (typeChar) {
      case "n":
        return this._notebookHistory;
      case "c":
        return this._codeCellStore[id];
      case "o":
        return this._outputStore[id];
      case "s":
        return this._snippetStore[id];
      case "m":
        return this._markdownStore[id];
      case "*": // a star node
        return this.getHistoryOf(idVal + "." + ver);
      case "TEMP": // an unsaved star node
        return undefined;
      default:
        throw new Error("nodey type not found" + name);
    }
  }

  getLatestOf(name: string | Nodey): Nodey | Star<Nodey> | UnsavedStar {
    let nodeHist = this.getHistoryOf(name);
    if (nodeHist === undefined && typeof name == "string") {
      // check if unsaved star
      let [typeChar, cellId, id] = name.split(".");
      if (typeChar === "TEMP") return this._starStore[cellId][parseInt(id)];
    }
    return nodeHist.latest;
  }

  getPriorVersion(name: string | Nodey): Nodey {
    if (!name) return null;
    let ver;
    if (name instanceof Nodey) ver = parseInt(name.version) - 1;
    else {
      let [, , verVal] = name.split(".");
      ver = parseInt(verVal) - 1;
    }
    let nodeHist = this.getHistoryOf(name);
    if (ver > -1) return nodeHist.versions[ver];
    else return null;
  }

  get(name: string): Nodey {
    if (!name) return null;
    //console.log("attempting to find", name);
    let [, , verVal] = name.split(".");
    let ver = parseInt(verVal);
    let nodeHist = this.getHistoryOf(name);
    return nodeHist.versions[ver];
  }

  public store(nodey: Nodey): void {
    if (nodey instanceof NodeyNotebook) {
      let id = 0;
      nodey.id = id;
      let ver = this._notebookHistory.versions.push(nodey) - 1;
      nodey.version = ver;
    } else {
      let store = this._getStoreFor(nodey);
      let history = this._makeHistoryFor(nodey);
      let id = store.push(history) - 1;
      nodey.id = id;
      let version = store[nodey.id].versions.push(nodey) - 1;
      nodey.version = version;
    }
  }

  public storeUnsavedStar(
    star: UnsavedStar,
    parent: NodeyCode | Star<NodeyCode>
  ) {
    // store in temp star store not in permanent storage
    let cell = this.getCellParent(parent);
    if (!this._starStore[cell.id]) this._starStore[cell.id] = [];
    let id = this._starStore[cell.id].push(star) - 1;
    star.cellId = cell.id + "";
    star.value.id = id;
  }

  public cleanOutStars(nodey: NodeyCell): void {
    this._starStore[nodey.id] = [];
  }

  public findMarkdown(query: string): NodeyMarkdown[] {
    let results: NodeyMarkdown[] = [];
    let text = query.toLowerCase();
    this._markdownStore.forEach(history => {
      let match = history.versions.find(
        item => item.markdown.toLowerCase().indexOf(text) > -1
      );
      if (match) results.push(match);
    });
    return results;
  }

  public findCode(query: string): NodeyCode[] {
    let results: NodeyCode[] = [];
    let text = query.toLowerCase();
    this._codeCellStore.forEach(history => {
      history.versions.find(cell => {
        let sourceText = this.history.inspector.renderNode(cell).text || "";
        if (sourceText.toLowerCase().indexOf(text) > -1) {
          results.push(cell);
          return true;
        }
        return false;
      });
    });
    return results;
  }

  public findOutput(query: string): NodeyOutput[] {
    let results: NodeyOutput[] = [];
    let text = query.toLowerCase();
    this._outputStore.forEach(history => {
      history.versions.find(output => {
        let sourceText = this.history.inspector.renderNode(output).text || "";
        if (sourceText.toLowerCase().indexOf(text) > -1) {
          results.push(output);
          return true;
        }
        return false;
      });
    });
    return results;
  }

  private _getStoreFor(nodey: Nodey): NodeHistory<Nodey>[] {
    if (nodey instanceof NodeyCodeCell) return this._codeCellStore;
    else if (nodey instanceof NodeyMarkdown) return this._markdownStore;
    else if (nodey instanceof NodeyOutput) return this._outputStore;
    else if (nodey instanceof NodeyCode) return this._snippetStore;
  }

  private _makeHistoryFor(nodey: Nodey) {
    if (nodey instanceof NodeyCodeCell || nodey instanceof NodeyMarkdown)
      return new NodeHistory<NodeyCell>();
    else if (nodey instanceof NodeyOutput)
      return new NodeHistory<NodeyOutput>();
    else if (nodey instanceof NodeyCode) return new NodeHistory<NodeyCode>();
  }

  public registerTiedNodey(nodey: NodeyCell, forceTie: string): void {
    let oldNodey = this.get(forceTie) as NodeyCell;
    let history = this.getHistoryOf(oldNodey);
    let version = history.versions.push(nodey) - 1;
    nodey.id = oldNodey.id;
    nodey.version = version;
    return;
  }

  public getCellParent(relativeTo: Nodey | Star<Nodey>): NodeyCodeCell {
    if (relativeTo instanceof Star) {
      let val = relativeTo.value;
      if (val instanceof NodeyCodeCell) return val;
      else return this.getCellParent(this.get(val.parent));
    }
    if (relativeTo instanceof NodeyCodeCell) return relativeTo;
    else if (relativeTo.parent)
      return this.getCellParent(this.get(relativeTo.parent));
  }

  public writeToFile(notebook: VerNotebook, history: History): void {
    this.fileManager.writeToFile(history, notebook);
  }

  public dump() {
    //TODO only for debug
    console.log(this._codeCellStore);
  }

  public toJSON(): jsn {
    return {
      notebook: this._notebookHistory.toJSON(),
      codeCells: this._codeCellStore.map(hist => hist.toJSON()),
      markdownCells: this._markdownStore.map(hist => hist.toJSON()),
      snippets: this._snippetStore.map(hist => hist.toJSON()),
      output: this._outputStore.map(hist => hist.toJSON())
    };
  }

  public fromJSON(data: jsn, notebook: VerNotebook) {
    this._notebookHistory.fromJSON(
      data.notebook,
      NodeyNotebook.fromJSON.bind(this, notebook)
    );
    this._codeCellStore = data.codeCells.map((item: jsn, id: number) => {
      let hist = new NodeHistory<NodeyCodeCell>();
      hist.fromJSON(item, NodeyCodeCell.fromJSON, id);
    });
    this._markdownStore = data.codeCells.map((item: jsn, id: number) => {
      let hist = new NodeHistory<NodeyMarkdown>();
      hist.fromJSON(item, NodeyMarkdown.fromJSON, id);
    });
    this._snippetStore = data.codeCells.map((item: jsn, id: number) => {
      let hist = new NodeHistory<NodeyCode>();
      hist.fromJSON(item, NodeyCode.fromJSON, id);
    });
    this._outputStore = data.codeCells.map((item: jsn, id: number) => {
      let hist = new NodeHistory<NodeyOutput>();
      hist.fromJSON(item, NodeyOutput.fromJSON, id);
    });
  }
}

/*
* Just a container for a list of nodey versions
*/
export class NodeHistory<T extends Nodey> {
  versions: T[] = [];
  private unsavedEdits: Star<T> = null;

  get latest() {
    if (this.unsavedEdits) return this.unsavedEdits;
    return this.versions[this.versions.length - 1];
  }

  get lastSaved(): Nodey {
    return this.versions[this.versions.length - 1];
  }

  get length() {
    return this.versions.length;
  }

  setLatestToStar(s: Star<T>): void {
    this.unsavedEdits = s;
  }

  discardStar() {
    this.unsavedEdits = null;
    return this.versions[this.versions.length - 1];
  }

  deStar() {
    let newNodey = this.unsavedEdits.value;
    //newNodey.created = runId;
    /*if (newNodey instanceof NodeyCode && output) {
      output.forEach(out => (newNodey as NodeyCode).addOutput(out));
    }*/
    this.unsavedEdits = null;
    this.versions.push(newNodey as T);
    newNodey.version = this.versions.length - 1;
    console.log("de-staring", newNodey, this);
    return newNodey;
  }

  toJSON() {
    return this.versions.map(node => node.toJSON());
  }

  fromJSON(data: jsn, factory: (dat: jsn) => T, id?: number) {
    this.versions = data.map((nodeDat: jsn, version: number) => {
      let nodey = factory(nodeDat);
      if (id) nodey.id = id;
      nodey.version = version;
    });
  }
}
