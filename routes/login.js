var express = require('express');
var router = express.Router();

router.use(function(req, res, next) {
    // log each request to the console
    console.log(req.method, req.url);

    // continue doing what we were doing and go to the route
    next();
});

/* GET home page. */
router.get('/', function(req, res, next) {
    //res.render('main');
});

router.post('/', function(req, res, next) {
    login(req.params.username, req.params.password, req.params.server)
    res.send([{1:'fags'}])
});

module.exports = router;
