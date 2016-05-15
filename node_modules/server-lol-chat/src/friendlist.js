var Jid = require("./jid"),
  Status = require("./status"),
  Client = require("./"),
  Friend = require("./friend"),
  getUid = require("./uid"),
  XmlElement = require("ltx").Element,
  ERRORS = [
    new Error("Friendlist(client): Argument client must exist"),
    new Error("Friendlist(client): client must be an instance of Client from the client package")
  ];

// Helper functions
function requestRoster(client, callback) {
  var id = getUid("plc-roster-request"),
    xmlRosterRequest = new XmlElement("iq", {
      type: "get",
      id: id
    }).c("query", {
      xmlns: "jabber:iq:roster"
    }),
    iqStanzaHandler = function (stanza) {
      if (stanza.attr("id") === id) {
        client.removeListener("stanza:iq", iqStanzaHandler);
        var rosterItems = stanza.getChild("query").getChildren("item");
        callback(rosterItems);
      }
    };

  client.on("stanza:iq", iqStanzaHandler);
  client.sendXml(xmlRosterRequest);
}

function getInitialRoster(client, friends) {
  requestRoster(client, function (xmlRosterItems) {
    // TODO
    // new Friend(rosterItem)
  });

  // TODO
}

// Constructor function
function Friendlist(client) {
  if (!client) {
    throw ERRORS[0]; // new Error("Friendlist(client): Argument client must exist")
  }
  if (!(client instanceof Client)) {
    throw ERRORS[1]; // new Error("Friendlist(client): client must be an instance of Client from the client package")
  }

  this["_friends"] = [];

  // TODO
  // hook up roster
  getInitialRoster(client, this["_friends"]);
}

// Static fields
Friendlist.throws = ERRORS;

// Export class
module.exports = Friendlist;
