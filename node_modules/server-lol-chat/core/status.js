/*jslint node: true */
//"use strict";

var stringFormat = require("util").format;

// Globals
var QUEUE_TYPES = [
  {
    name: "NONE",
    ranked: false,
    mode: "Custom",
  }, {
    name: "NORMAL",
    bots: false,
    ranked: false,
    mode: "Classic",
    map: "Summoner's Rift",
    playerCount: 5
  }, {
    name: "NORMAL_3x3",
    bots: false,
    ranked: false,
    mode: "Classic",
    map: "Twisted Treeline",
    playerCount: 3
  }, {
    name: "ODIN_UNRANKED",
    bots: false,
    ranked: false,
    mode: "Dominion",
    map: "Crystal Scar",
    playerCount: 5
  }, {
    name: "ARAM_UNRANKED_5x5",
    bots: false,
    ranked: false,
    mode: "ARAM",
    map: "Howling Abyss",
    playerCount: 5
  }, {
    name: "BOT",
    bots: true,
    ranked: false,
    mode: "Co-op vs. AI",
    map: "Summoner's Rift",
    playerCount: 5
  }, {
    name: "BOT_3x3",
    bots: true,
    ranked: false,
    mode: "Co-op vs. AI",
    map: "Twisted Treeline",
    playerCount: 3
  }, {
    name: "RANKED_SOLO_5x5",
    bots: false,
    ranked: true,
    mode: "Classic",
    map: "Summoner's Rift",
    playerCount: 5,
    team: false
  }, {
    name: "RANKED_TEAM_3x3",
    bots: false,
    ranked: true,
    mode: "Classic",
    map: "Twisted Treeline",
    playerCount: 3,
    team: true
  }, {
    name: "RANKED_TEAM_5x5",
    bots: false,
    ranked: true,
    mode: "Classic",
    map: "Summoner's Rift",
    playerCount: 5,
    team: true
  }, {
    name: "ONEFORALL_5x5",
    bots: false,
    ranked: false,
    mode: "One for All",
    map: "Summoner's Rift",
    playerCount: 5
  }, {
    name: "FIRSTBLOOD_1x1",
    bots: false,
    ranked: false,
    mode: "Snowdown Showdown",
    map: "Summoner's Rift", // TODO: Check if map is correct
    playerCount: 1
  }, {
    name: "FIRSTBLOOD_2x2",
    bots: false,
    ranked: false,
    mode: "Snowdown Showdown",
    map: "Summoner's Rift", // TODO: Check if map is correct
    playerCount: 2
  }, {
    name: "SR_6x6",
    bots: false,
    ranked: false,
    mode: "Hexakill",
    map: "Summoner's Rift",
    playerCount: 6
  }, {
    name: "CAP_5x5",
    bots: false,
    ranked: false,
    mode: "Teambuilder",
    map: "Summoner's Rift",
    playerCount: 5
  }, {
    name: "URF",
    bots: false,
    ranked: false,
    mode: "Ultra Rapid Fire",
    map: "Summoner's Rift",
    playerCount: 5
  }, {
    name: "URF_BOT",
    bots: true,
    ranked: false,
    mode: "Ultra Rapid Fire",
    map: "Summoner's Rift",
    playerCount: 5
  }
]; // https://developer.riotgames.com/docs/game-constants
QUEUE_TYPES.getByName = function (name) {
  var i, type;
  for (i = 0; i < this.length; i = i + 1) {
    type = this[i];
    if (type.name.toLowerCase() === name.toLowerCase()) {
      return type;
    }
  }
  return undefined;
};
var TIERS = [
  "BRONZE",
  "SILVER",
  "GOLD",
  "PLATINUM",
  "DIAMOND",
  "CHALLENGER"
]; // TODO: Check for typos and if there is a unranked tier
var DIVISIONS = [
  { name: "I", number: 1 },
  { name: "II", number: 2 },
  { name: "III", number: 3 },
  { name: "IV", number: 4 },
  { name: "V", number: 5 }
];
DIVISIONS.getByName = function (name) {
  var i, division;
  for (i = 0; i < this.length; i = i + 1) {
    division = this[i];
    if (division.name.toLowerCase() === name.toLowerCase()) {
      return division;
    }
  }
  return undefined;
};
DIVISIONS.getByNumber = function (number) {
  var i, division;
  for (i = 0; i < this.length; i = i + 1) {
    division = this[i];
    if (division.number === number) {
      return division;
    }
  }
  return undefined;
};
var STATES = [
  {
    name: "inGame",
    playing: true,
    arranging: false,
    queue: false,
    idle: false
  }, {
    name: "outOfGame",
    playing: false,
    arranging: false,
    queue: false,
    idle: true
  }, {
    name: "championSelect",
    playing: false,
    arranging: true,
    queue: false,
    idle: false
  }, {
    name: "inTeamBuilder",
    playing: false,
    arranging: true,
    queue: false,
    idle: false
  }, {
    name: "inQueue",
    playing: false,
    arranging: false,
    queue: true,
    idle: false
  }, {
    name: "hostingPracticeGame",
    playing: false,
    arranging: true,
    queue: false,
    idle: false
  }, {
    name: "hostingCoopVsAIGame",
    playing: false,
    arranging: true,
    queue: false,
    idle: false
  }, {
    name: "hostingNormalGame",
    playing: false,
    arranging: true,
    queue: false,
    idle: false
  }, {
    name: "hostingRankedGame",
    playing: false,
    arranging: true,
    queue: false,
    idle: false
  }, {
    name: "tutorial",
    playing: true,
    arranging: false,
    queue: false,
    idle: false
  }
]; // TODO: Check if list is complete
STATES.getByName = function (name) {
  var i, state;
  for (i = 0; i < this.length; i = i + 1) {
    state = this[i];
    if (state.name.toLowerCase() === name.toLowerCase()) {
      return state;
    }
  }
  return undefined;
};

