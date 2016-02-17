(function(){
    angular
    .module('myApp')
    .controller('chatCtrl', chatCtrl)

    chatCtrl.$inject = ['$scope', '$state', '$http', 'socketService', 'friendList', 'dialogs']

    function chatCtrl($scope, $state, $http, socketService, friendList, dialogs){

        var vm = this;

        vm.formData = {};
        vm.showMsg = false;

        //TODO change this to check if user is authed
        if(!socketService.creds.username){
            $state.go('home')
        }

        socketService.getEnv().success(function (data) {
            console.log(data)
            vm.socket = socketService.connection(data.env)
            vm.socket.emit('auth', socketService.creds);
        })
        //for production pass in param to io("http://weblolchat-weblolchat.rhcloud.com:8000")

        vm.onlineFriends = [];

        $scope.$watch('socket', function (ov, nv) {
            if (vm.socket) {
                console.log('socket is set')
                vm.socket.on('online', function () {
                    $scope.$apply()
                })
                vm.socket.on('roster', function (list) {
                    friendList.list = list
                    friendList.shortIds();
                    vm.offlineFriends = friendList.list
                    $scope.$apply()
                })
                vm.socket.on('updatefriend', function (friend) {
                    //TODO remove timeout and rework:
                    if(friend.online == false){
                        if(vm.currentMessages){
                            //TODO make this work with short id
                            if(vm.currentMessages.jid == friend.jid){
                                vm.currentMessages = undefined;
                                vm.showMsg = false;
                            }
                        }
                    }
                    friendList.newPresence(friend)
                    vm.onlineFriends = friendList.online
                    $scope.$apply()

                })
                vm.socket.on('message', function (message) {
                    //TODO do this to message counter : http://stackoverflow.com/questions/275931/how-do-you-make-an-element-flash-in-jquery
                    var isCurrent = false;
                    if(vm.currentMessages){
                        var idEnd = message.from.indexOf('@')
                        var thisId = message.from.slice(3, idEnd);
                        if(vm.currentMessages.shortId == thisId){
                            isCurrent = true;
                        }
                    }
                    friendList.newMessage(message, isCurrent);
                    $scope.$apply()
                })
                vm.socket.on('clienterror', function (msg) {
                    console.log('caught it')
                    console.log(msg)
                    dialogs.notify('Login Error', msg).result.then(function(btn){
                        vm.confirmed = 'You confirmed "Yes."';
                        console.log('yes')
                        $state.go('home')
                    },function(btn){
                        vm.confirmed = 'You confirmed "No."';
                        console.log('no')
                        $state.go('home')
                    });
                    $scope.$apply()
                })
            }
        })

        $scope.$on("$stateChangeStart",   function(evt, to, toP, from, fromP){
            vm.socket.emit('forceDisconnect')
            socketService.creds = {};
            friendList.online = [];
            vm.socket = undefined;
        });

        //old ctrl
        vm.showMessages = function(shortId){
            vm.showMsg = true
            for(var i=0;i<friendList.online.length;i++){
                if(shortId == friendList.online[i].shortId){
                    friendList.online[i].unread = 0;
                    vm.currentMessages = friendList.online[i]
                }
            }
        }
        vm.sendNew = function(){
            console.log('send new function')
            vm.socket.emit('sendMessage', {'jid':vm.currentMessages.jid, 'message':vm.formData.message});
            friendList.newMessage(
                {
                    'to':angular.copy(vm.currentMessages.shortId),
                    'from':'self',
                    'body': angular.copy(vm.formData.message),
                    'date': new Date()
                },
                undefined);
            vm.formData.message = '';
        }
        vm.showSide = function(){
            vm.currentMessages = undefined;
            vm.showMsg = false;
        }
    }
})();
