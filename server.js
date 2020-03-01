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
    //TO DO: Check whether user is in app database and if not, add to database.
    return done(null, profile);
  }
));

//Serialize the current user to the session
passport.serializeUser((user, done) => {
  console.log("In serializeUser.");
  //Note: The code below is just for this demo, which is not using a back-end
  //database. When we have back-end database, we would put user info into the
  //database in the callback above and only serialize the unique user id into
  //the session.
  let userObject = {
    id: user.username + "@github",
    username : user.username,
    provider : user.provider,
    profileImageUrl : user.photos[0].value
  };
  done(null, userObject);
});

//Deserialize the current user from the session
//to persistent storage.
passport.deserializeUser((user, done) => {
  console.log("In deserializeUser.");
  //TO DO: Look up the user in the database and attach their data record to
  //req.user. For the purposes of this demo, the user record received as a param 
  //is just being passed through, without any database lookup.
  done(null, user);
});

////////////////////
//EXPRESS APP SET-UP
///////////////////
import session from 'express-session';
import path from 'path';
const PORT = process.env.HTTP_PORT || LOCAL_PORT;
import express from 'express';
const app = express();
app
  .use(session({secret: "speedgolf", 
                resave: false,
                saveUninitialized: false,
                cookie: {maxAge: 1000 * 60}}))
  .use(express.static(path.join(__dirname,"client/build")))
  .use(passport.initialize())
  .use(passport.session())
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

/////////////////////
//EXPRESS APP ROUTES
/////////////////////

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
    const isAuth = req.isAuthenticated();
    if (isAuth) {
        console.log("User is authenticated");
        console.log("User record tied to session: " + JSON.stringify(req.user));
    } else {
        //User is not authenticated.
        console.log("User is not authenticated");
    }
    //Return JSON object to client with results.
    res.json({isAuthenticated: isAuth, user: req.user});
});
