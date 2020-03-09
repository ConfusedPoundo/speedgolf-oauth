// server.js -- An Express.js web server for serving a React.js app that
// supports GitHub OAuth authentication.
//Uses ES6 syntax! We transpile it using Babel. Please see this tutorial:
//https://medium.com/@wlto/how-to-deploy-an-express-application-with-react-front-end-on-aws-elastic-beanstalk-880ff7245008

///////////////////
//MONGOOSE SET-UP//
///////////////////
import mongoose, { Collection } from 'mongoose';
const connectStr = 'mongodb://localhost/appdb';

//Open connection to database
mongoose.connect(connectStr, {useNewUrlParser: true, useUnifiedTopology: true})
  .then(
    () =>  {console.log(`Connected to ${connectStr}.`)},
    err => {console.error(`Error connecting to ${connectStr}: ${err}`)}
  );

//Define schema that maps to a document in the Users collection in the appdb
//database.
const Schema = mongoose.Schema;

const roundSchema = new Schema({
  date: {type: Date, required: true},
  course: {type: String, required: true},
  type: {type: String, required: true, enum: ['practice','tournament']},
  holes: {type: Number, required: true, min: 1, max: 18},
  strokes: {type: Number, required: true, min: 1, max: 300},
  minutes: {type: Number, required: true, min: 1, max: 240},
  seconds: {type: Number, required: true, min: 0, max: 60},
  SGS: {type: Number, 
        default: function(){return (this.strokes * 60) + (this.minutes * 60) + this.seconds},
        set: function(){return (this.strokes * 60) + (this.minutes * 60) + this.seconds}},
  notes: {type: String, required: true}
});

const userSchema = new Schema({
  id: {type: String, required: true}, //unique identifier for user
  password: String, //unencrypted password (for now!)
  displayName: {type: String, required: true}, //Name to be displayed within app
  authStrategy: {type: String, required: true}, //strategy used to authenticate, e.g., github, local
  profileImageUrl: {type: String, required: true}, //link to profile image
  securityQuestion: String,
  securityAnswer: {type: String, required: function() {return this.securityQuestion ? true: false}},
  rounds: [roundSchema]
});

//Convert schema to model
const User = mongoose.model("User",userSchema); 
//We can use User to read from and write to the 'users' collection of the appdb
//This is by convention. From https://mongoosejs.com/docs/models.html:
//When creating a model from a schema, "Mongoose automatically looks for the 
//plural, lowercased version of your model name [in the first paramater]." 
//It then writes to that collection in the database to which you are connected.
//If that collection does not yet exist, it is automatically created when the
//first document is written!

///////////////////
//PASSPORT SET-UP//
///////////////////
const LOCAL_PORT = 4001;
const DEPLOY_URL = "http://localhost:" + LOCAL_PORT;
import passport from 'passport';
import passportGithub from 'passport-github'; 
const GithubStrategy = passportGithub.Strategy;
passport.use(new GithubStrategy({
    clientID: "1b903fd9129642776b3c",
    clientSecret: "1e54162ecb7230eca9d26cc6484636e561e4d838",
    callbackURL: DEPLOY_URL + "/auth/github/callback"
  },
  //The following function is called after user authenticates with github
  async (accessToken, refreshToken, profile, done) => {
    console.log("User authenticated through GitHub! In passport callback.")
    //Our convention is to build userId from username and provider
    const userId = `${profile.username}@${profile.provider}`;
    //See if document with this userId exists in database 
    let currentUser = await User.findOne({id: userId});
    if (!currentUser) { //if not, add this user to the database
        currentUser = await new User({
        id: userId,
        displayName: profile.username,
        authStrategy: profile.provider,
        profileImageUrl: profile.photos[0].value
      }).save();
    }
    return done(null,currentUser);
  }
));

