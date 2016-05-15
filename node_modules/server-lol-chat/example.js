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
