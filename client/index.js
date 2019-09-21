const prompt = require('prompt');
const util = require('util');
const io = require('socket.io-client');
const chalk = require('chalk');
const ora = require('ora');
const readline = require('readline');

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
            description: chalk.white('Enter the server address (IP/Domain/localhost)'),
            name: 'address',
            default: 'localhost',
            required: true,
            pattern: /^(((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|localhost|(?:[a-z0-9](?:[a-z0-9]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9])/g,
            message: chalk.red('Address must be an IP/Domain/localhost')
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
                    return console.error(chalk.red('Connection error!'));
                })
        
                socket.on('connect', () => {
                    console.log('\033[2J');
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
                        await console.log('\033[2J');
                        await console.log(`${chalk.yellow('[System]')} You joined the room`);
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
							'magneta'
						];
						
						let color = colors[Math.floor(Math.random() * colors.length-1)];
                        input.setPrompt(chalk.dim.bold.underline[color](name)+chalk.white(' » '));
                        input.prompt();

                        input.on('line', async text => {
							if(text == '/exit' || text == '/stop') return process.exit(1);
							await input.prompt();
                            if(text == '') return;
                            await socket.emit('sendMessage', {
                                name: rData.name,
                                room: rData.room,
                                message: text,
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
							
							console.log(`${chalk.yellow('[System]')} ${name} joined the room.`);
						});

						socket.on('userDisconnect', name => {
							let log = console.log;
							console.log = function() {
								input.output.write('\x1b[2K\r');
								log.apply(console, Array.prototype.slice.call(arguments));
								input._refreshLine
							};
							
							console.log(`${chalk.yellow('[System]')} ${name} disconnected.`);
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
                                await console.log(`${chalk.dim.bold[color](msg.name)} » ${msg.message}`);
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
							} else if(type == 'arrayRoom') {
								//${rooms[Object.keys(rooms)[r]]['users'].splice(rooms[Object.keys(rooms)[r]]['users'].indexOf(username),1).join(', ')}
								data.splice(data.indexOf(name), 1);
								res[1] = `» Users: ${chalk.green(name)}, ${data.join(', ')}`
								res.forEach(c => {
									console.log(c);
								});
							} else if(type == 'string') {
								console.log(res);
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