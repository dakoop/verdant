import { NotebookEvent } from ".";
import { NodeyCell } from "../nodey";
import { IPyHistory } from "../model/ipyhistory";
import { log, VerNotebook } from "../notebook";
// import { IPyHistory } from "../model/ipyhistory";

export class RunCell extends NotebookEvent {
  nodey: NodeyCell;
  ipyhistory: IPyHistory;

  constructor(notebook: VerNotebook, nodey: NodeyCell, ipyhistory: IPyHistory) {
    super(notebook);
    this.nodey = nodey;
    this.ipyhistory = ipyhistory;
  }

  async modelUpdate() {
    console.log("RUN CELL CALLED!");
    if (this.nodey) {
      // commit the notebook if the cell has changed
      this.history.stage.markAsPossiblyEdited(this.nodey, this.checkpoint);
      this.checkpoint = await this.history.stage.commit(this.checkpoint);
    }
    
    const notebookPanel = this.notebook.view.panel;
    notebookPanel.context.ready.then(async () => {
      log("RUN CELL WRITING IPYHISTORY TO METADATA");
      const model = notebookPanel.model;
      if (! this.ipyhistory) {
        log("CREATING NEW HISTORY");
        this.ipyhistory = await IPyHistory.fromJupyterModel(model);
      } else {
        log("UPDATING HISTORY");
        await this.ipyhistory.updateFromJupyterModel(model);
      }
      log("DONE CREATING HISTORY");
      this.ipyhistory.persistToMetadata();
      log("DONE WRITING IPYHISTORY TO METADATA");
    });

    // const notebookPanel = this.notebook.view.panel;
    // notebookPanel.context.ready.then(async () => {
    //   log("WRITING IPYHISTORY TO METADATA");
    //   const model = notebookPanel.model;
    //   // const myData = model.metadata.get("ipyhistory") || {};
    //   // model.metadata.set('ipyhistory', this.history.store.toJSON());
    //   const history = await IPyHistory.fromJupyterModel(model);
    //   log("DONE CREATING HISTORY");
    //   history.persistToMetadata();
    //   log("DONE WRITING IPYHISTORY TO METADATA");
    // });

  }
}