import passportLocal from 'passport-local';
const LocalStrategy = passportLocal.Strategy;
passport.use(new LocalStrategy({passReqToCallback: true},
  //Called when user is attempting to log in with username and password. 
  //userId contains the email address entered into the form and password
  //contains the password entered into the form.
  async (req, userId, password, done) => {
    let thisUser;
    try {
      thisUser = await User.findOne({id: userId});
      if (thisUser) {
        if (thisUser.password === password) {
          return done(null, thisUser);
        } else {
          req.authError = "The password is incorrect. Please try again or reset your password.";
          return done(null, false)
        }
      } else { //userId not found in DB
        req.authError = "There is no account with email " + userId + ". Please try again.";
        return done(null, false);
      }
    } catch (err) {
      return done(err);
    }
  }
));
  
//Serialize the current user to the session
passport.serializeUser((user, done) => {
  console.log("In serializeUser.");
  console.log("Contents of user param: " + JSON.stringify(user));
  done(null,user.id);
});

//Deserialize the current user from persistent storage to
//the current session.
passport.deserializeUser(async (userId, done) => {
  console.log("In deserializeUser.");
  console.log("Contents of user param: " + userId);
  let thisUser;
  try {
    thisUser = await User.findOne({id: userId});
    if (thisUser) {
      console.log("User with id " + userId + " found in DB. User object will be available in server routes as req.user.")
      done(null,thisUser);
    } else {
      done(new error("Error: Could not find user with id " + userId + " in DB, so user could not be deserialized to session."));
    }
  } catch (err) {
    done(err);
  }
});

//////////////////////
//EXPRESS APP SET-UP//
/////////////////////
import session from 'express-session';
import path from 'path';
const PORT = process.env.HTTP_PORT || LOCAL_PORT;
import express from 'express';
import {md5} from './md5.js';

const app = express();
app
  .use(session({secret: "speedgolf2020", 
                resave: false,
                saveUninitialized: false,
                cookie: {maxAge: 1000 * 60}}))
  .use(express.static(path.join(__dirname,"client/build")))
  .use(passport.initialize())
  .use(passport.session())
  .use(express.json())
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

///////////////////////////////////////////////////////////////////
//EXPRESS APP ROUTES FOR USER AUTHENTICATION & ACCOUNT MANAGEMENT//
///////////////////////////////////////////////////////////////////

//AUTHENTICATE route (GET): Uses passport to authenticate with GitHub.
//Should be accessed when user clicks on 'Login with GitHub' button on 
//Log In page.
app.get('/auth/github', passport.authenticate('github'));

//CALLBACK route (GET):  GitHub will call this route after the
//OAuth authentication process is complete.
//req.isAuthenticated() tells us whether authentication was successful.
app.get('/auth/github/callback', passport.authenticate('github', { failureRedirect: '/' }),
  (req, res) => {
    console.log("auth/github/callback reached.")
    res.redirect('/'); //sends user back to app; req.isAuthenticated() indicates status
  }
);

//LOGOUT route (GET): Use passport's req.logout() method to log the user out and
//redirect the user to the main app page. req.isAuthenticated() is toggled to false.
app.get('/auth/logout', (req, res) => {
    console.log('/auth/logout reached. Logging out');
    req.logout();
    res.redirect('/');
});

//AUTH TEST route (GET): Tests whether user was successfully authenticated.
//Should be called from the React.js client to set up app state.
app.get('/auth/test', (req, res) => {
    console.log("auth/test reached.");
    const isAuth = req.isAuthenticated();
    if (isAuth) {
        console.log("User is authenticated");
        console.log("User object in req.user: " + JSON.stringify(req.user));
    } else {
        //User is not authenticated.
        console.log("User is not authenticated");
    }
    //Return JSON object to client with results.
    res.json({isAuthenticated: isAuth, user: req.user});
});

