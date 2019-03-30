import React, { Component } from 'react';
import { CSSTransitionGroup } from 'react-transition-group';
import TimelineSlider from './TimelineSlider';
import SpeedSlider from './SpeedSlider';

export default class SimulationControls extends Component {
  constructor(props) {
    super(props);
    this.state = { controlsVisible: false };
    this.handleClick = this.handleClick.bind(this)
  }

  handleClick() {
    this.setState({ controlsVisible: ! this.state.controlsVisible });
  }

  render() {
    return(
      <div className="simulation-controls-container">
        <button className="toggleControlsButton"
          onClick={this.handleClick}>{this.state.controlsVisible ? 'Hide Controls' : 'Show Controls'}</button>
        <div className="simulation-controls">
          <CSSTransitionGroup transitionName="controls" transitionEnterTimeout={300} transitionLeaveTimeout={300}>
          {this.state.controlsVisible && <TimelineSlider/>}
          </CSSTransitionGroup>
        </div>
        <div className="speed-slider">
          {this.state.controlsVisible && <SpeedSlider/>}
        </div>
      </div>
    )
  }
}
