// server.js -- A simple Express.js web server for serving a React.js app
//Uses ES6 syntax! We transpile it using Babel. Please see this tutorial:
//https://medium.com/@wlto/how-to-deploy-an-express-application-with-react-front-end-on-aws-elastic-beanstalk-880ff7245008

import path from 'path';
import express from 'express';
//var path = require("path");
//var express = require("express");
const PORT = process.env.HTTP_PORT || 4001;
const app = express();

app.use(express.static(path.join(__dirname, 'client', 'build')));

app.listen(PORT, () => {
  console.log(`Server listening at port ${PORT}.`);
});
