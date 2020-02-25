// server.js -- An Express.js web server for serving a React.js app that
// supports GitHub OAuth authentication.
//Uses ES6 syntax! We transpile it using Babel. Please see this tutorial:
//https://medium.com/@wlto/how-to-deploy-an-express-application-with-react-front-end-on-aws-elastic-beanstalk-880ff7245008

/////////////////
//PASSPORT SET-UP
/////////////////
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
  function(accessToken, refreshToken, profile, done) {
    return done(null, profile);
  }
));

//Serialize the current user to the session
passport.serializeUser(function(user, done) {
  // TO DO: Add custom serialization if desired
  done(null, user);
});

//Deserialize the current user from the session
//to persistent storage.
passport.deserializeUser(function(user, done) {
  //TO DO: Add custom deserialization if desired
  done(null, user);
});

import session from 'express-session';
import path from 'path';

////////////////////
//EXPRESS APP SET-UP
///////////////////
const PORT = process.env.HTTP_PORT || LOCAL_PORT;
import express from 'express';
const app = express();
app
  .use(session({secret: "speedgolf", cookie: {maxAge: 1000 * 60}}))
  .use(passport.initialize())
  .use(passport.session())
  .use(express.static(path.join(__dirname,"client/build")))
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

/////////////////////
//EXPRESS APP ROUTES
/////////////////////

//AUTHENTICATE route: Uses passport to authenticate with GitHub.
//Should be accessed when user clicks on 'Login with GitHub' button on 
//Log In page.
app.get('/auth/github', passport.authenticate('github'),
  (req, res) => {
  console.log("/auth/github reached.");
});

//CALLBACK route:  GitHub will call this route after the
//OAuth authentication process is complete.
//req.isAuthenticated() tells us whether authentication was successful.
app.get('/auth/github/callback', passport.authenticate('github', { failureRedirect: '/' }),
  (req, res) => {
    console.log("auth/github/callback reached.")
    res.redirect('/'); //sends user back to login screen; req.isAuthenticated() indicates status
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
    let userObject = {};
    const isAuth = req.isAuthenticated();
    if (isAuth) {
        //populate 'user' property, which must exist since isAuth===true
        console.log("User is authenticated");
        userObject.id = req.user.username + "@github";
        userObject.username = req.user.username;
        userObject.provider = "github";
        userObject.profileImageUrl = req.user.photos[0].value;
    } else {
        //Keep 'user' property empty: 'user' prop does not exist
        console.log("User is not authenticated");
    }
    //Return JSON object to client with results.
    res.json({isAuthenticated: isAuth, user: userObject});
});
