import React from 'react';
import '../styles/modal.css';
import AppMode from '../AppMode.js';

class RoundsTable extends React.Component {


  constructor(props) {
    super(props);
    //confirmDelete state variable determines whether to show or hide the
    //confirm delete dialog box
    this.state = {confirmDelete: false}; 
  }

  //editRound -- Triggered when the user clicks the edit button for a given
  //round. The id param is the unique property that identifies the round.
  //Set the state variable representing the id of the round to be edited and
  //then switch to the ROUNDS_EDITROUND mode to allow the user to edit the
  //chosen round.
  editRound = (id) => {
    this.props.setEditId(id);
    this.props.changeMode(AppMode.ROUNDS_EDITROUND);
  }

  //confirmDelete -- Triggered when the user clicks on the delete button
  //associated with a given round. The id param is the unique property that
  //identifies the round. Set the state variable representing the id
  //of the item to be deleted and set the confirmDelete state variable to true
  //to force a re-render with the confirm delete modal dialog box showing.
  confirmDelete = (id) => {
    this.props.setDeleteId(id);
    this.setState({confirmDelete: true});
  }

  //doDelete -- Triggered when the user clicks on the "Yes Delete" button in
    //the confirm delete dialog box. Call upon parent component's deleteRound to
    //to actually performt he deletion of the round currently flagged for
    //deletion and toggle the confirmDelete state variable to hide the confirm
    //dialog box.
    doDelete = () => {
      this.props.deleteRound();
      this.setState({confirmDelete: false});
    }

  //cancelDelete -- Triggered when the user chooses to cancel a delete
  //operation. We just need to update state to toggle confirmDelete to false
  cancelDelete = () => {
    this.props.setDeleteId(""); 
    this.setState({confirmDelete: false});
  }

  //renderConfirmDeleteDialog: presents user with dialog to confirm deletion
  //of round. Credit: https://getbootstrap.com/docs/4.0/components/modal/
  renderConfirmDeleteDialog = () => {
      return (
        <div className="modal" role="dialog">
          <div className="modal-content">
              <div className="modal-header">
                <p className="modal-title">Confirm Round Deletion</p>
                  <button className="close-modal-button" onClick={this.cancelDelete}>
                    &times;</button>
              </div>
              <div className="modal-body">
                <h4>Are you sure that you want to delete this round?</h4>
                <div className="modal-footer">
                    <button className="btn btn-primary btn-color-scheme"
                      onClick={this.doDelete}>
                    Yes, delete round</button>
                    <button className="btn btn-secondary" 
                      onClick={this.cancelDelete}>
                    No, do not delete round</button>
                </div>
              </div>
          </div>
        </div>
      );
    }



  //renderTable -- render an HTML table displaying the rounds logged
  //by the current user and providing buttons to view/edit and delete each round.
  renderTable = () => {
    let table = [];
    for (const r in this.props.rounds) {
      table.push(
        <tr key={r}>
          <td>{this.props.rounds[r].date}</td>
          <td>{this.props.rounds[r].course}</td>
          <td>{(Number(this.props.rounds[r].strokes) + 
                Number(this.props.rounds[r].minutes)) +
                ":" + this.props.rounds[r].seconds + " (" + 
                this.props.rounds[r].strokes + 
                " in " + this.props.rounds[r].minutes + ":" + 
                this.props.rounds[r].seconds + ")"}
          </td>
          <td><button onClick={this.props.menuOpen ? null : () => this.editRound(r)}>
                <span className="fa fa-eye"></span></button></td>
          <td><button onClick={this.props.menuOpen ? null : () => this.confirmDelete(r)}>
                <span className="fa fa-trash"></span></button></td>
        </tr> 
    );
  }
  return table;
}

  //render--render the entire rounds table with header, displaying a "No
  //Rounds Logged" message in case the table is empty.
  render() {
    return(
    <div className="padded-page">
      <h1></h1>
      <table className="table table-hover">
        <thead className="thead-light">
        <tr>
          <th>Date</th>
          <th>Course</th>
          <th>Score</th>
          <th>View/Edit...</th>
          <th>Delete</th>
        </tr>
        </thead>
        <tbody>
          {Object.keys(this.props.rounds).length === 0 ? 
          <tr>
          <td colSpan="5" style={{fontStyle: "italic"}}>No rounds logged</td>
          </tr> : this.renderTable()
          }
        </tbody>
      </table>
      {this.state.confirmDelete ? this.renderConfirmDeleteDialog() : null}
    </div>
    );
  }
}

export default RoundsTable;