//LOGIN route (POST): Attempts to log in user using local strategy
app.post('/login', 
  passport.authenticate('local', { failWithError: true }),
  (req, res) => {
    console.log("/login route reached: successful authentication.");
    res.status(200).send("Login successful");
    //Assume client will redirect to '/' route to deserialize session
  },
  (err, req, res, next) => {
    console.log("/login route reached: unsuccessful authentication");
    //res.sendStatus(401);
    if (req.authError) {
      console.log("req.authError: " + req.authError);
      res.status(401).send(req.authError);
    } else {
      res.status(401).send("Unexpected error occurred when attempting to authenticate. Please try again.");
    }
  });

  //NEWACCOUNT route (POST): Attempts to add a new user account using local strategy
  app.post('/newaccount',  async (req, res, next) => {
    console.log("in /newaccont route with body = " + JSON.stringify(req.body));
    if (!req.hasOwnProperty("body") || !req.body.hasOwnProperty("userId") || 
        !req.body.hasOwnProperty("password")) {
      //Body does not contain correct properties
      return res.status(401).send("POST request for new account formulated incorrectly. " + 
        "It must contain 'userId' and 'password' fields.")
    }
    let thisUser;
    try {
      thisUser = await User.findOne({id: req.body.userId});
      if (thisUser) { //account already exists
        res.status(401).send("There is already an account with email '" + req.body.userId + "'.  Please choose a different email.");
      } else { //account available -- add to database
        thisUser = await new User({
          id: req.body.userId,
          password: req.body.password,
          displayName: req.body.userId,
          authStrategy: 'local',
          profileImageUrl: `https://www.gravatar.com/avatar/${md5(req.body.userId)}`,
          securityQuestion: req.body.securityQuestion,
          securityAnswer: req.body.securityAnswer
        }).save();
        return res.status(200).send("New account for '" + req.body.userId + "' successfully created.");
      }
    } catch (err) {
      console.log("Error occurred when adding or looking up user in database.")
      return next(err);
    }
  });

  //ACCOUNTEXISTS route (GET): Checks whether account with value of query param userId
  //exists, returning true if so, false otherwise. Note that we pass the
  //result as the 'result' property of a JSON object.
  app.get('/accountexists', async(req, res, next) => {
    console.log("in /accountexists route with query params = " + JSON.stringify(req.query));
    if (!req.query.hasOwnProperty("userId")) {
      //Request does not contain correct query parameters
      return res.status(401).send("GET request for accountexists route is improperly formatted." +
                                  " It needs a 'userId' query parameter.")
    }
    let thisUser;
    try {
      thisUser = await User.findOne({id: req.query.userId});
      res.status(200).json({result: thisUser != null});
    } catch (err) {
      console.log("Error occurred when looking up or accessing user in database.")
      return next(err);
    }
  });

  //SECURITYQUESTION route (GET): Returns security question associated with user
  //account with id === req.body.userId, if account exists. Otherwise returns
  //message.
  app.get('/securityquestion', async(req, res, next) => {
    console.log("in /securityquestion route with query params = " + JSON.stringify(req.query));
    if (!req.query.hasOwnProperty("userId")) {
      //Request does not contain correct query parameters
      return res.status(401).send("GET request for security question is improperly formatted." +
                                  " It needs a 'userId' query parameter.")
    }
    let thisUser;
    try {
      thisUser = await User.findOne({id: req.query.userId});
      if (!thisUser) { //now such account exists
        res.status(401).send("There is no account associated with email '" + req.query.userId + "'.");
      } else { //account exists -- fetch securityQuestion
        return res.status(200).send(thisUser.securityQuestion);
      }
    } catch (err) {
      console.log("Error occurred when looking up or accessing user in database.")
      return next(err);
    }
  });

  //VERIFYSECURITYANSWER route (GET): Returns true if the answer provided as a
  //query param is the correct answer to the security question of the acount
  //associated with userId, false otherwise. Note that result is returned within
  //JSON object
  app.get('/verifysecurityanswer', async(req, res, next) => {
    console.log("in /verifysecurityanswer route with query params = " + JSON.stringify(req.query));
    if (!req.query.hasOwnProperty("userId") || !req.query.hasOwnProperty("answer")) {
      //Request does not contain correct query parameters
      return res.status(401).send("GET request for verifysecurityanswer is improperly formatted." +
                                  " It needs 'userId' and 'answer' query parameters.")
    }
    let thisUser;
    try {
      thisUser = await User.findOne({id: req.query.userId});
      if (!thisUser) { //now such account exists
        res.status(401).send("There is no account associated with email '" + req.query.userId + "'.");
      } else { //account exists -- return whether answer matches answer on file
        return res.status(200).json({result: req.query.answer === thisUser.securityAnswer});
      }
    } catch (err) {
      console.log("Error occurred when looking up or accessing user in database.")
      return next(err);
    }
  });

  //RESETPASSWORD route (POST): Change the user's password. The message
  //body is a JSON object containing three fields: userId, securityAnswer and
  //newPassword. If securityAnswer does not match the one on file for userId,
  //the request fails. Otherwise, the password is updated.
  app.post('/resetpassword',  async (req, res, next) => {
    console.log("in /resetpassword route with body = " + JSON.stringify(req.body));
    if (!req.body.hasOwnProperty("userId") || 
        !req.body.hasOwnProperty("answer") || 
        !req.body.hasOwnProperty("newPassword")) {
      //Body does not contain correct properties
      return res.status(401).send("POST request for /resetpassword formulated incorrectly." +
        "Its body must contain 'userId', 'answer', and 'newPassword' fields.")
    }
    let thisUser;
    try {
      thisUser = await User.findOne({id: req.body.userId});
      if (!thisUser) { //account already exists
        res.status(401).send("There is no account with email '" + req.body.userId + "'.");
      } else if (thisUser.authStrategy != "local") {
        res.status(401).send("Cannot reset password on account with userId " + req.body.userId +
          ". The user does not have a local account. ");
      } else if (thisUser.securityAnswer != req.body.answer) { //security answer incorrect 
        res.status(401).send("Password not reset because security answer does not match answer on file.");
      } else { //Can try to update password
        try {
          let status = await User.updateOne({id: req.body.userId},{password: req.body.newPassword});
          if (status.nModified != 1) { //Should never happen!
            res.status(401).send("User account exists in database but password could not be updated.");
          } else {
            res.status(200).send("User password successfully updated.")
          }
        } catch (err) {
          console.log("Error occurred when updating user password in database.")
          return next(err);
        }
      }
    } catch (err) {
      console.log("Error occurred when looking up user in database.")
      return next(err);
    }
  });

