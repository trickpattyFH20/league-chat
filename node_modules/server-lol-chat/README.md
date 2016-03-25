# server-lol-chat
example implementation: http://league.chat
#### node connection to League of Legends chat servers
###### refactored and based on:
* [node-lol-xmpp](https://github.com/pentarex/node-lol-xmpp)
* [pilt-lib-chat](https://github.com/philippwiddra/pilt-lib-chat)
#### example:
```
var ChatClient = require("./core"),
    Jid = require("./core/jid"),
    client = new ChatClient({
        accountName: "",
        password: "",
        server: "NA"
    });

client.on("online", function () {
    console.log("Connected");
});

client.on("offline", function () {
    console.log("Disconnected.");
});

client.on("message", function (message) {
    console.log(message)
});

client.on("roster", function (roster) {
    console.log(roster)
});
```
