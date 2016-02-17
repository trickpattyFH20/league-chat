var express = require('express');
var router = express.Router();
router.use(function(req, res, next) {
    // log each request to the console
    // continue doing what we were doing and go to the route
    res.locals.env = process.env.HOME
    if(process.env.windir){
        res.locals.env = 'windows'
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

router.post('/', function(req, res, next) {
    console.log('in post')
    res.send([{1:'test'}])
    //login(req.params.username, req.params.password, req.params.server)
});

module.exports = router;
