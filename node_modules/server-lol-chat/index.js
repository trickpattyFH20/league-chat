var XmppClient = require("node-xmpp-client"),
	ltx = require("ltx"),
	camelCase = require("camel-case"),
	clone = require("clone"),
	EventEmitter = require("events").EventEmitter,
	util = require("util"),
  	Jid = require("./core/jid"),
  	getUid = require("./core/uid"),
	CHAT_HOSTS = require("./core/servers.json"),
	CHAT_DOMAIN = "pvp.net",
	CHAT_PORT = 5223,
	CHAT_PASSWORD_PREFIX = "AIR_",
	CHAT_PASSWORD_SUFFIX = "",
	CHAT_STANDARD_RESOURCE = "xiff",
	CHAT_CUSTOM_RESOURCE = "plc",
  	CHAT_KEEPALIVE_RESOURCE = "plckeepalive",
  	CHAT_KEEPALIVE_INTERVAL = 5 * 60 * 1000, // 5 min
	XMPP_DEFINED_ERROR_CONDITIONS = [
		"bad-request",
		"conflict",
		"feature-not-implemented",
		"forbidden",
		"gone",
		"internal-server-error",
		"item-not-found",
		"jid-malformed",
		"not-acceptable",
		"not-allowed",
		"payment-required",
		"recipient-unavailable",
		"redirect",
		"registration-required",
		"remote-server-not-found",
		"remote-server-timeout",
		"resource-constraint",
		"service-unavailable",
		"subscription-required",
		"undefined-condition",
		"unexpected-request"
	], // Defined Error Conditions according to http://xmpp.org/rfcs/rfc3920.html#rfc.section.9.3.3
	XMPP_PRESENCE_TYPES = [
		{
			type: "chat",
			color: "green"
		},
		{
			type: "away",
			color: "red"
		},
		{
			type: "dnd",
			color: "yellow"
		},
		{
			type: "mobile",
			color: "white"
		}
	],
  EVENT_NAMES = [
    "error",
    "error:xmpp",
    "presence",
    "message",
    "roster:update",
    "roster",
    "online",
    "offline",
    "stanza",
    "stanza:error",
    "stanza:presence",
    "stanza:message",
    "stanza:iq",
    "stanza:unknown"
  ],
  ERRORS = [
    new Error("ChatClient(opts): This function must be called with an options object."), // ERRORS[0]
    new Error("ChatClient(opts): opts.accountName has to exist as a string."), // ERRORS[1]
    new Error("ChatClient(opts): opts.password has to exist as a string."), // ERRORS[2]
    new Error("ChatClient(opts): opts.server has to exist as a string and be one of " + Object.keys(CHAT_HOSTS).join(", ") + "."), // ERRORS[3]
    new Error("ChatClient(opts): opts.replaceLeagueChat has to be boolean."), // ERRORS[4]
    new Error("XMPP Response Error: No defined Errors found. At least one has to be defined."), // ERRORS[5]
    new Error("XMPP_PRESENCE_TYPES.getTypeFromColor(color): color is not a recognized color."), // ERRORS[6]
    new Error("XMPP_PRESENCE_TYPES.getColorFromType(type): type is not a recognized presence."), // ERRORS[7]
    new Error("new XmppClient(o): An error occurred whilst connecting to the server."), // ERRORS[8]
    new Error("client.on('stanza'): Unknown stanza type") // ERRORS[9]
  ];

// Check an XML Node for defined error tags and return a list of found tags
XMPP_DEFINED_ERROR_CONDITIONS.getErrorFromNode = function (node) {
  var i, err, errNode,
    out = [];
  for (i = 0; i < this.length; i = i + 1) {
    err = this[i];
    errNode = node.getChild(err);
    if (errNode) {
      out.push(err);
    }
  }
  return out;
};

XMPP_PRESENCE_TYPES.getTypeFromColor = function (color) {
  var i, tuple;
  for (i = 0; i < this.length; i = i + 1) {
    tuple = this[i];
    if (tuple.color.toLowerCase() === color.toLowerCase()) {
      return tuple.type;
    }
  }
  // If nothing is found:
  return undefined;
};
XMPP_PRESENCE_TYPES.getColorFromType = function (type) {
  var i, tuple;
  for (i = 0; i < this.length; i = i + 1) {
    tuple = this[i];
    if (tuple.type.toLowerCase() === type.toLowerCase()) {
      return tuple.color;
    }
  }
  // If nothing is found:
  return undefined;
};