// Postprocessors
var pp = {
	string: function (input) {
		return input;
	},
	number: function (input) {
		var parsed = parseInt(input, 10);
		if (isNaN(parsed)) {
			return undefined;
		} else {
			return parsed;
		}
	},
	posNumber: function (input) {
		var number = pp.number(input);
		if (number && number >= 0) {
			return number;
		} else {
			return undefined;
		}
	},
	level: function (input) {
		var number = pp.number(input);
		if (number && number >= 1 && number <= 30) {
			return number;
		} else {
			return undefined;
		}
	},
	queue: function (input) {
		return QUEUE_TYPES.getByName(input);
	},
	tier: function (input) {
		if (TIERS.indexOf(input) !== -1) {
			return input;
		} else {
			return undefined;
		}
	},
	division: function (input) {
		return DIVISIONS.getByName(input);
	},
	status: function (input) {
    return STATES.getByName(input);
	},
	timestamp: function (input) {
		var number = pp.number(input),
			date = new Date(number);

		if (isNaN(date.getTime())) {
			return undefined;
		} else {
			return date;
		}
	}
};

function matchXml(source, element, postprocessor) {
	var regex = new RegExp("<" + element + ">(.+)</" + element + ">"),
		match = source.match(regex);
	if (match) {
		return postprocessor(match[1]);
	} else {
		return undefined;
	}
}

function prepareStatusString(statusString) {
	var s = statusString;
  s = s.replace(/&amp;/g, "&");
	s = s.replace(/&lt;/g, "<");
	s = s.replace(/&gt;/g, ">");
	s = s.replace(/&apos;/g, "'");
	return s;
}

