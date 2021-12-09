"use strict";

const pool = require("../db");
const discogs = require("../routes/discogs");

module.exports.getCatalog = (req, res) => {
	const userId = req.cookies["_vinylPlayer_userId"];
	const query =
		`SELECT 
			artists.name AS artist_name
			, artists.discogs_id AS artist_discogs_id
			, records.name AS record_name
			, records.cover_image
			, records.discogs_id AS record_discogs_id
			, songs.name AS song_name
			, songs.start_time
			, songs.duration
		FROM record_relations
		LEFT JOIN records ON records.id = record_relations.record_id 
		LEFT JOIN artists ON artists.id = records.artist_id
		LEFT JOIN songs ON songs.record_id = records.id
		WHERE record_relations.user_id = $1`;
	pool.query(query, [userId], (error, result) => {
		if(error) {
			res.status(500).send(error);
		}
		else {
			const catalog = result.rows;
			res.send(catalog);
		}
	});
};

module.exports.addAlbum = (req, res) => {
	discogs.getAlbumInfo(req, res, (error, album) => {
		const userId = req.cookies["_vinylPlayer_userId"];
		let params = [userId, album.artistName, album.artistId, album.album, album.id, album.thumbnail];
		const trackList = album.tracklist;
		let songValues = "";
		let idx = 7;
		let time = 0;
		trackList.forEach((track, i) => {
			params.push(track.title);
			params.push(time);
			const durationParts = track.duration.split(":");
			const duration = (parseInt(durationParts[0]) * 60) + parseInt(durationParts[1]);
			params.push(duration);
			time += duration;
			songValues += "($" + idx++ + ", (SELECT id FROM record), $" + idx++ + ", $" + idx++ + ")";
			if(trackList.length !== i + 1) {
				songValues += ",";
			}
		});
		const query =
			`WITH artist AS (
				INSERT INTO artists (name, discogs_id) VALUES ($2, $3) RETURNING id
			),
			record AS (
				INSERT INTO records (artist_id, name, discogs_id, cover_image) VALUES ((SELECT id FROM artist), $4, $5, $6) RETURNING id
			), songs AS (
				INSERT INTO songs (name, record_id, start_time, duration) VALUES ` + songValues + `
			)
			INSERT INTO record_relations (record_id, user_id) VALUES ((SELECT id FROM record), $1) RETURNING id`;
		pool.query(query, params, (error, result) => {
			if(error) {
				res.status(500).send(error);
			}
			else {
				res.send(result.rows);
			}
		});
	});
};