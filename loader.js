"use strict";

var	nconf = require('nconf'),
	fs = require('fs'),
	pidFilePath = __dirname + '/pidfile',
	start = function() {
		var	fork = require('child_process').fork,
			nbb_start = function() {
				nbb = fork('./app', process.argv.slice(2), {
						env: {
							'NODE_ENV': process.env.NODE_ENV
						}
					});

				nbb.on('message', function(cmd) {
					if (cmd === 'nodebb:restart') {
						nbb_restart();
					}
				});
			},
			nbb_stop = function() {
				nbb.kill();
				if (fs.existsSync(pidFilePath)) {
					var	pid = parseInt(fs.readFileSync(pidFilePath, { encoding: 'utf-8' }), 10);
					if (process.pid === pid) {
						fs.unlinkSync(pidFilePath);
					}
				}
			},
			nbb_restart = function() {
				nbb.on('exit', function() {
					nbb_start();
				});
				nbb.kill();
			};

		process.on('SIGINT', nbb_stop);
		process.on('SIGTERM', nbb_stop);
		process.on('SIGHUP', nbb_restart);

		nbb_start();
	},
	nbb;

nconf.argv();

if (nconf.get('d')) {
	// Check for a still-active NodeBB process
	if (fs.existsSync(pidFilePath)) {
		console.log('\n  Error: Another NodeBB is already running!');
		process.exit();
	}

	// Initialise logging streams
	var	outputStream = fs.createWriteStream(__dirname + '/logs/output.log');
	outputStream.on('open', function(fd) {
		// Daemonize
		require('daemon')({
			stdout: fd
		});

		// Write its pid to a pidfile
		fs.writeFile(__dirname + '/pidfile', process.pid);

		start();
	});
} else {
	start();
}