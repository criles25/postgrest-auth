var _ = require("lodash");
var express = require("express");
var logger = require("morgan");
var bodyParser = require("body-parser");
var bearerToken = require("express-bearer-token");
var HttpStatus = require("http-status-codes");

var app = express();

app.use(logger("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bearerToken());

app.use(require("./routes/users"));
app.use(require("./routes/token"));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error("Not Found");
  err.status = 404;

  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  console.error(err);

  err.status = err.status || 500;
  err.statusText = err.statusText || HttpStatus.getStatusText(err.status);
  err.message = err.message || "Sorry about this";

  // set locals, only providing error in development
  res.status(err.status);
  res.locals.message = err.message;

  if (process.env.NODE_ENV === "production") {
    res.locals.error = {};
    res.send(_.pick(err, ["status", "statusText", "errors"]));
  } else {
    res.locals.error = err;
    res.send(err);
  }
});

module.exports = app;
