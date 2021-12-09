"use strict";
var discogs = require("disconnect").Client;
var discogsDB = discogs("VinylPlayerApp/1.0", {"userToken": process.env.DISCOGS_API_TOKEN}).database();
const async = require("async");

module.exports.queryDiscogs = (req, res) => {
	const query = req.body.query;
	const params = { 
		"type": "master",
		"per_page": 100
	}
	
	// perform Discogs query
	// if error then return error
	// else sort and filter results
	discogsDB.search(query, params, (error, response) => {
		if(error) { res.send(error); }
		
		const results = response.results;
		const result = {
			"query": query,
			"results": results
		}
		
		res.send(result); 
	});
}

module.exports.getTracklist = (req, res) => {
	var id = req.body.id;
	var hasDurations = true;
	var tracklist = []

	discogsDB.getMaster(id, (error, master) => {
		if(error) {
			res.send(error);
		}

		else {
			// check if record has durations for every song
			// if not then don't add to the results
			const masterTracklist = master.tracklist;
			for(var i=0; i<masterTracklist.length; i++) {
				let track = masterTracklist[i];
				if(track.duration === "") {
					hasDurations = false;
					break;
				}
			}

			if(hasDurations) {	
				tracklist = masterTracklist;		
				discogsDB.getMasterVersions(id, (error, versions) => {	
					if(error) {
						res.send(error);
					}

					let masterVersions = versions.versions;
					let vinylVersionIds = []
					let j = 0;
					async.whilst(() => { return j < masterVersions.length; }, 
						(callback) => {
							let masterVersion = masterVersions[j++];
							if(masterVersion.major_formats.indexOf("Vinyl") == -1) { callback(); }
							
							else {
								var releaseId = masterVersion.id;
								vinylVersionIds.push(masterVersion.id)	
							 	callback();
							}
						}, 
						(error) => {
							if (vinylVersionIds == undefined) { res.send(tracklist); }

							discogsDB.getRelease(vinylVersionIds[0], (error, release) => {														
								let hasPositions = true;
								const releaseTracklist = release.tracklist;
								let k = 0;
								async.whilst(() => { return k < releaseTracklist.length; }, 
									(callback) => {
										let track = releaseTracklist[k++];

										console.log(k);
										let maxLength = tracklist.length - 1 < k;
										if(maxLength || tracklist == undefined) { 
											callback(); 
										}
										else{
											tracklist[k-1].position = track.position;
											callback();
										}
									}, (error) => { 
										res.send(tracklist); 
									}
								);
							});
						}
					);
				});
			}
			else { res.send(error); }
		}
	});
}