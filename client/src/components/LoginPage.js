import React from 'react';
import AppMode from "./../AppMode.js";
import md5 from '../md5.js';

class LoginPage extends React.Component {

    constructor(props) {
        super(props);
        //Create a ref for the email input DOM element
        this.emailInputRef = React.createRef();
        this.passwordInputRef = React.createRef();
        this.repeatPassRef = React.createRef();
        this.newUserRef = React.createRef();
        this.accountEmailRef = React.createRef();
        this.securityAnswerRef = React.createRef();
        this.resetPasswordRef = React.createRef();
        this.resetPasswordRepeatRef = React.createRef();
        this.state = {loginBtnIcon: "fa fa-sign-in",
                      loginBtnLabel: "Log In",
                      loginMsg: "",
                      githubIcon: "fa fa-github",
                      githubLabel: "Sign in with GitHub",
                      showAccountDialog: false,
                      showLookUpAccountDialog: false,
                      showSecurityQuestionDialog: false,
                      showPasswordResetDialog: false,
                      resetEmail: "",
                      resetQuestion: "",
                      resetAnswer: "",
                      accountName: "",
                      accountPassword: "",
                      accountPasswordRepeat: "",
                      accountSecurityQuestion: "",
                      accountSecurityAnswer: "",
                     };
    }

//Focus cursor in email input field when mounted
    componentDidMount() {
        this.emailInputRef.current.focus();
}

//handleLogin -- Callback function that sets up initial app state upon login.
//Note: This implements the OLD local authentication strategy that used localStorage
handleLogin = () => {
    //Stop spinner and set authStrategy to local
    this.setState({loginBtnIcon: "fa fa-sign-in",
                   loginBtnLabel: "Log In"});
    //Set current user in parent component
    //With local authentication all we have is an email
    //address; we do not have additional info
    //We'll grab profile pic from the gravatar service. User can create account
    //at http://gravatar.com and define their profile pic.
    this.props.setUser({id: this.emailInputRef.current.value,
        username:  this.emailInputRef.current.value,
        provider: "local",
        profileImageUrl: `https://www.gravatar.com/avatar/${md5(this.emailInputRef.current.value)}`});
    //Set authenticated state in parent component
    this.props.setAuthenticated(true);
    //Trigger switch to FEED mode (default app landing page)
    this.props.changeMode(AppMode.FEED);
}

//handleLoginSubmit (Passport) -- When the user clicks the login button, we want to
//initiate a login using Passport's local method. We accomplish this through a
//post request to the /login route, passing in the username and password
handleLoginSubmit = async (event) => {
    event.preventDefault();
    this.setState({loginBtnIcon: "fa fa-spin fa-spinner",
                   loginBtnLabel: "Logging In..."});
    const url = "/login?username=" + this.emailInputRef.current.value +
                "&password=" + this.passwordInputRef.current.value;
    const res = await fetch(url, {method: 'POST'}); 
    if (res.status == 401) { //Unsuccessful login: display error message and invite re-login
      //Grab textual response message
      const resText = await res.text();
      this.setState({loginBtnIcon: "fa fa-sign-in",
                     loginBtnLabel: "Log In",
                     loginMsg: resText}, () => setTimeout(this.hideErrorMsg,3000));
    }
}

//hideErrorMsg -- Clears the email and pasword field and hides the login error
//message, thus inviting a new attempt.
hideErrorMsg = () => {
    this.emailInputRef.current.value = "";
    this.passwordInputRef.current.value = "";
    this.setState({loginMsg: ""});
}

//handleLoginSubmit (OLD) -- Called when user clicks on login button. Initiate spinner
//for 1 second and call handleLogin to do the work.
handleLoginSubmitOld = (event) => {
    event.preventDefault();
    this.setState({loginBtnIcon: "fa fa-spin fa-spinner",
                   loginBtnLabel: "Logging In..."});
    this.handleLoginPassportSubmit();
}

//handleOAuthLogin -- Callback function that initiates contact with OAuth
//provider
handleOAuthLogin = (provider) => {
    window.open(`/auth/${provider}`,"_self");
}

//handleOAuthLoginClick -- Called whent the user clicks on button to
//authenticate via a third-party OAuth service. The name of the provider is
//passed in as a parameter.
handleOAuthLoginClick = (provider) => {
   this.setState({[provider + "Icon"] : "fa fa-spin fa-spinner",
                  [provider + "Label"] : "Connecting..."});
   setTimeout(() => this.handleOAuthLogin(provider),1000);
}

//checkAccountValidity -- Callback function invoked after a form element in
//the 'Create Account' dialog box changes and component state has been
//updated. We need to check whether the passwords match and whether an
//account is already associated with the email address entered. If so, we
//set a custom validity message to be displayed when the user clicks the
//'Create Account' button. Otherwise, we reset the custom validity message
//to empty so that it will NOT fire when the user clicks 'Create Account'.
checkAccountValidity = () => {
    if (this.state.accountPassword != this.state.accountPasswordRepeat) {
        //Passwords don't match
        this.repeatPassRef.current.setCustomValidity("This password must match original password.");
    } else {
        this.repeatPassRef.current.setCustomValidity("");
    }
    let data = JSON.parse(localStorage.getItem("speedgolfUserData"));
    if (data != null && data.hasOwnProperty(this.state.accountName)) {
        //The user name is already taken
        this.newUserRef.current.setCustomValidity("An account already exists under this email address. Use 'Reset password' to recover the password.");
    } else {
        this.newUserRef.current.setCustomValidity("");
    }
}
    
//handleNewAccountChange -- Called when a field in a dialog box form changes.
//Update corresponding state variable and potentially update the custom
//message.
handleNewAccountChange = (event) => {
    this.setState({[event.target.name]: event.target.value},this.checkAccountValidity);
}

//handleCreateAccount -- Triggered when user clicks on "Create Account."
//Custom data checking ensures user account under this email does not exist
//and that the rest of the info is valid. At this point, we can create 
//new object for user, save to localStorage and take user to app's landing page. 
handleCreateAccount = (event) => {
    event.preventDefault();
    let data = JSON.parse(localStorage.getItem("speedgolfUserData"));
    //Create fresh user data object for new user
    if (data == null) {
        data = {}; //create empty data object
    }
    data[this.state.accountName] = {
        accountInfo: {
        provider: "local",
        password: this.state.accountPassword,
        securityQuestion: this.state.accountSecurityQuestion,
        securityAnswer: this.state.accountSecurityAnswer
        },
        rounds: {}, 
        roundCount: 0
    };
    //Commit to localStorage:
    localStorage.setItem("speedgolfUserData",JSON.stringify(data));
    //Set current user
    this.props.setUser({id: this.state.accountName,
                        username: this.state.accountName,
                        provider: "local",
                        profileImageUrl: `https://www.gravatar.com/avatar/${md5(this.state.accountName)}`} );
    //Log in user by switching to FEED mode
    this.props.changeMode(AppMode.FEED);
}

//handleLoginChange -- Check the validity of the username (email address)
//password entered into the login page, setting the customValidity message 
//appropriately. 
handleLoginChange = (event) => {
    let thisUser = this.emailInputRef.current.value;
    let data = JSON.parse(localStorage.getItem("speedgolfUserData"));
    //Check username and password:
    if (data == null || !data.hasOwnProperty(thisUser)) { 
       this.emailInputRef.current.setCustomValidity("No account with this email address exists. Choose 'Create an account'.");
         return; //Exit the function; no need to check pw validity
     } else {
         this.emailInputRef.current.setCustomValidity("");
     }
     if (data[thisUser].accountInfo.password != this.passwordInputRef.current.value) {
        this.passwordInputRef.current.setCustomValidity("The password you entered is incorrect. Please try again or choose 'Reset your password'.");
     } else {
        this.passwordInputRef.current.setCustomValidity("");
     }
 }
 
        
    //renderAccountDialog -- Present the "create account" dialog
    renderAccountDialog = () => {
        return (
        <div className="modal" role="dialog">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h3 className="modal-title"><b>Create New Account</b>
                  <button className="close-modal-button" 
                    onClick={() => {this.setState({showAccountDialog: false})}}>
                    &times;</button>
                </h3>
              </div>
              <div className="modal-body">
                <form onSubmit={this.handleCreateAccount}>
                <label>
                    Email: 
                    <input
                    className="form-control form-text"
                    name="accountName"
                    type="email"
                    size="35"
                    placeholder="Enter Email Address"
                    pattern="[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"
                    ref={this.newUserRef}
                    required={true}
                    value={this.state.accountName}
                    onChange={this.handleNewAccountChange}
                    />
                </label>
                
                <label>
                    Password:
                    <input
                    className="form-control form-text"
                    name="accountPassword"
                    type="password"
                    size="35"
                    placeholder="Enter Password"
                    pattern="(?=^.{8,}$)((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$"
                    required={true}
                    ref={this.repeatPassRef}
                    value={this.state.accountPassword}
                    onChange={this.handleNewAccountChange}
                    />
                </label>
                
                <label>
                    Repeat Password:
                    <input
                    className="form-control form-text"
                    name="accountPasswordRepeat"
                    type="password"
                    size="35"
                    placeholder="Repeat Password"
                    required={true}
                    ref={this.repeatPassRef}
                    value={this.state.accountPasswordRepeat}
                    onChange={this.handleNewAccountChange}
                    />
                </label>
                
                <label>
                    Security Question:
                    <textarea
                    className="form-control form-text"
                    name="accountSecurityQuestion"
                    size="35"
                    placeholder="Security Question"
                    rows="2"
                    cols="35"
                    maxLength="100"
                    required={true}
                    value={this.state.accountSecurityQuestion}
                    onChange={this.handleNewAccountChange}
                    />
                </label>
                <label>
                    Answer to Security Question:
                    <textarea
                    className="form-control form-text"
                    name="accountSecurityAnswer"
                    type="text"
                    placeholder="Answer"
                    rows="2"
                    cols="35"
                    maxLength="100"
                    required={true}
                    value={this.state.accountSecurityAnswer}
                    onChange={this.handleNewAccountChange}
                    />
                </label>
                <button role="submit" className="btn btn-primary btn-color-theme form-submit-btn">
                    <span className="fa fa-user-plus"></span>&nbsp;Create Account
                </button>
                </form>
            </div>
          </div>
        </div>
    </div>
    );

}

//handleLookUpAccount: When the user clicks on the "Look Up Account" dialog box
//button, we check whether the account exists. If it does, we update the state,
//setting the resetEmail var to the email entered, hiding the current dialog box
//and showing the security question dialog box.
handleLookUpAccount = (event) => {
    event.preventDefault();
    let thisUser = this.accountEmailRef.current.value;
    let data = JSON.parse(localStorage.getItem("speedgolfUserData"));
    //Check username and password:
    if (data == null || !data.hasOwnProperty(thisUser)) { 
        alert("Sorry, there is no account associated with this email address.");
        this.accountEmailRef.current.focus();
    } else {
        this.setState({resetEmail: thisUser, 
                       resetQuestion: data[thisUser].accountInfo.securityQuestion,
                       resetAnswer: data[thisUser].accountInfo.securityAnswer,
                       showLookUpAccountDialog: false, 
                       showSecurityQuestionDialog: true});
    }
}

//renderLookUpAccountDialog -- Present a dialog box for user to enter the email address
//associated with their account in case where they want to reset password
renderLookUpAccountDialog = () => {
    return (
    <div className="modal" role="dialog">
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h3 className="modal-title"><b>Look Up Account</b>
              <button className="close-modal-button" 
                onClick={() => {this.setState({showLookUpAccountDialog: false})}}>
                &times;</button>
            </h3>
          </div>
          <div className="modal-body">
            <form onSubmit={this.handleLookUpAccount}>
            <label>
                Account Email Address: 
                <input
                className="form-control form-text"
                type="email"
                size="35"
                placeholder="Enter Email Address"
                pattern="[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"
                ref={this.accountEmailRef}
                required={true}
                />
            </label>
            <button type="submit" className="btn btn-primary btn-color-theme form-submit-btn">
                <span className="fa fa-search"></span>&nbsp;Look Up Account
            </button>
            </form>
        </div>
      </div>
    </div>
  </div>
  );  
}

//handleSecurityQuestionResponse: When the user clicks on the "Check Answer" dialog box
//button, we check whether the security question answer is correct. If it is,
//present dialog box for resetting the password. 
handleSecurityQuestionResponse = (event) => {
    event.preventDefault();
    let response = this.securityAnswerRef.current.value;
    if (response != this.state.resetAnswer) { 
        alert("Sorry, that is not the correct answer to the security question.");
        this.securityAnswerRef.current.select();
    } else {
        this.setState({showSecurityQuestionDialog: false, 
                       showPasswordResetDialog: true});
    }
}

//renderSecurityQuestionDialog -- Present a dialog box for user to enter answer
//to their security question.
renderSecurityQuestionDialog = () => {
    return (
    <div className="modal" role="dialog">
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h3 className="modal-title"><b>Answer Security Question</b>
              <button className="close-modal-button" 
                onClick={() => {this.setState({resetEmail: "", 
                                 resetQuestion: "",
                                 resetAnswer: "",
                                 showSecurityQuestionDialog: false})}}>
                &times;</button>
            </h3>
          </div>
          <div className="modal-body">
            <form onSubmit={this.handleSecurityQuestionResponse}>
            <label>
                Security Question: 
                <textarea
                readOnly={true}
                value={this.state.resetQuestion}
                className="form-control form-text"
                rows="3"
                cols="35"
                />
            </label>
            <label>
                Security Answer: 
                <textarea
                className="form-control form-text"
                placeholder="Enter Security Question Answer"
                ref={this.securityAnswerRef}
                rows="3"
                cols="35"
                />
            </label>
            <button role="submit" className="btn btn-primary btn-color-theme form-submit-btn">
                <span className="fa fa-check"></span>&nbsp;Verify Answer
            </button>
            </form>
        </div>
      </div>
    </div>
  </div>
  );
}

//handleResetPassword: When the user clicks on the "Reset Password" dialog box
//button, we need check whether the passwords match. If they do,
//we reset the password and log the user in. 
handleResetPassword = (event) => {
    event.preventDefault();
   
    if (this.resetPasswordRef.current.value != this.resetPasswordRepeatRef.current.value) { 
        alert("Sorry, The passwords you entered do not match. Please try again.");
        this.resetPasswordRepeatRef.current.select();
    } else { //Reset password and log user in
        let data = JSON.parse(localStorage.getItem("speedgolfUserData"));
        data[this.state.resetEmail].accountInfo.password = this.resetPasswordRef.current.value;
        localStorage.setItem("speedgolfUserData",JSON.stringify(data));
        this.props.setUser({id: this.state.resetEmail,
                            username: this.state.resetEmail,
                            provider: "local",
                            profileImageUrl: `https://www.gravatar.com/avatar/${md5(this.state.resetEmail)}`});
        this.props.changeMode(AppMode.FEED);
        this.setState({resetEmail: "", 
                       resetQuestion: "",
                       resetAnswer: "",
                       showPasswordResetDialog: false});
    }
}

//renderPasswordResetDialog -- Present a dialog box for user to enter answer
//to their security question.
renderPasswordResetDialog = () => {
    return (
    <div className="modal" role="dialog">
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h3 className="modal-title"><b>Reset Password</b>
              <button className="close-modal-button" 
                onClick={() => {this.setState({resetEmail: "", 
                                 resetQuestion: "",
                                 resetAnswer: "",
                                 showResetPasswordDialog: false})}}>
                &times;</button>
            </h3>
          </div>
          <div className="modal-body">
            <form onSubmit={this.handleResetPassword}>
            <label>
                New Password: 
                <input
                type="password"
                placeholder="Enter new password"
                pattern="(?=^.{8,}$)((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$"
                className="form-control form-text"
                ref={this.resetPasswordRef}
                />
            </label>
            <label>
                Repeat New Password: 
                <input
                type="password"
                placeholder="Repeat new password"
                className="form-control form-text"
                ref={this.resetPasswordRepeatRef}
                />
            </label>
            <button role="submit" className="btn btn-primary btn-color-theme form-submit-btn">
                <span className="fa fa-key"></span>&nbsp;Reset Password
            </button>
            </form>
        </div>
      </div>
    </div>
  </div>
  );
}

//Render the Login Page
render() {
    return(
    <div id="login-mode-div" className="padded-page">
    <center>
        <h1 />
        <form onSubmit={this.handleLoginSubmit}>
        <label htmlFor="emailInput" style={{ padding: 0, fontSize: 24 }}>
            Email:
            <input
            ref={this.emailInputRef}
            className="form-control login-text"
            type="email"
            placeholder="Enter Email Address"
            id="emailInput"
            pattern="[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"
            required={true}
            />
        </label>
        <p />
        <label htmlFor="passwordInput" style={{ padding: 0, fontSize: 24 }}>
            Password:
            <input
            ref={this.passwordInputRef}
            className="form-control login-text"
            type="password"
            placeholder="Enter Password"
            required={true}
            />
        </label>
        <p className="bg-danger login-error-msg-text">{this.state.loginMsg}</p>
        <button
            type="submit"
            className="btn-color-theme btn btn-primary btn-block login-btn">
            <span className={this.state.loginBtnIcon}/>
            &nbsp;{this.state.loginBtnLabel}
        </button>
        <br />
        <p><button type="button" className="btn btn-link login-link" 
             onClick={() => {this.setState({showAccountDialog: true});}}>Create an account</button> | 
           <button type="button" className="btn btn-link login-link"
             onClick={() => {this.setState({showLookUpAccountDialog: true});}}>Reset your password</button>
        </p>
        <p></p>
            <button type="button" className="btn btn-github"
               onClick={() => this.handleOAuthLoginClick("github")}>
              <span className={this.state.githubIcon}></span>&nbsp;{this.state.githubLabel}
            </button>
        <p></p>
        <p>
            <i>Version CptS 489 Sp20 React Oauth with GitHub</i>
        </p>
        <p>
            <i>© 2020 Professor of Speedgolf. All rights reserved.</i>
        </p>
        </form>
        {this.state.showAccountDialog ? this.renderAccountDialog() : null}
        {this.state.showLookUpAccountDialog ? this.renderLookUpAccountDialog() : null}
        {this.state.showSecurityQuestionDialog ? this.renderSecurityQuestionDialog() : null}
        {this.state.showPasswordResetDialog ? this.renderPasswordResetDialog() : null}
    </center>
    </div>
    )
}
}

export default LoginPage;
