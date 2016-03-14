var express = require('express');
var router = express.Router();

router.use(function(req, res, next) {
    // log each request to the console
    console.log(req.method, req.url);

    // continue doing what we were doing and go to the route
    next();
});

/* GET home page. */
router.get('/LeagueChat.app', function(req, res, next) {
    var file =  + '../tmpapps/LeagueChat.dmg';
    res.download(file); // Set disposition and send it.
});

router.get('/LeagueChat.zip', function(req, res, next) {
    var file =  + '../tmpapps/LeagueChat.zip';
    res.download(file); // Set disposition and send it.
});

module.exports = router;
