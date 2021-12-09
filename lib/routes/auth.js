"use strict";

const easyPbkdf2 = require("easy-pbkdf2")({
	"DEFAULT_HASH_ITERATIONS": 20000,
	"SALT_SIZE": 180,
	"KEY_LENGTH": 250
});
const pool = require("../db");
const async = require("async");

module.exports.deleteSession = (req, res) => {
	const userId = req.cookies["_vinylPlayer_userId"];
	const sessionId = req.cookies["_vinylPlayer_sessionId"];
	pool.query("DELETE FROM sessions WHERE id = $1 AND user_id = $2", [sessionId, userId], (error, result) => {
		if(error) {
			res.status(500).send(error);
		}
		else {
			res.cookie("_vinylPlayer_sessionId", "", {"httpOnly": true});
			res.cookie("_vinylPlayer_userId", "", {"httpOnly": true});
			res.send("Session Deleted");
		}
	});
};

module.exports.authenticateUser = (req, res) => {
	const email = req.body.email;
	const password = req.body.password;

	if(email === null || email === undefined || password === null || password === undefined) {
		res.status(400).send("Invalid email or password.");
	}
	else {
		pool.query("SELECT id, email, password, salt FROM users WHERE email = $1", [email], (error, result) => {
			if(error) {
				res.send(error);
			}
			else {
				let user = result.rows[0];
				if(!user) {
					// user not found
					res.sendStatus(404);
				}
				else {
					easyPbkdf2.verify(user.salt, user.password, password, (err, valid) => {
						if(err) {
							throw err;
						}
						else if(valid) {
							const params = [user.id];
							pool.query("INSERT INTO sessions (user_id, expires_at) VALUES ($1, CURRENT_TIMESTAMP + INTERVAL '30' day) RETURNING id", params, (err, result) => {
								if(err) {
									res.status(500).send("Error creating session");
								}
								else {
									const sessionId = result.rows[0].id;

									res.cookie("_vinylPlayer_sessionId", sessionId, {"httpOnly": true});
									res.cookie("_vinylPlayer_userId", user.id, {"httpOnly": true});
									res.send("User Authenticated");
								}
							});
						}
						else {
							res.status(400).send("Invalid username or password.");
						}
					});
				}
			}
		});
	}
};

module.exports.createUser = (req, res) => {
	const email = req.body.email;
	const password = req.body.password;

	async.series({
		"checkUser": (callback) => {
			pool.query("SELECT id FROM users WHERE email = $1", [email], (error, result) => {
				if(error) {
					throw error;
				}
				callback(null, result.rows);
			});
		}
	}, (error, result) => {
		if(error) {
			res.send(error);
		}
		else {
			const userExists = result.checkUser.length > 0;
			if(userExists) {
				res.send("User already exists");
			}
			else {
				const salt = easyPbkdf2.generateSalt();
				easyPbkdf2.secureHash(password, salt, (error, hash) => {
					if(error) {
						throw error;
					}
					pool.query(
						`WITH insertUser AS (
							INSERT INTO users (email, password, salt) VALUES ($1, $2, $3) RETURNING id
						),
						insertSession AS (
							INSERT INTO sessions (user_id, expires_at) VALUES ((SELECT id FROM insertUser), CURRENT_TIMESTAMP + INTERVAL '30' day) RETURNING id, user_id
						)
						SELECT id, user_id FROM insertSession`, [email, hash, salt], (error, result) => {
							if(error) {
								res.send(error);
							}
							else {
								const sessionId = result.rows[0].id;
								const userId = result.rows[0].user_id;

								res.cookie("_vinylPlayer_sessionId", sessionId, {"httpOnly": true});
								res.cookie("_vinylPlayer_userId", userId, {"httpOnly": true});
								res.send("User Created and Authenticated");
							}
						}
					);
				});
			}
		}
	});
};

module.exports.isAuthenticated = (sessionId, userId, callback) => {
	const query =
		`with tbl AS (
			DELETE FROM sessions WHERE user_id = $2::uuid AND expires_at <= CURRENT_TIMESTAMP
		)
		SELECT EXISTS(SELECT 1 FROM sessions WHERE id = $1::uuid AND user_id = $2::uuid AND expires_at > CURRENT_TIMESTAMP);`;
	pool.query(query, [sessionId, userId], (error, result) => {
		if(error) {
			throw error;
		}

		let exists = result.rows[0].exists;

		callback(null, exists);
	});
};