import { NotebookEvent } from ".";
import { IPyHistory } from "../model/ipyhistory";
import { VerNotebook } from "../notebook";

export class SaveNotebook extends NotebookEvent {
  constructor(notebook: VerNotebook, ipyhistory: IPyHistory) {
    super(notebook);    
    this.ipyhistory = ipyhistory;
  }
    async modelUpdate() {
    // look through cells for potential unsaved changes
    this.notebook.cells.forEach((cell) => {
      if (cell.model) {
        this.history.stage.markAsPossiblyEdited(cell.model, this.checkpoint);
      }
    });

    // !!! HACK: avoiding saving duplicate images assuming if it hasn't been
    // run it can't be a new output
    this.checkpoint = await this.history.stage.commit(this.checkpoint, {
      ignore_output: true,
    });
  }

  async endEvent() {
    super.endEvent();
    // const notebookPanel = this.notebook.view.panel;
    // notebookPanel.context.ready.then(async () => {
    //   log("WRITING IPYHISTORY TO METADATA");
    //   const model = notebookPanel.model;
    //   if (! this.ipyhistory) {
    //     log("CREATING NEW HISTORY");
    //     this.ipyhistory = await IPyHistory.fromJupyterModel(model);
    //   } else {
    //     log("UPDATING HISTORY");
    //     await this.ipyhistory.updateFromJupyterModel(model);
    //   }
    //   log("DONE CREATING HISTORY");
    //   this.ipyhistory.persistToMetadata();
    //   log("DONE WRITING IPYHISTORY TO METADATA");
    // });

    this.notebook.saveToFile();
  }

  ipyhistory: IPyHistory = null;
}
