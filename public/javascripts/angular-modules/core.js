//init app
var app = angular.module('myApp', ['ui.router', 'ngAnimate', 'ui.bootstrap', 'ngTouch']);

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
        .state('chat', {
            url: "/chat",
            templateUrl:"angular-partials/chat.html",
            controller:'chatCtrl'
        })
});

app.service('socketService', function($http){
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
        console.log(env)
        if(env == '/Users/Patrick'){
            console.log('dev config', env)
            return io();
        }else{
            console.log('live config', env)
            return io("http://weblolchat2-weblolchat.rhcloud.com:8000");
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
    svc.online = [];

    svc.newPresence = function(friend) {
        switch(friend.online) {
            case true:
                var found = false;
                for(var i=0;i<svc.online.length;i++){
                    if(friend.name == svc.online[i].name){
                        found = true;
                        break;
                    }
                }
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
            default:
            console.log('unrecognized presence')
        }
        if(friend.online == true){

        }
    };
    svc.newMessage = function(newMsg, isCurrent) {
        console.log(newMsg)
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

            $scope.login = function () {
                console.log('in login func')
                socketService.creds = $scope.formData;
                $state.go('chat')
            }
}]);

app.controller('chatCtrl', ['$scope', '$state', '$http', 'socketService', 'friendList', function($scope, $state, $http, socketService, friendList){

    $scope.formData = {};
    $scope.showMsg = false;

    window.addEventListener('activate', function(){
        alert('tab activated')
    })

    if(!socketService.creds.username){
        $state.go('home')
    }

    socketService.getEnv().success(function (data) {
        console.log(data)
        $scope.socket = socketService.connection(data.env)
        $scope.socket.emit('auth', socketService.creds);
    })
    //for production pass in param to io("http://weblolchat-weblolchat.rhcloud.com:8000")

    $scope.onlineFriends = []

    $scope.$watch('socket', function (ov, nv) {
        console.log($scope.socket)
        if ($scope.socket) {
            $scope.socket.on('online', function () {
                console.log('online clientside event')
                $scope.$apply()
            })
            $scope.socket.on('roster', function (list) {
                //$scope.friends = list;
                //$scope.$apply()
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
                        console.log('crrent message id is this message id')
                        isCurrent = true;
                    }
                }
                friendList.newMessage(message, isCurrent);
                $scope.$apply()
            })
            $scope.socket.on('clienterror', function (msg) {
                console.log('caught it')
                console.log(msg)
                $scope.$apply()
            })
        }
    })

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
        $scope.showMsg = false;
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