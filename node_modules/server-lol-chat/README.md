# server-lol-chat
example implementation: http://league.chat
#### node connection to League of Legends chat servers
##### working as of: 5/10/26 patch 6.9

#### Install
`npm install --save server-lol-chat`

#### example:
```
var ChatClient = require("server-lol-chat"),
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
###### refactored, patched, and based on [pilt-lib-chat](https://github.com/philippwiddra/pilt-lib-chat) with help from philippwiddra
