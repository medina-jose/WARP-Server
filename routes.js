"use strict";

const auth = require("./lib/routes/auth");
const discogs = require("./lib/routes/discogs");
const catalog = require("./lib/routes/catalog");
const spawn = require("child_process").spawn;
const fs = require("fs");

const isAuthenticated = (req, callback) => {
	const userId = req.cookies["_vinylPlayer_userId"];
	const sessionId = req.cookies["_vinylPlayer_sessionId"];
	if(typeof sessionId !== "undefined" && sessionId !== "" && typeof userId !== "undefined" && userId !== "") {
		auth.isAuthenticated(sessionId, userId, (error, exists) => {
			callback(error, exists);
		});
	}
	else {
		callback(null, false);
	}
};

const continueIfAuthenticated = (req, res, next) => {
	isAuthenticated(req, (error, authenticated) => {
		if(error) {
			res.status(400).send("not logged in");
		}
		else if(authenticated) {
			next();
		}
		else {
			res.status(400).send("not logged in");
		}
	});
};

const capitalizeFirstLetters = (words) => {
	words = words.split(" ");
	let new_words = []
	for(var i=0; i<words.length; i++){
		let new_word = words[i].charAt(0).toUpperCase() + words[i].substring(1);
		new_words.push(new_word);
	}

	return new_words.join(" ");
}


module.exports = (app) => {
	app.post("/records/:id", continueIfAuthenticated, (req, res) => {
		const recordId = req.params.id;
		res.send(recordId);
	});

	app.post("/search", continueIfAuthenticated, (req, res) => {
		discogs.queryDiscogs(req, res);
		// discogs.searchDiscogs(req, res);
	});

	app.post("/getTrackList",  (req, res) => {
		discogs.getTracklist(req, res);
	});

	app.post("/testOCR",  (req, res) => {
		console.log("Python test");
	});

	app.post("/searchImage", (req, res) => {
		let encodedImage = req.body.image;
		let decodedImage =  Buffer.from(encodedImage, 'base64');

		fs.writeFile("./lib/bin/img/original.jpg", decodedImage, function(err) {
			if(err) { res.send('{"error": "Encoded Image Could Not Be Decoded"}'); }
			console.log("The file was saved!");
			const process = spawn("python", ["./ocr.py"]);
			process.stdout.on('data', (data) => {
				// data = Array.from(data);
				// let index = data.length-1;
				// let bufferData = data[index];
				let strings = data.toString('utf8')
				strings = strings.split("\n");
				let networkOutput = strings[strings.length-1]
				if(networkOutput == null || networkOutput == "") {
					res.send();
				}
				try {
					data = JSON.parse(networkOutput);
					// data = data[data.length-1];
					// console.log(data.data);
					let query = data.query;
					query = query.toLowerCase();
					query = capitalizeFirstLetters(query);

					req.body.query = query;

					discogs.queryDiscogs(req, res);
				} catch (e) {
					console.log("Not Json. Logging python output");
					for(var i=0; i<strings.length; i++){
						console.log(strings[i]);
					}
					res.send();
				}
				
			});
			
			process.stderr.on('data', (data) => {
				console.log(`stderr: ${data}`);
				// res.send('{"error": "Encoded Image Could Not Be Decoded"}');
			});
			
			process.on('close', (code) => {
				console.log(`child process exited with code ${code}`);
			});
		});
	});

	app.post("/getAlbumInfo", continueIfAuthenticated, (req, res) => {
		discogs.getAlbumInfo(req, res, (error, album) => {
			if(error) {
				res.status(500).send(error);
			}
			else {
				res.send(album);
			}
		});
	});

	app.post("/search/:id", continueIfAuthenticated, (req, res) => {

	});

	app.post("/login", (req, res) => {
		isAuthenticated(req, (error, exists) => {
			if(error) {
				res.status(500).send(error);
			}
			else if(exists) {
				res.status(202).send("already logged in");
			}
			else {
				auth.authenticateUser(req, res);
			}
		});
	});

	app.post("/logout", (req, res) => {
		isAuthenticated(req, (error, exists) => {
			if(error) {
				res.status(500).send(error);
			}
			else if(!exists) {
				res.status(202).send("not logged in");
			}
			else {
				auth.deleteSession(req, res);
			}
		});
	});

	app.post("/createUser", (req, res) => {
		auth.createUser(req, res);
	});

	app.post("/catalog", continueIfAuthenticated, (req, res) => {
		catalog.getCatalog(req, res);
	});

	app.post("/addAlbum", continueIfAuthenticated, (req, res) => {
		catalog.addAlbum(req, res);
	});

	app.post("/jobNimbusTest", (req, res) => {
		console.log(req);
	});
};