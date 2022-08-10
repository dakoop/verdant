import { Checkpoint } from "../checkpoint";
import { History } from "../history";
import { IPyHistory } from "../model/ipyhistory";
import { log, VerNotebook } from "../notebook";

// 1. event begins
// 2. trigger update to history model
// 4. event ends

export abstract class NotebookEvent {
  readonly history: History;
  readonly notebook: VerNotebook;
  checkpoint: Checkpoint;

  constructor(notebook: VerNotebook) {
    this.notebook = notebook;
    this.history = notebook.history;
  }

  public runEvent(): Promise<Checkpoint> {
    let ev = new Promise<Checkpoint>(async (accept) => {
      // create a checkpoint to record this event
      this.checkpoint = this.history.checkpoints.generateCheckpoint();

      // evaluate what updates are needed to the model caused by this event
      await this.modelUpdate();

      // any wrap-up steps specific to this event
      this.endEvent();

      // finish event and return
      accept(this.checkpoint);
    });
    return ev;
  }

  async modelUpdate() {}

  public endEvent(): void {
    const notebookPanel = this.notebook.view.panel;
    notebookPanel.context.ready.then(() => {
      log("WRITING IPYHISTORY TO METADATA");
      const model = notebookPanel.model;
      // const myData = model.metadata.get("ipyhistory") || {};
      // model.metadata.set('ipyhistory', this.history.store.toJSON());
      const history = IPyHistory.fromJupyterModel(model);
      history.persistToMetadata();
      log("DONE WRITING IPYHISTORY TO METADATA");
    });

  }
}