///////////////////////////////////////////
//EXPRESS APP ROUTES FOR ROUNDS CRUD OPS //
///////////////////////////////////////////

//ADDROUND route (POST): Given a JSON object containing data for a new round, add the
//round to the database
app.post('/addround', async (req, res, next) => {
  console.log("in /addround route with body = " + JSON.stringify(req.body));
  if (!req.body.hasOwnProperty("userId") ||
      !req.body.hasOwnProperty("date") || 
      !req.body.hasOwnProperty("course") || 
      !req.body.hasOwnProperty("type") ||
      !req.body.hasOwnProperty("holes") || 
      !req.body.hasOwnProperty("strokes") ||
      !req.body.hasOwnProperty("minutes") ||
      !req.body.hasOwnProperty("seconds") || 
      !req.body.hasOwnProperty("notes")) {
    //Body does not contain correct properties
    return res.status(401).send("POST request for /addround formulated incorrectly." +
      "Its body must contain userId + all 9 required fields.")
  }
  let newRound = {...req.body};
  delete newRound.userId; //userId not part of round schema
  try {
    console.log(" in addround/ with userId = '" + req.body.userId + "' and new round = " 
      + JSON.stringify(newRound));
    let status = await User.updateOne(
    {id: req.body.userId},
    {$push: {rounds: newRound}});
    if (status.nModified != 1) { //Should never happen!
      res.status(401).send("Unexpected error occurred when adding round to database. Round was not added.");
    } else {
      res.status(200).send("Round successfully added to User document.");
    }
  } catch (err) {
    console.log(err);
    return res.status(401).send("Unexpected error occurred when adding round to database. Round was not added.");
  } 
});

