//Rounds -- A parent component for the app's "rounds" mode.sidemenu-user
//Manages the rounds data for the current user and conditionally renders the
//appropriate rounds mode page based on App's mode, which is passed in as a
//prop.

import React from 'react';
import RoundsTable from './RoundsTable.js';
import RoundForm from './RoundForm.js';
import FloatingButton from './FloatingButton.js';
import AppMode from '../AppMode.js';

class Rounds extends React.Component {

    //Initialize a Rounds object based on local storage
    constructor(props) {
          super(props);
          let data = JSON.parse(localStorage.getItem("speedgolfUserData")); 
          this.state = {rounds: data[this.props.user.id].rounds,
                        roundCount: data[this.props.user.id].roundCount,
                        deleteId: "",
                        editId: ""};          
    }

    //setDeleteId -- Capture in this.state.deleteId the unique id of the item
    //the user is considering deleting.
    setDeleteId = (val) => {
        this.setState({deleteId: val});
    }

    //setEditId -- Capture in this.state.editId the unique id of the item
    //the user is considering editing.
    setEditId = (val) => {
        this.setState({editId: val});
    }

    //editRound -- Given an object newData containing updated data on an
    //existing round, update the current user's round uniquely identified by
    //this.state.editId, commit to local storage, reset editId to empty and
    //toggle the mode back to AppMode.ROUNDS since the user is done editing the
    //round. 
    editRound = (newData) => {
        let data = JSON.parse(localStorage.getItem("speedgolfUserData")); 
        let newRounds = this.state.rounds;
        newRounds[this.state.editId] = newData;
        data[this.props.user.id].rounds = newRounds;
        localStorage.setItem("speedgolfUserData",JSON.stringify(data));
        this.setState({rounds: newRounds, editId: ""});
        this.props.changeMode(AppMode.ROUNDS);
    }

    //deleteRound -- Delete the current user's round uniquely identified by
    //this.state.deleteId, commit to local storage, and reset deleteId to empty.
    deleteRound = () => {
        let data = JSON.parse(localStorage.getItem("speedgolfUserData"));
        let newRounds = this.state.rounds;
        delete newRounds[this.state.deleteId];
        data[this.props.user.id].rounds = newRounds;
        localStorage.setItem("speedgolfUserData",JSON.stringify(data));
        this.setState({rounds: newRounds, deleteId: ""});
    }

    //addRound -- Given an object newData containing a new round, add the round
    //to the current user's list of rounds, commit to local storage, and toggle
    //the mode back to AppMode.ROUNDS since the user is done adding a round.
    addRound = (newData) => {
        let data = JSON.parse(localStorage.getItem("speedgolfUserData"));
        let newRounds = this.state.rounds;
        newData.roundNum = this.state.roundCount + 1;
        newRounds[this.state.roundCount + 1] = newData;
        data[this.props.user.id].rounds = newRounds;
        data[this.props.user.id].roundCount = this.state.roundCount + 1;
        localStorage.setItem("speedgolfUserData",JSON.stringify(data));
        this.setState({rounds: newRounds, roundCount: newData.roundNum});
        this.props.changeMode(AppMode.ROUNDS);
    }

    
    //render -- Conditionally render the Rounds mode page as either the rounds
    //table, the rounds form set to obtain a new round, or the rounds form set
    //to edit an existing round.
    render() {
        switch(this.props.mode) {
            case AppMode.ROUNDS:
                return (
                  <React.Fragment>
                  <RoundsTable 
                    rounds={this.state.rounds}
                    setEditId={this.setEditId}
                    setDeleteId={this.setDeleteId}
                    deleteRound={this.deleteRound}
                    changeMode={this.props.changeMode}
                    menuOpen={this.props.menuOpen} /> 
                  <FloatingButton
                      handleClick={() => 
                        this.props.changeMode(AppMode.ROUNDS_LOGROUND)}
                      menuOpen={this.props.menuOpen}
                      icon={"fa fa-plus"} />
                  </React.Fragment>
                );
            case AppMode.ROUNDS_LOGROUND:
                return (
                    <RoundForm
                       mode={this.props.mode}
                       startData={""} 
                       saveRound={this.addRound} />
                );
            case AppMode.ROUNDS_EDITROUND:
                return (
                    <RoundForm
                      mode={this.props.mode}
                      startData={this.state.rounds[this.state.editId]} 
                      saveRound={this.editRound} />
                );
        }
    }
}    

    export default Rounds;