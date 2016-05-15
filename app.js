var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var http = require('http');

var routes = require('./routes/index');
var tmpapps = require('./routes/tmpapps');
var login = require('./routes/login');

var app = express();

// view engine setup
// oh no... it crashed
// FORCE PUSHHHH
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/service', routes);
app.use('/login', login);
app.use('/tmpapps', tmpapps);
app.use('/*', routes);


//fallback to main html5mode angular
app.all('/!*', function(req, res, next) {
  // Just send the index.html for other files to support HTML5Mode
  res.render('main');
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});
// error handlers

// development error handler
// will print stacktrace
// if (app.get('env') === 'development') {
//   app.use(function(err, req, res, next) {
//     res.status(err.status || 500);
//     res.render('error', {
//       message: err.message,
//       error: err
//     });
//   });
// }
//
// // production error handler
// // no stacktraces leaked to user
// app.use(function(err, req, res, next) {
//   res.status(err.status || 500);
//   res.render('error', {
//     message: err.message,
//     error: {}
//   });
// });

var debug = require('debug');

var port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

var server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */

//server.listen(port);
var server_port = process.env.OPENSHIFT_NODEJS_PORT || 8080
var server_ip_address = '127.0.0.1';

server.timeout = 0;

if(process.env.EC2_HOME){
  server.listen(server_port)
  console.log("Listening on server_port " + server_port)
}else{
  server.listen(server_port, server_ip_address, function(){
      console.log("Listening on " + server_ip_address + ", server_port " + server_port)
  });
}
//server.on('error', onError);
server.on('error', function(){'catch the error plox'});
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
      ? 'Pipe ' + port
      : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
      ? 'pipe ' + addr
      : 'port ' + addr.port;
  debug('Listening on ' + bind);
}

//socket.io
var io = require('socket.io').listen(server);

//lol dependencies
var Client = require("server-lol-chat"),
    fs = require("fs"),
    should = require("should"),
    parseStatus = require("./node_modules/server-lol-chat/src/status")

io.sockets.on('connection', function (socket) {
  var client;
  socket.on('auth', function(data){
    (function login(){
      var credentials = {
            "accounts": [
              {
                "accountName": data.username,
                "password": data.password,
                "server": data.server
              }
            ]
          },
          userCredentials = credentials.accounts[0];

      client = new Client(userCredentials);
      client.on("stanza", function onStanza(stanza) {
        console.log('new stanza')
        console.log(stanza)
        socket.emit('stanza', stanza);
      });
      client.on("online", function(){
        //console.log('we are online! send success back')
        socket.emit('online', 'success');
        var emptyStatus = {};
        var statusInstance = new parseStatus({
            statusMsg:'on http://league.chat',
            gameStatus:{
                name:'mobile'
            }
        });
        var updatedStatus = statusInstance.toString();
        client.changePresence('white', updatedStatus);
      });
      client.on("roster", function () {
        //console.log('we have the roster')
        var friends = client.getFriendlist()
        //console.log(friends)
        socket.emit('roster', friends);
      });
      client.on("presence", function (friend) {
        //console.log('presence update')
        friend.statusObj = {}
        //console.log(parseStatus(friend.status))
        parseStatus.call(friend.statusObj, friend.status);
        socket.emit('updatefriend', friend);
      });
      client.on("message", function (message) {
        //console.log('message received')
        socket.emit('message', message);
      });
      /*client.on("error", function(msg){
        console.log(msg)
        //socket.emit('clienterror', msg);
      })*/
      client.on("sockerror", function(msg){
        console.log(msg)
        socket.emit('clienterror', msg);
      })
    })();
  })
  socket.on('sendMessage', function(data){
    client.sendMessage(data.jid, data.message)
  })
  socket.on('addFriend', function(data){
    client.addFriend(data.jid)
  })
  socket.on('removeFriend', function(data){
    client.removeFriend(data.jid)
  })
  socket.on('error', function(msg){
    console.log('error handler', msg)
  })
  socket.on('forceDisconnect', function(){
    console.log('force disconnect')
    socket.disconnect(true)
    if(typeof client != "undefined" && client != null){
      client.disconnect()
    }
  })
  socket.on('disconnect', function() {
    if(typeof client != "undefined" && client != null){
      client.disconnect()
    }
    /*console.log('Got disconnect!');
    socket.disconnect(true)
    if(typeof client != "undefined" && client != null){
      client.disconnect()
    }*/
  });
});

module.exports = app;
