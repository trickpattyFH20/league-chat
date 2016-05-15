var uids = [];

module.exports = function getUid(namespace) {
  var timestamp = (new Date()).getTime(),
    n = 0,
    uid;

  do {
    uid = namespace + "-" + timestamp + "-" + n;
    n = n + 1;
  } while (uids.indexOf(uid) !== -1)

  uids.push(uid);
  return uid;
};
