import * as React from "react";
import { Nodey, NodeyOutput, NodeyCode } from "../../../lilgit/nodey";
import VersionDetail from "./version-detail";
import VersionHeader from "./version-header";
import { Namer } from "../../../lilgit/sampler";
import { History } from "../../../lilgit/history";
import { verdantState, showDetailOfNode } from "../../redux/index";
import { connect } from "react-redux";
import { BigChevronRightIcon, BigChevronLeftIcon } from "../../icons/";

export type VersionPair_Props = {
  history: History;
  showDetails: (n: Nodey) => void;
  dependent: Nodey | Nodey[];
  nodey: Nodey | Nodey[];
};

class VersionPair extends React.Component<
  VersionPair_Props,
  { open: boolean }
> {
  constructor(props: VersionPair_Props) {
    super(props);
    this.state = { open: false };
  }

  componentDidUpdate(prevProps: VersionPair_Props) {
    // if the data we're looking at changes, reset the view open/close state
    let nameA;
    if (Array.isArray(prevProps.nodey)) nameA = prevProps.nodey[0].artifactName;
    else nameA = prevProps.nodey.artifactName;

    let nameB;
    if (Array.isArray(this.props.nodey))
      nameB = this.props.nodey[0].artifactName;
    else nameB = this.props.nodey.artifactName;

    if (nameA && nameB && nameA != nameB) this.setState({ open: false });
  }

  render() {
    return (
      <div
        className={`v-VerdantPanel-details-versionPair${
          this.state.open ? " open" : ""
        }`}
      >
        <div
          className={`v-VerdantPanel-details-versionPair-col left${
            this.state.open ? " open" : ""
          }`}
        >
          {this.showLeft()}
        </div>
        {this.showRight()}
      </div>
    );
  }

  showLeft() {
    if (this.state.open) return this.showLeftOpen();
    return this.showLeftClosed();
  }

  showRight() {
    if (this.state.open) return this.showRightOpen();
    return null;
  }

  showRightOpen() {
    // if open, show dependencies in list
    let vers = [];
    if (Array.isArray(this.props.dependent)) vers = this.props.dependent;
    else vers.push(this.props.dependent);

    return (
      <div
        className={`v-VerdantPanel-details-versionPair-col right${
          this.state.open ? " open" : ""
        }`}
      >
        <div className="v-VerdantPanel-details-version-header dependent open">
          <div onClick={() => this.setState({ open: false })}>
            <BigChevronLeftIcon />
          </div>
        </div>
        {vers.map((v, i) => (
          <VersionDetail key={i} nodey={v} />
        ))}
      </div>
    );
  }

  showLeftOpen() {
    // if open, show versions in a plain list
    let vers = [];
    if (Array.isArray(this.props.nodey)) vers = this.props.nodey;
    else vers.push(this.props.nodey);

    return vers.map((v, i) => <VersionDetail key={i} nodey={v} />);
  }

  showLeftClosed() {
    // if closed, just show all versions the same way
    let vers = [];
    if (Array.isArray(this.props.nodey)) vers = this.props.nodey;
    else vers.push(this.props.nodey);

    return vers.map((v, i) => {
      return (
        <div key={i}>
          <div className="v-VerdantPanel-details-versionPair-header">
            <VersionHeader nodey={v} />
            {this.closedRightHeader()}
          </div>
          <VersionDetail nodey={v} no_header={true} />
        </div>
      );
    });
  }

  closedRightHeader() {
    let vers = [];
    if (Array.isArray(this.props.dependent)) vers = this.props.dependent;
    else vers.push(this.props.dependent);

    return (
      <div className="v-VerdantPanel-details-version-header dependent closed">
        <div className="v-VerdantPanel-details-version-header-labelRow dependent">
          {this.describeDependent(vers)}
          <div onClick={() => this.setState({ open: true })}>
            <BigChevronRightIcon />
          </div>
        </div>
      </div>
    );
  }

  describeDependent(vers: Nodey[]) {
    // Nodey Output
    if (vers[0] instanceof NodeyOutput) {
      if (vers.length > 1)
        return (
          <span>
            <b>{vers.length}</b>
            <span>{" outputs"}</span>
          </span>
        );
      else
        return (
          <span>
            {"output "}
            <span
              className="verdant-link"
              onClick={() => this.props.showDetails(vers[0])}
            >
              {Namer.getOutputVersionTitle(
                vers[0] as NodeyOutput,
                this.props.history
              )}
            </span>
          </span>
        );
    }
    // Nodey Code
    else if (vers[0] instanceof NodeyCode) {
      return (
        <span>
          {"code "}
          <span
            className="verdant-link"
            onClick={() => this.props.showDetails(vers[0])}
          >
            {Namer.getCellVersionTitle(vers[0])}
          </span>
        </span>
      );
    }
  }
}

const mapDispatchToProps = (dispatch: any) => {
  return {
    showDetails: (n: Nodey) => {
      dispatch(showDetailOfNode(n));
    },
  };
};

const mapStateToProps = (state: verdantState) => {
  return {
    history: state.getHistory(),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(VersionPair);
