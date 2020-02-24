import React from 'react';

class FloatingButton extends React.Component {
  
    render() {
      return(
        <div>
          <a className="floatbtn" onClick={(this.props.menuOpen ? null : 
             this.props.handleClick)}>
            <span className={"floatbtn-icon " + this.props.icon}></span>
          </a>
        </div>  
      );
    }
}

export default FloatingButton;