var express = require('express');
var router = express.Router();
var https = require('https');

router.use(function(req, res, next) {
    // log each request to the console
    // continue doing what we were doing and go to the route
    res.locals.env = process.env.HOME
    if(process.env.windir){
        res.locals.env = 'windows'
    }else if(process.env.TERM_PROGRAM){
        res.locals.env = 'osx'
    }
    next();
});

/* GET home page. */
router.get('/devservice', function(req, res, next) {
    // console.log('type =', typeof res)
    // if(typeof res == 'undefined'){
    //     res = {}
    //     res.locals = 'windows'
    // }
    // console.log('res.locals', res.locals)
    res.send(res.locals);
});
router.get('/', function(req, res, next) {
    res.render('main', res.locals);
});

router.post('/addfriend', function(req, res, next) {
    var apiPath = '/api/lol/na/v1.4/summoner/by-name/'+ req.body.summonerName +'?api_key=60c646ae-34ae-44d6-9f38-1dc7f7f22dd5'
    var options = {
        host: 'na.api.pvp.net',
        path: apiPath,
        method: 'GET'
    };
    var apiData;
    var reqGet = https.request(options, function(apires) {

        apires.on('data', function(d) {
            apiData = JSON.parse(d)
            res.send([{1:apiData}]);
        });

    });

    reqGet.end();
    reqGet.on('error', function(e) {
        console.error(e);
    });

    //login(req.params.username, req.params.password, req.params.server)
});

router.post('/', function(req, res, next) {
    console.log('in post')
    res.send([{1:'test'}])
    //login(req.params.username, req.params.password, req.params.server)
});

module.exports = router;
