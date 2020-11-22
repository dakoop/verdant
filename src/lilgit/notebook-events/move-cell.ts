import { NotebookEvent } from ".";
import { CheckpointType } from "../checkpoint";
import { VerCell } from "../cell";
import { VerNotebook } from "../notebook";

export class MoveCell extends NotebookEvent {
  cell: VerCell;
  oldPos: number;
  newPos: number;

  constructor(
    notebook: VerNotebook,
    cell: VerCell,
    oldPos: number,
    newPos: number
  ) {
    super(notebook);
    this.cell = cell;
    this.oldPos = oldPos;
    this.newPos = newPos;
  }

  createCheckpoint() {
    this.checkpoint = this.history.checkpoints.generateCheckpoint(
      CheckpointType.MOVED
    );
  }

  async modelUpdate() {
    this.notebook.cells.splice(this.oldPos, 1);
    this.notebook.cells.splice(this.newPos, 0, this.cell);

    // make sure cell is moved in the model
    if (this.cell.model)
      this.history.stage.commitCellMoved(
        this.cell.model,
        this.newPos,
        this.checkpoint
      );
  }
}
