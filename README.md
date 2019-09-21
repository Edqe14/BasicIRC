# BasicIRC

An basic CLI based IRC Server & Client built with Node, Express and Socket.io

Features:  
> Server and Client have their own commands  
> Interactive client  
> Rooms support  
> Random user color  
> Real-time messaging system  

To be added/fixed:  
+ Message history (Saving messages into a database) a.k.a Database support  
+ More commands  
- Fix clearing text in the CLI

## Installation

First, install all the dependencies: 
```js
npm i
```
Then, run the server/client:

Server
```js
npm start
or
node index.js
```

Client
```js
npm test
or
node client/index.js
```

## Configuration

~~*Right now, there isn't any config.json but sooner or later, it will be added.*~~

config.json
```json
{
    "port": 3000,
    "rooms": {
        "General": {
            "users": []
        },
        "Playground": {
            "users": []
        }
    }
}
```
*Nothing much here*
