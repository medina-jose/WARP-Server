"use strict";

const Pool = require("pg").Pool;
const url = require("url");

const params = url.parse(process.env.DATABASE_URL);
const auth = params.auth ? params.auth.split(":") : [null, null];
const [user, password] = auth;

const pool = new Pool({
	user,
	password,
	"host": params.hostname,
	"port": params.port,
	"database": params.pathname.split("/")[1],
	"ssl": process.env.LOCAL === "TRUE", // no SSL on localhost
	"max": 10,
	"min": 1,
	"idleTimeoutMillis": 1000
});
pool.on("error", (error, client) =>{
	console.log(error);
});

// export the query method for passing queries to the pool
module.exports.query = (text, values, callback) => {
	return pool.query(text, values, callback);
};