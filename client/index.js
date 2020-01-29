const prompt = require('prompt');
const util = require('util');
const io = require('socket.io-client');
const chalk = require('chalk');
const ora = require('ora');
const readline = require('readline');
const moment = require('moment');

async function connect(address, port) {
    try {
        let uri = ''
        if(!port) {
            uri = `http://${address}`
        } else {
            uri = `http://${address}:${port}`
        }

        const socket = await io(uri);
        return socket;
    } catch(error) {
        return error;
    };
};

const main = async() => {
    try {
        prompt.start();

        //disable prompt text in the beginning
        prompt.message = ''

        const get = util.promisify(prompt.get);

        const { address } = await get([{
            description: chalk.white('Enter the server address'),
            name: 'address',
            default: 'localhost',
            required: true,
            //pattern: /^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/gm,
            message: chalk.red('Address must be an filled-in')
        }])

        const { port } = await get([{
            description: chalk.white('Enter the server port (optional)'),
            name: 'port',
            required: false,
            pattern: /^([0-9]{1,4}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6554[0-5])$/,
            message: chalk.red('Invalid port! Range: 0-65535')
        }])

        const { name } = await get([{
            description: chalk.white('Enter your username'),
            name: 'name',
            required: true,
            message: chalk.red('Invalid username!')
        }]);

        try {
            this.primaryServer = {
                address: address,
                port: port,
                name: name
            }
            //Primary Connect
            await connect(address, port).then(socket => {
                let status = ora({
                    text: 'Connecting to the server... (CTRL/CMD+C to abort)',
                    spinner: {
                        frames: ['-', '\\', '|', '/'],
                        interval: 100
                    }
                }).start();

                socket.on('connect_timeout', () => {
                    status.stop();
                    //this.primaryServer = undefined;
                    return console.error(chalk.red('Connection timed-out!'));
                })
        
                socket.on('connect', () => {
                    process.stdout.write('\033[2J\u001B[0;0f');
                    status.stop();

                    console.log(chalk.underline.yellow('Connected to the server.'));
                    socket.emit('data', {
                        name: name
                    });

                    socket.on('rooms', async rooms => {
                        await rooms.forEach((r, index) => {
                            console.log(`[${index}] - ${r}`);
                        });

                        const { joinRoom } = await get([{
                            description: chalk.bold.white('Choose a room!'),
                            name: 'joinRoom',
                            required: true,
                            type: 'integer',
                            conform: (value) => {
                                if(value > rooms.length-1) {
                                    return false;
                                } else {
                                    return true;
                                }
                            },
                            message: chalk.red('Invalid room!')
                        }]);

                        await socket.emit('joinRoom', joinRoom);
                        await process.stdout.write('\033[2J\u001B[0;0f');
                        await console.log(`${chalk.bold.yellow('[System]')} You joined the room`);
                    });

                    socket.on('joinedRoom', rData => {
                        const input = readline.createInterface({
                            input: process.stdin,
                            output: process.stdout
                        });
						
						let colors = [
							'green',
							'yellow',
							'blue',
							'red',
							'magenta'
						];
						
						let color = colors[Math.floor(Math.random() * colors.length)];
                        input.setPrompt(chalk.dim.bold.underline[color](name)+chalk.white(' » '));
                        input.prompt();

                        input.on('line', async text => {
							if(text == '/exit' || text == '/stop') return process.exit(1);
							await input.prompt();
                            if(text == '') return;
                            let text16 = Buffer.from(text).toString('hex');
                            await socket.emit('sendMessage', {
                                name: rData.name,
                                room: rData.room,
                                message: text16,
								color: color
                            });
                        });
						
						socket.on('userJoin', name => {
							let log = console.log;
							console.log = function() {
								input.output.write('\x1b[2K\r');
								log.apply(console, Array.prototype.slice.call(arguments));
								input._refreshLine();
							};
							
                            console.log(`${chalk.bold.yellow('[System]')} ${name} joined the room.`);
                            input.prompt();
						});

						socket.on('userDisconnect', name => {
							let log = console.log;
							console.log = function() {
								input.output.write('\x1b[2K\r');
								log.apply(console, Array.prototype.slice.call(arguments));
								input._refreshLine();
							};
							
                            console.log(`${chalk.bold.yellow('[System]')} ${name} disconnected.`);
                            input.prompt();
						});
                        
                        socket.on('message', async msg => {
							let log = console.log;
							console.log = function() {
								input.output.write('\x1b[2K\r');
								log.apply(console, Array.prototype.slice.call(arguments));
								input._refreshLine
							};
							
                            if(msg.name !== name) {
                                let color = msg.color;
                                let decMsg = Buffer.from(msg.message, 'hex').toString('utf8');
                                let date = msg.time;
                                let formated = moment(date).format('MM/HH/YYYY hh:mm');
                                await console.log(`${chalk.dim.bold[color](msg.name)} ${chalk.dim.bold.gray(`(${formated})`)} » ${decMsg}`);
                            };
							await input.prompt();
                        });
						
						socket.on('command', async(res, type, data) => {
							let log = console.log;
							console.log = function() {
								input.output.write('\x1b[2K\r');
								log.apply(console, Array.prototype.slice.call(arguments));
								input._refreshLine
							};
							
							await input.prompt();
							
							if(type == 'array') {
								res.forEach(c => {
									console.log(c);
                                });
                                input.prompt();
							} else if(type == 'arrayRoom') {
								//${rooms[Object.keys(rooms)[r]]['users'].splice(rooms[Object.keys(rooms)[r]]['users'].indexOf(username),1).join(', ')}
								data.splice(data.indexOf(name), 1);
								res[1] = `» Users: ${chalk.green(name)}, ${data.join(', ')}`
								res.forEach(c => {
									console.log(c);
                                });
                                input.prompt();
							} else if(type == 'string') {
                                console.log(res);
                                input.prompt();
							};
						});
					});
                });
				
				socket.on('nameError', reason => {
					console.log(`${chalk.yellow('[System]')} Error! ${reason}`);
				});
				
                socket.on('disconnect', () => {
                    console.log(`${chalk.yellow('[System]')} You\'ve disconnected from the server.`);
                    main();
                });
            });
        } catch(error) {
            if(error) {
                console.error(error)
            };
        }; 
    } catch(error) {
        console.error(error);
        process.exit(1)
    }
};
main();