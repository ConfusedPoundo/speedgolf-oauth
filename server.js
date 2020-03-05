// server.js -- An Express.js web server for serving a React.js app that
// supports GitHub OAuth authentication.
//Uses ES6 syntax! We transpile it using Babel. Please see this tutorial:
//https://medium.com/@wlto/how-to-deploy-an-express-application-with-react-front-end-on-aws-elastic-beanstalk-880ff7245008

///////////////////
//MONGOOSE SET-UP//
///////////////////
import mongoose from 'mongoose';
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
const userSchema = new Schema({
  id: String, //unique identifier for user
  password: String, //unencrypted password (for now!)
  displayName: String, //Name to be displayed within app
  authStrategy: String, //strategy used to authenticate, e.g., github, local
  profileImageUrl: String //link to profile image
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

//////////////////////
//EXPRESS APP ROUTES//
//////////////////////

//AUTHENTICATE route: Uses passport to authenticate with GitHub.
//Should be accessed when user clicks on 'Login with GitHub' button on 
//Log In page.
app.get('/auth/github', passport.authenticate('github'));

//CALLBACK route:  GitHub will call this route after the
//OAuth authentication process is complete.
//req.isAuthenticated() tells us whether authentication was successful.
app.get('/auth/github/callback', passport.authenticate('github', { failureRedirect: '/' }),
  (req, res) => {
    console.log("auth/github/callback reached.")
    res.redirect('/'); //sends user back to app; req.isAuthenticated() indicates status
  }
);

//LOGOUT route: Use passport's req.logout() method to log the user out and
//redirect the user to the main app page. req.isAuthenticated() is toggled to false.
app.get('/auth/logout', (req, res) => {
    console.log('/auth/logout reached. Logging out');
    req.logout();
    res.redirect('/');
});

//AUTH TEST route: Tests whether user was successfully authenticated.
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

//LOGIN route: Attempts to log in user using local strategy
app.post('/login', 
  passport.authenticate('local', { failWithError: true }),
  (req, res) => {
    console.log("/login route reached: successful authentication.");
    //console.log("contents of req: " + JSON.stringify(req));
    //Here, we somehow need to trigger deserializeUser().
    //It would also be nice to redirect to '/', forcing a call to 
    //the /auth/test route to update app state with user info.
    //If that can't be done, I'm wondering if there's a way to send
    //back to client a JSON response containing the user info.
    //It's a cludgy workaround but it would git 'er done. 
    
    res.status(200).send("Login successful");
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
    //Note: Do NOT redirect! Login page will handle error message.
  });

  //NEWACCOUNT route: Attempts to add a new user account using local strategy
  app.post('/newaccount',  async (req, res, next) => {
    console.log("in /newaccont route with body = " + JSON.stringify(req.body));
    if (!req.body || !req.body.userId || !req.body.password) {
      //Body does not contain correct properties
      return res.status(401).send("POST request for new account formulated incorrectly. Please contact app developer.")
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
          profileImageUrl: `https://www.gravatar.com/avatar/${md5(req.body.userId)}`
        }).save();
        return res.status(200).send("New account for '" + req.body.userId + "' successfully created.");
      }
    } catch (err) {
      console.log("Error occurred when looking up user in database.")
      return next(err);
    }
  });