// Main constructor method
function ChatClient(options) {
	var that = this,
		serverIsValid,
		client,
		isOnline = false,
		isClosed = false,
		host,
		password,
		friendlist = [];

	EventEmitter.call(this);

	// Options validation
	if (!options) {
		that.emit("error", ERRORS[0]); // new Error("ChatClient(opts): This function must be called with an options object.")
	}
	if (!options.accountName || typeof options.accountName !== "string") {
		that.emit("error", ERRORS[1]); // new Error("ChatClient(opts): opts.accountName has to exist as a string.")
	}
	if (!options.password || typeof options.password !== "string") {
		that.emit("error", ERRORS[2]); // new Error("ChatClient(opts): opts.password has to exist as a string.")
	}
	serverIsValid = ((!!options.server) && // .server must exist
		(typeof options.server === "string") && // .server must be a string
		(Object.keys(CHAT_HOSTS).indexOf(options.server.toUpperCase()) !== -1)); // .host must be in CHAT_HOSTS
	if (!serverIsValid) {
		that.emit("error", ERRORS[3]); // new Error("ChatClient(opts): opts.server has to exist as a string and be one of...")
	}
	if (options.replaceLeagueChat && typeof options.replaceLeagueChat !== "boolean") {
		that.emit("error", ERRORS[4]); // new Error("ChatClient(opts): opts.replaceLeagueChat has to be boolean.")
	}

	// Internal functions
	function handleErrorStanza(stanza) {
		var errorNode = stanza.getChild("error"),
			errorResponse = {
				stanzaType: stanza.getName(),
				errorType: errorNode.attrs.type
			},
			errorNodeTextNode = errorNode.getChild("text");

		if (errorNodeTextNode) {
			errorResponse.text = errorNodeTextNode.getText();
		}

    var definedErrors = XMPP_DEFINED_ERROR_CONDITIONS.getErrorFromNode(errorNode);
    if (definedErrors.length === 0) {
      that.emit("error", ERRORS[5]); // new Error("XMPP Response Error: No defined Errors found. At least one has to be defined.")
    }
		errorResponse.definedErrorConditions = definedErrors;
		errorResponse.xml = stanza.toString();

		that.emit("error:xmpp", errorResponse);
	}
	function handlePresenceStanza(stanza) {
		var jid = new Jid(stanza.attr("from")),
			showElem = stanza.getChild("show"),
			statusElem = stanza.getChild("status"),
			matchingFriends = friendlist.filter(function (friend) {
				if(jid.node+'@'+jid.domain == friend.jid){
					return jid;
				}else{
					return false;
				}
			}),
			showText,
			statusText;
		//console.log(matchingFriends)
		if (showElem) {
			showText = showElem.getText();
		}
		if (statusElem) {
			statusText = statusElem.getText();
		}

		matchingFriends.forEach(function (friend) {
			// Update friendlist
			if (showText) {
        var statusColor = XMPP_PRESENCE_TYPES.getColorFromType(showText);
				//console.log(statusText)
				//console.log(statusColor)
        if (!statusColor) {
          that.emit("error", ERRORS[7]); // new Error("XMPP_PRESENCE_TYPES.getColorFromType(type): type is not a recognized presence.")
        }
				friend.statusColor = statusColor;
				friend.online = true;
			} else {
				delete friend.statusColor;
				friend.online = false;
			}
			if (statusText) {
				friend.status = statusText;
			} else {
				delete friend.status;
			}

			// Emit presence event
			that.emit("presence", clone(friend));
		});
	}
	function handleMessageStanza(stanza) {
		var dateAttr = stanza.attr("stamp"),
			bodyElem = stanza.getChild("body"),
			message = {
				from: stanza.attr("from"),
				date: new Date(),
				body: ""
			};

		if (dateAttr) {
			message.date = new Date(dateAttr + " UTC");
		}
		if (bodyElem) {
			message.body = bodyElem.getText();
		}

		that.emit("message", message);
	}
	function handleRosterUpdate(stanza) {
		var items = stanza.getChild("query").getChildren("item");

		items.forEach(function (item) {
			var catchFail;
			var friend = friendlist.filter(function (f) {
				return f.jid === item.attr("jid");
			})[0];

			if(typeof friend != 'object'){
				console.log('catchFail - handleRosterUpdate - friend not in list')
				catchFail = true;
				friend = {};
			}
			friend.name = item.attr("name");

			var noteElement = item.getChild("note"),
				groupElement = item.getChild("group");

			if (noteElement) {
				friend.note = noteElement.getText();
			} else {
				if (friend.note) {
					delete friend.note;
				}
			}
			if (groupElement) {
				if (!friend.group) {
					friend.group = {};
				}
				friend.group.name = groupElement.getText();
				var groupPriority = groupElement.attr("priority");
				if (groupPriority) {
					friend.group.priority = parseInt(groupPriority, 10);
				} else {
					if (friend.group.priority) {
						delete friend.group.priority;
					}
				}
			} else {
				if (friend.group) {
					delete friend.group;
				}
			}
			if(!catchFail){
				that.emit("roster:update", clone(friend));
			}
		});
	}
	function handleRosterPush(stanza) {
		var items = stanza.getChild("query").getChildren("item"),
			friends = [];

		items.forEach(function (item) {
			var friend = {
					name: item.attr("name"),
					jid: item.attr("jid"),
					online: false
				},
				noteElement = item.getChild("note"),
				groupElement = item.getChild("group"),
				groupPriority;

			if (noteElement) {
				friend.note = noteElement.getText();
			}
			if (groupElement) {
				friend.group = {
					name: groupElement.getText()
				};
				groupPriority = groupElement.attr("priority");
				if (groupPriority) {
					friend.group.priority = parseInt(groupPriority, 10);
				}
			}

			friends.push(friend);
		});

		friendlist = friends;
		that.emit("roster", clone(friendlist));
	}

	// Public functions
	this.isOnline = function isOnlineFun() {
		return isOnline;
	};
	this.isClosed = function isClosedFun() {
		return isClosed;
	};
	this.getFriendlist = function getFriendlist() {
		return clone(friendlist);
	};
	this.disconnect = function disconnect() {
		if (isOnline && !isClosed) {
			isClosed = true;
			client.end();
			return true;
		} else {
			return false;
		}
	};
	this.sendMessage = function sendMessage(jid, message) {
		var stanza;
		if (!isOnline || isClosed) {
			return false;
		} else {
			stanza = new ltx.Element("message", {
				to: (jid instanceof Jid) ? jid.toString() : jid,
				type: "chat"
			}).c("body").t(message);

			client.send(stanza);
			return true;
		}
	};
	this.changeNote = function changeNote(jid, note) {
		if (!isOnline || isClosed) return false;

		var user = that.getFriendlist().filter(function (f) {
			return f.jid === jid;
		})[0];

		if (!user) return false;

		var stanza = new ltx.Element("iq", {
			type: "set",
			id: getUid("plc-roster-update")
		}).c("query", {
			xmlns: "jabber:iq:roster"
		}).c("item", {
			jid: user.jid,
			name: user.name,
			subscription: "both"
		}).c("note").t(note);

		if (user.group) {
			stanza.root().
				getChild("query").
				getChild("item").
				c("group").t(user.group.name);
			if (user.group.priority) {
				stanza.root().
					getChild("query").
					getChild("group").
					attr("priority", user.group.priority.toString());
			}
		}

		client.send(stanza);
		return true;
	};
	this.changeGroup = function changeGroup(jid, group, priority) {
		if (!isOnline || isClosed) return false;

		var user = that.getFriendlist().filter(function (f) {
			return f.jid === jid;
		})[0];

		if (!user) return false;

		var stanza = new ltx.Element("iq", {
			type: "set",
			id: getUid("plc-iq-update")
		}).c("query", {
			xmlns: "jabber:iq:roster"
		}).c("item", {
			jid: user.jid,
			name: user.name,
			subscription: "both"
		}).c("group").t(group);

		if (priority) {
			stanza.root().
				getChild("query").
				getChild("item").
				getChild("group").
				attr("priority", priority);
		}

		if (user.note) {
			stanza.root().
				getChild("query").
				getChild("item").
				c("note").t(user.note);
		}

		client.send(stanza);
		return true;
	};
	this.changePresence = function changePresence(color, status) {
		if (!isOnline || isClosed) return false;

		var statusUpdated = status ? status : "",
			type = XMPP_PRESENCE_TYPES.getTypeFromColor(color),
      presenceStanza;

    if (!type) {
      that.emit("error", ERRORS[6]); // new Error("XMPP_PRESENCE_TYPES.getTypeFromColor(color): color is not a recognized color.")
    }

    presenceStanza = new ltx.Element("presence", {}).
      c("show").t(type).up().
      c("status").t(statusUpdated);
		client.send(presenceStanza);
		return true;
	};
	this.addFriend = function addFriend(jid) {
		if (!isOnline || isClosed) return false;

		var stanza;
		stanza = new ltx.Element("presence", {
			to: jid,
			type: "subscribed"
		});
		client.send(stanza);

		var subStanza;
		subStanza = new ltx.Element("presence", {
			to: jid,
			type: "subscribe"
		});
		client.send(subStanza);

		var rosterRequest = new ltx.Element("iq", {
			type: "get",
			id: getUid("plc-roster-request")
		}).c("query", {
			xmlns: "jabber:iq:roster"
		});
		client.send(rosterRequest);

		return true;
	};
	this.removeFriend = function removeFriend(jid) {
		if (!isOnline || isClosed) return false;

		var stanza;
		stanza = new ltx.Element("presence", {
			to: jid,
			type: "unsubscribe"
		});
		client.send(stanza);
		return true;
	};
	this.getOwnJid = function getOwnJid(includeResource) {
		if (!isOnline || isClosed) return false;

		if (includeResource) {
			return new Jid(client.jid.user + "@" + client.jid.domain + "/" + client.jid.resource);
		} else {
			return new Jid(client.jid.user + "@" + client.jid.domain);
		}
	};

	// Instantiation
  var loginJid = new Jid();
  loginJid.node = options.accountName;
  loginJid.domain = CHAT_DOMAIN;
  loginJid.resource = options.replaceLeagueChat ? CHAT_STANDARD_RESOURCE : CHAT_CUSTOM_RESOURCE;

	password = CHAT_PASSWORD_PREFIX + options.password + CHAT_PASSWORD_SUFFIX;
	host = CHAT_HOSTS[options.server.toUpperCase()].url;

	try {
		client = new XmppClient({
			jid: loginJid.toString(),
			password: password,
			host: host,
			port: CHAT_PORT,
			legacySSL: true
		});
	} catch (error) {
		that.emit("error", ERRORS[8]); // new Error("new XmppClient(o): An error occurred whilst connecting to the server.")
	}

	client.on("online", function onOnline() {
		//console.log('we are online')
		var presence = new ltx.Element("presence", {}).
			c("show").t("chat").up().
			c("status").t("");

		var rosterRequest = new ltx.Element("iq", {
			type: "get",
			id: getUid("plc-roster-request")
		}).c("query", {
			xmlns: "jabber:iq:roster"
		});

    // var keepaliveJid = new Jid();
    // keepaliveJid.node = client.jid.user;
    // keepaliveJid.domain = client.jid.domain;
    // keepaliveJid.resource = CHAT_KEEPALIVE_RESOURCE;

	    // var keepalive = new ltx.Element("message", {
	    //   to: keepaliveJid.toString(),
	    //   type: "chat"
	    // }).c("body").t("keepalive");

		client.send(rosterRequest);
		client.send(presence);
    setInterval(function () {
      if (that.isOnline() && !(that.isClosed())) {
        //client.send(keepalive);
        client.send(rosterRequest);
      }
    }, CHAT_KEEPALIVE_INTERVAL);

		isOnline = true;
		that.emit("online");
	});
	client.on("offline", function onOffline() {
		that.emit("offline");
		isOnline = false;
	});
	client.on("stanza", function onStanza(stanza) {
    that.emit("stanza", stanza);
		if (stanza.attr("type") === "error") {
      that.emit("stanza:error", stanza);
			handleErrorStanza(stanza);
		} else if (stanza.is("presence")) {
      that.emit("stanza:presence", stanza);
			handlePresenceStanza(stanza);
		} else if (stanza.is("message")) {
      that.emit("stanza:message", stanza);
			handleMessageStanza(stanza);
		} else if (stanza.is("iq")) {
      that.emit("stanza:iq", stanza);
			if (stanza.attr("type") === "result") {
				var queryElement = stanza.getChild("query");
				if (queryElement && queryElement.attr("xmlns") === "jabber:iq:roster") {
					handleRosterPush(stanza);
				}
			} else if (stanza.attr("type") === "set") {
				var queryElement = stanza.getChild("query");
				if (queryElement && queryElement.attr("xmlns") === "jabber:iq:roster") {
					handleRosterUpdate(stanza);
				}
			}
		} else {
      that.emit("stanza:unknown", stanza);
			that.emit("error", ERRORS[9]); // new Error("client.on('stanza'): Unknown stanza type")
		}
	});
	client.on('error', function(data){
		//TODO parse error data
		console.log('error data', data)
		that.emit("sockerror", data)
	})
}

util.inherits(ChatClient, EventEmitter); // ChatClient extends EventEmitter

// Static fields
ChatClient.events = EVENT_NAMES;
ChatClient.leaguePresenceTypes = XMPP_PRESENCE_TYPES;
ChatClient.throws = ERRORS;

// Export class
module.exports = ChatClient;
