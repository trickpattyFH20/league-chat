//init app
var app = angular.module('myApp', ['ui.router', 'ngAnimate', 'ui.bootstrap', 'ngTouch', 'dialogs.main']);

app.config(function($stateProvider, $urlRouterProvider, $locationProvider) {
    //
    // For any unmatched url, redirect to /state1
    $locationProvider.html5Mode(true)
    $urlRouterProvider.otherwise("/home");
    //
    // Now set up the states
    //TODO dont user mainCtrl for other states
    $stateProvider
        .state('home', {
            url: "/home",
            templateUrl: "angular-partials/home.html",
            controller:'loginCtrl'
        })
        .state('about', {
            url: "/about",
            templateUrl: "angular-partials/about.html",
            controller:'aboutCtrl'
        })
        .state('chat', {
            url: "/chat",
            templateUrl:"angular-partials/chat.html",
            controller:'chatCtrl'
        })
});

app.factory('socketService', function($http){
    var svc = {}
    svc.env = {'path': undefined},
    svc.creds = {},
    svc.getEnv = function(){
        return $http({
            method: 'GET',
            url: '/service/devservice',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'}  // set the headers so angular passing info as form data (not request payload)
        })
            .success(function (data) {
                //console.log('success')
            })
            .error(function (data) {
                //console.log(data)
                console.log('error');
            });
    },
    svc.connection = function(env){
        //console.log(env)
        if(env == '/Users/Patrick'){
            //console.log('dev config', env)
            return io.connect('http://localhost:8080',{'forceNew': true});
        }else if(env == 'windows'){
            //console.log('live config', env)
            return io.connect("127.0.0.1:8080", {'forceNew': true});
        }else{
            //console.log('live config', env)
            return io.connect("http://weblolchat2-weblolchat.rhcloud.com:8000", {'forceNew': true});
        }
        //console.log(this.getEnv().success(function(data){return data}))
    },
    svc.currentConnection = function(){
        return svc.connection;
    }
    return svc;
})

app.factory('friendList', function(){
    var svc = {};
    svc.list = [];
    svc.shortIds = function(){
        for(var i=0;i < svc.list.length;i++){
            jidEnd = svc.list[i].jid.indexOf('@')
            svc.list[i].shortId = svc.list[i].jid.slice(3, jidEnd)
        }
    }
    svc.online = [];

    svc.newPresence = function(friend) {
        var jidEnd = friend.jid.indexOf('@')
        friend.shortId = friend.jid.slice(3, jidEnd)
        if(!friend.messages){
            friend.messages = [];
        }
        friend.unread = 0;

        //if already in list, don't add to online
        // (presence changes for away / status updates / in game upadates)
        var foundOffline = {'presence':false, 'idx':undefined};
        var foundOnline= {'presence':false, 'idx':undefined};
        //is friend in offline list?
        for(var i=0;i<svc.list.length;i++) {
            if (friend.shortId == svc.list[i].shortId) {
                foundOffline.presence = true;
                foundOffline.idx = i
                //found offline
            }
        }
        //is friend in online list?
        for(var j=0;j < svc.online.length;j++) {
            if (friend.shortId == svc.online[j].shortId) {
                foundOnline.presence = true;
                foundOnline.idx = j;
                //found online
            }
        }
        if(friend.online == true){
        //if new friend is online
            if(foundOffline.presence == true){
                //if friend is in total list, remove it and push to online
                if(svc.list[foundOffline.idx].messages){
                    friend.messages = angular.copy(svc.list[foundOffline.idx].messages)
                }
                svc.list.splice(foundOffline.idx, 1)
            }
            if(foundOnline.presence){
                svc.online[foundOnline.idx] = friend
            }else{
                svc.online.push(friend)
            }
        }else if(friend.online == false){
        //if new friend is offline
            if(foundOffline.presence){
                svc.list[foundOffline.idx] = friend
                //break;
            }else{
                svc.list.push(svc.online[foundOnline.idx])
                //break;
            }
            if(foundOnline.presence){
                svc.online.splice(foundOnline.idx, 1)
            }
        }

        /*switch(friend.online) {
            case true:
                var found = false;
                //if already in list, don't add to online
                // (presence changes for away / status updates / in game upadates)
                for(var i=0;i<svc.online.length;i++){
                    if(friend.name == svc.online[i].name){
                        found = true;
                        break;
                    }
                }
                //if they aren't in the online list, add them
                if(found == false){
                    friend.messages = [];
                    friend.unread = 0;
                    jidEnd = friend.jid.indexOf('@')
                    shortId = friend.jid.slice(3, jidEnd)
                    friend.shortId = shortId
                    svc.online.push(friend);
                }
                break;
            case false:
                for(var i=0;i<svc.online.length;i++){
                    if(friend.name == svc.online[i].name){
                        svc.online.splice(i, 1)
                    }
                }
                break;
            default:twit
            console.log('unrecognized presence')
        }*/
    };
    svc.newMessage = function(newMsg, isCurrent) {
        if(newMsg.from == 'self'){
            for(var i=0;i<svc.online.length;i++){
                thisJid = svc.online[i].shortId
                if(newMsg.to == thisJid){
                    svc.online[i].messages.push(newMsg)
                    break
                }
            }
        }else{
            var idEnd = newMsg.from.indexOf('@')
            var thisId = newMsg.from.slice(3, idEnd);
            //TODO use shortId
            for(var i=0;i<svc.online.length;i++){
                thisJid = svc.online[i].shortId
                if(thisId == thisJid){
                    svc.online[i].messages.push(newMsg)
                    if(isCurrent == false){
                        svc.online[i].undread = svc.online[i].unread++
                    }
                    break
                }
            }
        }
    }

    return svc;
})

