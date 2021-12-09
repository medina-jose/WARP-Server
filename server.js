"use strict";

const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const errorHandler = require("errorhandler");
const cookieParser = require("cookie-parser");

const routes = require("./routes");

app.use(errorHandler({"dumpExceptions": true, "showStack": true}));
app.use(bodyParser.json({limit: '100MB'}));
app.use(bodyParser.urlencoded({limit: '100MB', extended: true}));

app.use(cookieParser());
app.disable("x-powered-by");
app.use((req, res, next) => {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
});

routes(app);

// catch all paths that weren't found in routes
app.get("*", (req, res) => {
	res.status(404).send("404");
});

app.all("*", (req, res) => {
	res.status(404);
});

app.listen(process.env.PORT || 3001, () => {
	console.log("App started and listening on port " + (process.env.PORT || 3001));
});