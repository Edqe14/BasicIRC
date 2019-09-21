const express = require('express');
const app = express();

const server = require('http').Server(app);
const io = require('socket.io')(server);

const chalk = require('chalk');
const readline = require('readline');
const ora = require('ora');

console.log(chalk.yellow('IRC Console by Edqe') + chalk.white(' | ') + chalk.green('Version 1.0.0'));

let disabled = false;

let rooms = {
    General: {
        users: []
    },
    Playground: {
        users: []
    }
};

let globalUser = {};
let admin = {
    Edqe: 'pass123'
};

io.on('connection', (socket) => {
    socket.on('data', data => {
        let username = data.name;
        if(Object.keys(globalUser).find(u => u == username)) {
            socket.emit('nameError', 'This username is already taken! Please reconnect.');
            return setTimeout(async() => {
                await socket.disconnect(true);
            }, 2000);
        }

        //globalUser.push(username);
        globalUser[username] = socket;

        socket.emit('rooms', Object.keys(rooms));

        socket.on('joinRoom', async r => {
            r = parseInt(r);
            await socket.join(Object.keys(rooms)[r]);

            rooms[Object.keys(rooms)[r]]['users'].push(username);

            await socket.to(Object.keys(rooms)[r]).broadcast.emit('userJoin', username);

            await socket.emit('joinedRoom', {
                name: username,
                room: Object.keys(rooms)[r]
            });

            socket.on('sendMessage', async msg => {
                let prefix = '/';
                let message = msg.message;
                let command = message.split(' ')[0]
                let args = message.split(' ').shift()

                let help = [
                    '############- Help -############',
                    '## /help | Show this message  ##',
                    '## /room | Get room info      ##',
                    '## /kick <user> | Kick a user ##',
                    // '##                            ##',
                    // '##                            ##',
                    '################################'
                ]

                //Call command
                if(message.startsWith(prefix)) {
                    if(command == `${prefix}?` || command == `${prefix}help`) {
                        await socket.emit('command', help, 'array')
                    } else if(command == `${prefix}room`) {
                        await socket.emit('command', [
                            `» ${chalk.underline.yellow('Room » '+Object.keys(rooms)[r])}`,
                            `» Users:`
                        ], 'arrayRoom', rooms[Object.keys(rooms)[r]]['users']);
                    } else if(command == `${prefix}disconnect` || command == `${prefix}dc`) {
                        await socket.emit('command', 'Successfuly Disconnected from the server.', 'string');
                        await socket.disconnect(true);
                    } else {
                        await socket.emit('command', 'Unknown command! /? to show help', 'string');
                    }
                } else {
                    await socket.to(msg.room).broadcast.emit('message', {
                        name: msg.name,
                        message: message,
						color: msg.color
                    });
                };            
            });

            socket.on('disconnect', () => {
                socket.to(Object.keys(rooms)[r]).broadcast.emit('userDisconnect', username);
                rooms[Object.keys(rooms)[r]]['users'].splice(rooms[Object.keys(rooms)[r]]['users'].indexOf(username), 1);
                delete globalUser[username];
            });
        });

        socket.on('disconnect', async() => {
            if(Object.keys(globalUser).find(u => u == username)) {
                await delete globalUser[username];
            }
        });
    });
});

//Loading animation?
let loadingModules = ora({
    text: 'Loading all modules...',
    spinner: {
        frames: ['-', '\\', '|', '/'],
        interval: 100
    }
}).start();

let loadingCommands = ora({
    text: 'Loading all commands...',
    spinner: {
        frames: ['-', '\\', '|', '/'],
        interval: 100
    }
});

let loadingEvents = ora({
    text: 'Loading all events...',
    spinner: {
        frames: ['-', '\\', '|', '/'],
        interval: 100
    }
});

setTimeout(() => {
    loadingModules.stop();
    loadingCommands.start();
    setTimeout(() => {
        loadingCommands.stop();
        loadingEvents.start();
        
        setTimeout(async() => {
            await loadingEvents.stop();

            await server.listen(3000, async e => {
                if(e) console.log(e);
                await console.log('Listening to port: 3000\n');
                await console.log('Type /? to show all commands.');
            });

            let input = await readline.createInterface({
                input: process.stdin
            });

            //TODO make console commands
            let prefix = '/';
            let consoleHelp = [
                chalk.bold('» General Commands ([] = Optional, <> = Required)'),
                '\t/? - Show this list of commands.',
                '\t/info [options<all|-a>] - Show server statistics. Options: -a | Show full statistics including rooms statistics.',
                '\t/room<s> [list|-l, name|-n [params<room name>]] - Show rooms list or show a room information.',
                '\t/enable - Enable the server to listen to the port (If server is disabled)',
                '\t/disable - Disable the server from listening to the port (If server is enabled)',
                ' ',
                chalk.bold('» Room Commands ([] = Optional, <> = Required)'),
                `${chalk.red('!! Not Available Right Now !!')}`
            ];

            input.on('line', async text => {
                let command = text.split(' ')[0];
                let args = text.split(' ').shift();

                if(!text.startsWith(prefix)) {
                    return console.log('Unknown command! /? to show all commands.'); 
                }

                let availableCmd = ['help', 'stop', 'exit'];
                switch(command) {
                    case `${prefix}?`||`${prefix}help`:
                        consoleHelp.forEach(c => {
                            console.log(c);
                        });
                        break;

                    case `${prefix}exit`:
                        let disabling = ora({
							text: 'Disabling all modules...',
							spinner: {
								frames: ['-', '\\', '|', '/'],
								interval: 100
							}
						}).start();
                        setTimeout(async() => {
							await disabling.stop();
                            await console.log('Server Stopped.')
                            await process.exit(1)
                        }, Math.floor((Math.random() * (4500-2500))+2500));
                        break;

                    case `${prefix}enable`:
                        if(!disabled) return console.log('The server isn\'t disabled!');
                        else {
                            console.log('Server enabled.');
                            disabled = false;
                            server.listen(3000);
                        };
                        break;

                    case `${prefix}disable`:
                        if(disabled) return console.log('The server is already disabled!');
                        else {
                            console.log('Server disabled.');
                            disabled = true;
                            server.close();
                        };
                };
            });

            input.on('close', () => {
                return console.log('Server Stopped.');
            });
        }, Math.floor(Math.random() * 2500));
    }, Math.floor(Math.random() * 3500));
}, Math.floor(Math.random() * 4200));