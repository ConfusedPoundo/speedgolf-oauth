import React from 'react';
import AppMode from '../AppMode.js';

class ModeBar extends React.Component {

    handleModeBtnClick = (newMode) => {
      if (this.props.mode != newMode) {
          this.props.changeMode(newMode);
      }
    }
  
    render() {
      return(
        <div className={"modebar" + (this.props.mode === AppMode.LOGIN ? 
          " invisible" : " visible")}>
          <a className={"modebar-btn" + 
            (this.props.mode === AppMode.FEED ? " modebar-item-selected" : "")} 
            onClick={this.props.menuOpen ? null : 
              () => this.handleModeBtnClick(AppMode.FEED)}>
            <span className="modebar-icon nonMenuItem fa fa-th-list"></span>
            <span className="modebar-text">Feed</span>
          </a>
          <a className={"modebar-btn" +
            (this.props.mode === AppMode.ROUNDS ? " modebar-item-selected" : "")} 
            onClick={this.props.menuOpen ? null : 
              () => this.handleModeBtnClick(AppMode.ROUNDS)}>
            <span className="modebar-icon fa fa-history"></span>
            <span className="modebar-text">Rounds</span>
          </a>
          <a className={"modebar-btn" +
            (this.props.mode === AppMode.COURSES ? " modebar-item-selected" : "")} 
             onClick={this.props.menuOpen ? null : 
              () => this.handleModeBtnClick(AppMode.COURSES)}>
            <span className="modebar-icon fa fa-flag"></span>
            <span className="modebar-text">Courses</span>
          </a> 
        </div>
      );
    }

}

export default ModeBar;