function escapeStatusString(statusString) {
  var s = statusString;
  s = s.replace(/</g, "&lt;");
  s = s.replace(/>/g, "&gt;");
  s = s.replace(/'/g, "&apos;");
  return s;
}

// Main Constructor Function
function LeagueStatus(statusData) {
  var d;
  if (typeof statusData === "string") {
    d = parseStatusString(statusData);
  } else if (typeof statusData === "object") {
    d = {
      profileIcon: statusData.profileIcon || 1,
      level: statusData.level || 1,
      wins: statusData.wins || 0,
      queueType: statusData.queueType || undefined,
      tier: statusData.tier || undefined,
      rankedLeagueName: statusData.rankedLeagueName || undefined,
      rankedLeagueDivision: statusData.rankedLeagueDivision || undefined,
      rankedLeagueTier: statusData.rankedLeagueTier || undefined,
      rankedLeagueQueue: statusData.rankedLeagueQueue || undefined,
      rankedWins: statusData.rankedWins || 0,
      statusMsg: statusData.statusMsg || "using http://league.chat",
      skinname: statusData.skinname || undefined,
      gameQueueType: statusData.gameQueueType || undefined,
      gameStatus: statusData.gameStatus || undefined,
      timestamp: statusData.timestamp || undefined
    };
  } else {
    d = {
      profileIcon: 1,
      level: 1,
      wins: 0,
      queueType: undefined,
      tier: undefined,
      rankedLeagueName: undefined,
      rankedLeagueDivision: undefined,
      rankedLeagueTier: undefined,
      rankedLeagueQueue: undefined,
      rankedWins: 0,
      statusMsg: "using http://league.chat",
      skinname: undefined,
      gameQueueType: undefined,
      gameStatus: undefined,
      timestamp: undefined
    };
  }

  this.summoner = {
    iconId: d.profileIcon,
    level: d.level,
    wins: d.wins,
    message: d.statusMsg
  };
  this.currentGame = {
    champion: d.skinname,
    queue: d.gameQueueType,
    status: d.gameStatus,
    date: d.timestamp
  };
  this.ranked = {
    wins: d.rankedWins,
    tier: d.rankedLeagueTier,
    division: d.rankedLeagueDivision,
    league: d.rankedLeagueName,
    queue: d.rankedLeagueQueue
  };
  return this;
}
LeagueStatus.prototype.toString = function () {
  return createStatusString({
    profileIcon: this.summoner.iconId,
    level: this.summoner.level,
    wins: this.summoner.wins,
    tier: undefined,
    queueType: undefined,
    statusMsg: this.summoner.message,
    skinname: this.currentGame.champion,
    gameQueueType: this.currentGame.queue,
    gameStatus: this.currentGame.status,
    timestamp: this.currentGame.date,
    rankedWins: this.ranked.wins,
    rankedLeagueTier: this.ranked.tier,
    rankedLeagueDivision: this.ranked.division,
    rankedLeagueName: this.ranked.league,
    rankedLeagueQueue: this.ranked.queue,
    leaves: 0,
    odinWins: 0,
    odinLeaves: 0,
    rankedLosses: 0,
    rankedRating: 0
  });
};

function createStatusString(rawData) {
  var template = "<body>" +
      "<profileIcon>%d</profileIcon>" +
      "<level>%d</level>" +
      "<wins>%d</wins>" +
      "<leaves>%d</leaves>" +
      "<odinWins>%d</odinWins>" +
      "<odinLeaves>%d</odinLeaves>" +
      "<queueType>%s</queueType>" +
      "<rankedLosses>%d</rankedLosses>" +
      "<rankedRating>%d</rankedRating>" +
      "<tier>%s</tier>" +
      "<rankedLeagueName>%s</rankedLeagueName>" +
      "<rankedLeagueDivision>%s</rankedLeagueDivision>" +
      "<rankedLeagueTier>%s</rankedLeagueTier>" +
      "<rankedLeagueQueue>%s</rankedLeagueQueue>" +
      "<rankedWins>%d</rankedWins>" +
      "<statusMsg>%s</statusMsg>" +
      "<skinname>%s</skinname>" +
      "<gameQueueType>%s</gameQueueType>" +
      "<gameStatus>%s</gameStatus>" +
      "<timeStamp>%d</timeStamp>" +
      "</body>",
    s = stringFormat(template,
      rawData.profileIcon,
      rawData.level,
      rawData.wins,
      rawData.leaves,
      rawData.odinWins,
      rawData.odinLeaves,
      rawData.queueType ? rawData.queueType.name : "",
      rawData.rankedLosses,
      rawData.rankedRating,
      rawData.tier ? rawData.tier.name : "",
      rawData.rankedLeagueName ? rawData.rankedLeagueName : "",
      rawData.rankedLeagueDivision ? rawData.rankedLeagueDivision.name : "",
      rawData.rankedLeagueTier ? rawData.rankedLeagueTier : "",
      rawData.rankedLeagueQueue ? rawData.rankedLeagueQueue.name : "",
      rawData.rankedWins,
      rawData.statusMsg ? rawData.statusMsg : "",
      rawData.skinname ? rawData.skinname : "",
      rawData.gameQueueType ? rawData.gameQueueType.name : "",
      rawData.gameStatus ? rawData.gameStatus.name : "",
      rawData.timestamp ? rawData.timestamp.getTime() : 0
    );

  return escapeStatusString(s);
}

function parseStatusString(statusString) {
	var s = prepareStatusString(statusString),
		rawData = {
			profileIcon: matchXml(s, "profileIcon", pp.number), // used
			level: matchXml(s, "level", pp.level), // used
			wins: matchXml(s, "wins", pp.posNumber), // probably used
			leaves: matchXml(s, "leaves", pp.posNumber), // probably unused
			odinWins: matchXml(s, "odinWins", pp.posNumber), // probably unused
			odinLeaves: matchXml(s, "odinLeaves", pp.posNumber), // probably unused
			queueType: matchXml(s, "queueType", pp.queue), // used
			rankedLosses: matchXml(s, "rankedLosses", pp.posNumber), // probably unused
			rankedRating: matchXml(s, "rankedLosses", pp.number), // probably unused
			tier: matchXml(s, "tier", pp.tier), // probably used
			rankedLeagueName: matchXml(s, "rankedLeagueName", pp.string), // used
			rankedLeagueDivision: matchXml(s, "rankedLeagueDivision", pp.division), // used
			rankedLeagueTier: matchXml(s, "rankedLeagueTier", pp.tier), // probably used
			rankedLeagueQueue: matchXml(s, "rankedLeagueQueue", pp.queue), // probably used
			rankedWins: matchXml(s, "rankedWins", pp.posNumber), // used
			statusMsg: matchXml(s, "statusMsg", pp.string), // used
			skinname: matchXml(s, "skinname", pp.string), // used; acually holding champion name?
			gameQueueType: matchXml(s, "gameQueueType", pp.queue), // used
			gameStatus: matchXml(s, "gameStatus", pp.status), // used
			timestamp: matchXml(s, "timeStamp", pp.timestamp) // used
		};
	return rawData;
}

module.exports = LeagueStatus;
