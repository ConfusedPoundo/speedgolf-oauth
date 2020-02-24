import React from 'react';
import AppMode from '../AppMode.js';

//RoundForm -- this component presents a controlled form through which the user
//can enter a new round or edit an existing round.
class RoundForm extends React.Component {
    constructor(props) {
      super(props);
      //Create date object for today, taking time zone into consideration
      let today = new Date(Date.now()-(new Date()).getTimezoneOffset()*60000);
      //store date as ISO string
      if (this.props.mode === AppMode.ROUNDS_LOGROUND) {
        //If logging a new round, the starting state is a default round with
        //today's date.
        this.state = {date:  today.toISOString().substr(0,10), 
                    course: "",
                    type: "practice",
                    holes: "18",
                    strokes: 80,
                    minutes: 50,
                    seconds: "00",
                    notes: "",
                    faIcon: "fa fa-save",
                    btnLabel: "Save Round Data"}
      } else {
        //if editing an existing round, the starting state is the round's
        //current data
        this.state = this.props.startData;
        this.state.faIcon = "fa fa-edit";
        this.state.btnLabel = "Update Round Data";
      }
  }
  
  //handleChange -- Look for changes to the seconds field, padding any entry
  //less than 10 with a 0 so that seconds are displayed properly.
  handleChange = (event) => {
      const name = event.target.name;
      if (name === "seconds") {
        this.setState({seconds: (event.target.value.length < 2 ? "0" + event.target.value : 
          event.target.value)});
      } else {
        this.setState({[name]: event.target.value});
      }
    }
  
    //handleSubmit -- When the user clicks on the button to save/update the
    //round, start the spinner and invoke the parent component's saveRound
    //method to do the actual work. Note that saveRound is set to the correct
    //parent method based on whether the user is logging a new round or editing
    //an existing round.
    handleSubmit = (event) => {
      //start spinner
      this.setState({faIcon: "fa fa-spin fa-spinner",
                     btnLabel: (this.props.mode === AppMode.ROUNDS_LOGROUND ? 
                                  "Saving..." : "Updating...")});
      //Prepare current round data to be saved
      let roundData = this.state;
      delete roundData.faIcon;
      delete roundData.btnLabel;
      //call saveRound on 1 second delay to show spinning icon
      setTimeout(this.props.saveRound,1000,roundData); 
      event.preventDefault(); 
    }
    
    //computeSGS -- properly computes speedgolf score based on the values of the
    //strokes, minutes and seconds fields. We choose not to save SGS in state
    //it can be readily computed.
    computeSGS = () => {
      return (Number(this.state.strokes) + Number(this.state.minutes)) 
                  + ":" + this.state.seconds;
    }
  
    //render -- renders the form to enter round data.
    render() {
      return (
        <div className = "padded-page">
        <form onSubmit={this.handleSubmit}>
          <center>
            <label>
              Date:
              <input name="date" className="form-control form-center" 
                type="date" value={this.state.date} onChange={this.handleChange} />
            </label>
            <p></p>
            <label>
              Course:
              <input name="course" className="form-control form-center" type="text"
                value={this.state.course} onChange={this.handleChange}
                placeholder="Course played" size="50" maxLength="50" />
            </label>
          <p></p>
          <label>Type:
          <select name="type" value={this.state.type} 
            className="form-control form-center" onChange={this.handleChange}>
            <option value="practice">Practice</option>
            <option value="tournament">Tournament</option>
          </select> 
          </label>
          <p></p>
          <label># Holes:
          <select name="holes" value={this.state.holes} 
            className="form-control form-center" onChange={this.handleChange}>
            <option value="9">9</option>
            <option value="18">18</option>
          </select> 
          </label>
          <p></p>
          <label># Strokes:
          <input name="strokes" className="form-control form-center" type="number" 
            min="9" max="200" value={this.state.strokes} 
            onChange={this.handleChange} />
          </label>
          <p></p>
          <label>Time: <br></br>
          <input name="minutes" type="number" size="3"
            min="10" max="400" value={this.state.minutes}
            onChange={this.handleChange} />:  
          <input name="seconds" type="number" size="2"
            min="0" max="60" value={this.state.seconds} onChange={this.handleChange} />
          </label>
          <p></p>
          <label>Speedgolf Score: <br></br>
              <input name="SGS" className="form-center" type="text" size="6" 
                disabled={true} value={this.computeSGS()} />
          </label>
          <p></p>
          <label>Notes:
              <textarea name="notes" className="form-control" rows="6" cols="75" 
                placeholder="Enter round notes" value={this.state.notes} onChange={this.handleChange} />
          </label>
          <p></p>
          <p></p>
          <button type="submit" style={{width: "70%",fontSize: "36px"}} 
            className="btn btn-primary btn-color-theme">
              <span className={this.state.faIcon}/>&nbsp;{this.state.btnLabel}</button>
          </center>
        </form>
        </div>
      );
    }
}

  export default RoundForm;