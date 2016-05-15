var ERRORS = {
  0: new Error("constructor parameter type error"),
  1: new Error("invalid jid error"),
  2: new Error("jid domain part missing error")
};

function Jid (jidString) {
  if (typeof jidString === "string") {
    var j = Jid.parse(jidString);
    this.node = j.node;
    this.domain = j.domain;
    this.resource = j.resource;
  } else if (typeof jidString === "undefined") {
    this.node = undefined;
    this.domain = undefined;
    this.resource = undefined;
  } else {
    throw ERRORS[0]; // constructor parameter type error
  }
}

Jid.throws = ERRORS;
Jid.regex = (/^(?:[^@]+@)?[a-zA-Z0-9.-]+\.[a-zA-Z]+(?:\/[^/]+)?$/);

Jid.compare = function compareJids(jid1, jid2, strict) {
  if (strict) {
    return ((jid1.node === jid2.node) &&
      (jid1.domain === jid2.domain) &&
      (jid1.resource === jid2.resource));
  } else {
    return ((jid1.node === jid2.node) &&
      (jid1.domain === jid2.domain));
  }
};
Jid.combine = function combineJid(jid) {
  if (!jid.domain) {
    throw ERRORS[2]; // jid domain part missing error
  }

  var output = "";
  if (jid.node) {
    output += jid.node + "@";
  }
  output += jid.domain;
  if (jid.resource) {
    output += "/" + jid.resource;
  }
  return output;
};
Jid.validate = function validateJid(jidString) {
  return Jid.regex.test(jidString);
};
Jid.parse = function parseJid(jidString) {
  if (!(Jid.validate(jidString))) {
    throw ERRORS[1]; // invalid jid error
  }

  var p1 = jidString.split("/"),
    p2 = p1[0].split("@");

  return {
    node: p2[p2.length - 2],
    domain: p2[p2.length - 1],
    resource: p1[1]
  };
};

Jid.prototype.equals = function (jid, strict) {
  return Jid.compare(this, jid, strict);
} ;
Jid.prototype.toString = function () {
  return Jid.combine(this);
};
Jid.prototype.combine = function () {
  return Jid.combine(this);
};

module.exports = Jid;
