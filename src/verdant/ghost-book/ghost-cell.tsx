import * as React from "react";
import { History } from "../../lilgit/history/";
import { NodeyCode, Nodey } from "../../lilgit/nodey/";
import { SAMPLE_TYPE, DIFF_TYPE, Namer } from "../../lilgit/sampler/";
import { VersionSampler } from "../sampler/version-sampler";
import GhostCellOutput from "./ghost-cell-output";
import { connect } from "react-redux";
import { verdantState, focusGhostCell, showDetailOfNode } from "../redux/";
import { Checkpoint } from "../../lilgit/checkpoint/";

/* CSS Constants */
const CONTAINER = "v-Verdant-GhostBook-container";
const CONTAINER_STACK = `${CONTAINER}-stack`;

const CELL = "v-Verdant-GhostBook-cell";
const CELL_BAND = `${CELL}-band`;
const CELL_CONTAINER = `${CELL}-container`;
const CELL_CONTENT = `${CELL}-content`;

// Enum for types of cells

export type GhostCell_Props = {
  // The index of the cell
  id?: number;
  // Entire state history. Used for VersionSampler
  history?: History;
  // String id of the cell
  name: string;
  // Name of the prior cell to diff against in diffPresent case
  prior: string;
  // Whether to display diffs with present cells or prior version
  diff: DIFF_TYPE;
  // Index of the cell's output cell (for a code cell) in state.GhostCells
  output?: string;
  // Checkpoints associated with the cell
  events?: Checkpoint[];
  // On-click action
  clickEv?: () => void;
  // On-focus action
  hasFocus?: () => boolean;
  // open up detail of nodey
  showDetail: (n: Nodey) => void;
  //scroll
  scrollTo?: () => void;
  scrollFocus: string;
  inspectOn: boolean;
};

type GhostCell_State = {
  sample: string;
};

class GhostCell extends React.Component<GhostCell_Props, GhostCell_State> {
  constructor(props) {
    /* Explicit constructor to initialize state */
    // Required super call
    super(props);
    // Set state
    this.state = {
      sample: "",
    };
  }

  componentDidUpdate(prevProps: GhostCell_Props) {
    if (
      prevProps.scrollFocus != this.props.scrollFocus &&
      this.props.scrollFocus === this.props.name
    ) {
      setTimeout(() => this.props.scrollTo(), 1000);
    }
  }

  render() {
    /* Render cell */

    // Asynchronously update innerHTML if change has occurred
    this.updateSample();

    const nodey = this.props.history.store.get(this.props.name);
    if (!nodey) {
      // ERROR case
      console.log("ERROR: CAN'T FIND GHOST CELL", this.props.name);
      return null;
    }
    const active = this.props.hasFocus() ? "active" : "";
    const displayOutput: boolean =
      nodey instanceof NodeyCode && this.props.output !== undefined; // is a code cell & has associated output

    return (
      <div
        className={`${CONTAINER} ${active}`}
        onClick={() => this.props.clickEv()}
      >
        <div className={CONTAINER_STACK}>
          <div
            className="v-Verdant-GhostBook-cell-label"
            onClick={() => this.props.showDetail(nodey)}
          >
            {Namer.getCellVersionTitle(nodey)}
          </div>
          <div
            className={`${CELL_CONTAINER}${
              this.props.inspectOn ? " hoverInspect" : ""
            }`}
            onClick={() => {
              if (this.props.inspectOn) this.props.showDetail(nodey);
            }}
          >
            <div className="v-Verdant-GhostBook-cell-header" />
            <div className={`${CELL_BAND} ${active}`} />
            <div className={`${CELL_CONTENT} ${active}`}>
              <div
                className={`${CELL} ${
                  nodey.typeChar === "c" ? "code" : "markdown"
                }  ${active}`}
                dangerouslySetInnerHTML={{ __html: this.state.sample }}
              />
            </div>
          </div>
          {displayOutput ? (
            <GhostCellOutput
              name={this.props.output}
              codeCell={this.props.name}
            />
          ) : null}
        </div>
      </div>
    );
  }

  private async updateSample() {
    /* Update the sample HTML if it has changed */
    let newSample = await this.getSample();
    if (newSample.outerHTML != this.state.sample)
      this.setState({ sample: newSample.outerHTML });
  }

  private async getSample() {
    /* Get the new sample HTML */
    let nodey = this.props.history.store.get(this.props.name);
    if (!nodey) {
      // ERROR case
      console.log("ERROR: CAN'T FIND GHOST CELL", this.props.name);
      return;
    }
    let diff = this.props.diff;
    if (diff === DIFF_TYPE.CHANGE_DIFF) {
      if (this.props.events === undefined) {
        diff = DIFF_TYPE.NO_DIFF;
      } else if (this.props.events.length === 0) {
        diff = DIFF_TYPE.NO_DIFF;
      }
    }
    return VersionSampler.sample(
      SAMPLE_TYPE.DIFF,
      this.props.history,
      nodey,
      null,
      diff,
      this.props.prior
    );
  }
}

const mapStateToProps = (
  state: verdantState,
  ownProps: Partial<GhostCell_Props>
) => {
  return {
    history: state.getHistory(),
    diff: state.ghostBook.diff,
    hasFocus: () => state.ghostBook.active_cell === ownProps.name,
    scrollFocus: state.ghostBook.scroll_focus,
    inspectOn: state.artifactView.inspectOn,
  };
};

const mapDispatchToProps = (
  dispatch: any,
  ownProps: Partial<GhostCell_Props>
) => {
  return {
    clickEv: () => dispatch(focusGhostCell(ownProps.name)),
    showDetail: (n: Nodey) => dispatch(showDetailOfNode(n)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(GhostCell);
