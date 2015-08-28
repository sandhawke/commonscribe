let fs = require("fs");
let glob = require("glob");

let rrsagent_line = /^((\d\d):(\d\d):(\d\d) )?<([^>]*)> ?(.*)/
let filename_pattern = /^data\/(\d\d\d\d)\/(\d\d)\/(\d\d)-(\w*)\/(.*)$/
let subst_pattern = /^s\/([^\/]*)\/([^\/]*)\/?/

let mevs = [];

function doSubst(mevs, from, to) {
	//console.log('subst', from, to);
	let pos=mevs.length-1;
	while (pos >= 0) {
		let s0 = mevs[pos].text;
		let s1 = s0.replace(from, to);
		if (s0 !== s1) {
			mevs[pos].text = s1;
			console.log('subst worked: \n  '+s0+'\n  '+s1+'\n');
			return
		} else {
			//console.log('subst didnt change', s0);
		}
		pos--;
	}
	console.log('subst failed\n');
}

function loadFile(filename, done) {

	let mevs = [];
	let fm = filename.match(filename_pattern);
	let date = {};
	let datestr = "0000-00-00";
	let channel;
	if (fm) {
		date.year=fm[1];
		date.month=fm[2];
		date.day=fm[3];
		datestr = date.year+"-"+date.month+"-"+date.day
		channel=fm[4];
	} else {
		console.log("unexpected filename syntax: "+filename);
		done("bad filename pattern");
	}

	fs.readFile(filename, function (err, data) {
		if (err) throw err
		let lines = data.toString('utf8').split("\n");
		for (let line of lines) {
			line = line.trim();
			if (line === "" || line[0] === "#") continue;
			// console.log("=> ", line)
			let m = line.match(rrsagent_line)
			if (m) {
				// console.log("m=", m)
				let n = {
					nick: m[5],
					text: m[6],
					channel: channel,
					date: datestr
				}
				if (m[1]) {
					let ms = Date.UTC(date.year, date.month-1, date.day, m[2], m[3], m[4])
					let timestamp = new Date();
					timestamp.setTime(ms);
					n.time=timestamp.toISOString();
				}

				// if n.text is 's/foo/bar' then
				// run backward through mevs looking for foo to replace with bar
				let s = n.text.match(subst_pattern);
				if (s) {
					// console.log('subst', s);
					doSubst(mevs, s[1], s[2]);
					continue;   // don't save this as a chat event
				} 

				mevs.push(n);
				// console.log(n);
			} else {
				console.log("BAD LINE: "+filename+":\n  \""+line+"\"\n")
			}
		};
		// console.log("  ", mevs.length, "events read");
		done(null, mevs);
	});
}

function visitMeetings(filenames, done) {
	if (filenames.length === 0) {
		done(null);
	} else {
		let filename = filenames.shift();

		// console.log('visitMeeting', filename);
		
		glob(filename+"/*.txt", {}, function(err, versions) {
			let file = versions.slice(-1)[0];
			//console.log("last-version", file);
			loadFile(file, function(err, thesemevs) {
				mevs.push.apply(mevs, thesemevs);
				visitMeetings(filenames, done);
			});
		})
	}
}


glob("data/*/*/*-ldp", {}, function (err, files) {
	visitMeetings(files, function(err) {
		// console.log("all done");
		// console.log("  ", mevs.length, "events read");		
		console.log(mevs)
	});
});