app.controller('mainCtrl', ['$scope', '$http', 'socketService', function($scope, $http, socketService){

}]);

app.controller('loginCtrl',
    ['$scope', '$rootScope', '$timeout', '$http', 'socketService', '$state', 'friendList',
        function ($scope, $rootScope, $timeout, $http, socketService, $state, friendList) {

            $scope.formData = {};
            $scope.formData.server = 'NA';

            $scope.login = function(){
                socketService.creds = $scope.formData;
                $state.go('chat')
            }

            $scope.about = function(){
                $state.go('about')
            }
}]);

app.controller('chatCtrl', ['$scope', '$state', '$http', 'socketService', 'friendList', 'dialogs', function($scope, $state, $http, socketService, friendList, dialogs){

    $scope.formData = {};
    $scope.showMsg = false;

    //TODO change this to check if user is authed
    if(!socketService.creds.username){
        $state.go('home')
    }

    socketService.getEnv().success(function (data) {
        console.log(data)
        $scope.socket = socketService.connection(data.env)
        $scope.socket.emit('auth', socketService.creds);
    })
    //for production pass in param to io("http://weblolchat-weblolchat.rhcloud.com:8000")

    $scope.onlineFriends = [];

    $scope.$watch('socket', function (ov, nv) {
        if ($scope.socket) {
            console.log('socket is set')
            $scope.socket.on('online', function () {
                $scope.$apply()
            })
            $scope.socket.on('roster', function (list) {
                friendList.list = list
                friendList.shortIds();
                $scope.offlineFriends = friendList.list
                $scope.$apply()
            })
            $scope.socket.on('updatefriend', function (friend) {
                //TODO remove timeout and rework:
                if(friend.online == false){
                    if($scope.currentMessages){
                        //TODO make this work with short id
                        if($scope.currentMessages.jid == friend.jid){
                            $scope.currentMessages = undefined;
                            $scope.showMsg = false;
                        }
                    }
                }
                friendList.newPresence(friend)
                $scope.onlineFriends = friendList.online
                $scope.$apply()

            })
            $scope.socket.on('message', function (message) {
                //TODO do this to message counter : http://stackoverflow.com/questions/275931/how-do-you-make-an-element-flash-in-jquery
                var isCurrent = false;
                if($scope.currentMessages){
                    var idEnd = message.from.indexOf('@')
                    var thisId = message.from.slice(3, idEnd);
                    if($scope.currentMessages.shortId == thisId){
                        isCurrent = true;
                    }
                }
                friendList.newMessage(message, isCurrent);
                $scope.$apply()
            })
            $scope.socket.on('clienterror', function (msg) {
                console.log('caught it')
                console.log(msg)
                dialogs.notify('Login Error', msg).result.then(function(btn){
                    $scope.confirmed = 'You confirmed "Yes."';
                    console.log('yes')
                    $state.go('home')
                },function(btn){
                    $scope.confirmed = 'You confirmed "No."';
                    console.log('no')
                    $state.go('home')
                });
                $scope.$apply()
            })
        }
    })

    $scope.$on("$stateChangeStart",   function(evt, to, toP, from, fromP){
        $scope.socket.emit('forceDisconnect')
        socketService.creds = {};
        friendList.online = [];
        $scope.socket = undefined;
    });

    //old ctrl
    $scope.showMessages = function(shortId){
        $scope.showMsg = true
        for(var i=0;i<friendList.online.length;i++){
            if(shortId == friendList.online[i].shortId){
                friendList.online[i].unread = 0;
                $scope.currentMessages = friendList.online[i]
            }
        }
    }
    $scope.sendNew = function(){
        console.log('send new function')
        $scope.socket.emit('sendMessage', {'jid':$scope.currentMessages.jid, 'message':$scope.formData.message});
        friendList.newMessage(
            {
                'to':angular.copy($scope.currentMessages.shortId),
                'from':'self',
                'body':angular.copy($scope.formData.message),
                'date':new Date()
            },
            undefined);
        $scope.formData.message = '';
    }
    $scope.showSide = function(){
        $scope.currentMessages = undefined;
        $scope.showMsg = false;
    }
}]);

app.controller('aboutCtrl', ['$scope', '$state', '$http', 'socketService', function($scope, $state, $http, socketService){
    $scope.login = function(){
        $state.go('home')
    }
}]);

app.directive('ngEnter', function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            if(event.which === 13) {
                event.preventDefault();
                if(element[0]['value'] && element[0]['value']){
                    scope.$apply(function (){
                        scope.$eval(attrs.ngEnter);
                    });
                    event.preventDefault();
                }
            }
        });
    };
});

app.directive('resize', function ($window) {
    return function (scope, element) {
        var w = angular.element($window);
        scope.getWindowDimensions = function () {
            return {
                'h': w.height(),
                'w': w.width()
            };
        };
        scope.$watch(function() {return element[0].scrollHeight }, function(n, o){
            element[0].scrollTop = element[0].scrollHeight;
        });
        scope.$watch(scope.getWindowDimensions, function (newValue, oldValue) {
            scope.windowHeight = newValue.h;
            scope.windowWidth = newValue.w;

            scope.style = function () {
                return {
                    'height': (newValue.h - 134) + 'px'
                };
            };

        }, true);

        w.bind('resize', function () {
            scope.$apply();
        });
    }
})

app.filter('onlineColorFilter', function(){
    return function(input, color){
        var out = [];
        for(var i=0;i<input.length;i++){
            if(input[i].statusColor){
                if(input[i].statusColor == color){
                        out.push(input[i])
                    }
            }
        }
        return out;
    }
})
