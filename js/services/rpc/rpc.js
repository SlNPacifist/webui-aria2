angular
.module('webui.services.rpc', ['external'])
.factory('$rpc', ['$globalTimeout', '$alerts', 'TransportCreator', 'AriaLib',
function(globalTimeout, alerts, TransportCreator, AriaLib) {
  var subscriptions = [];
  var clientCreateTimeout = 10000;
  var client = null;
  var state = 'noclient';
  var forceNextSend = false;
  var stateUpdateTimeout = setTimeout(updateState, globalTimeout);

  return {
    // TODO: move this to another place (like settings service)
    getDirectURL : function() { return '' },
    once: once,
    subscribe: subscribe,
    forceUpdate: forceUpdate
  };

  function once(name, params, cb, delay) {
    subscriptions.push({
      once: true,
      name: 'aria2.' + name,
      params: params || [],
      callback: cb || angular.noop
    });
    if (!delay) {
      forceUpdate();
    }
  }

  // callback is called once in global timeout,
  function subscribe(name, params, cb) {
    subscriptions.push({
      once: false,
      name: 'aria2.' + name,
      params: params || [],
      callback: cb || angular.noop
    });
  }

  function resetUpdateTimeout(timeout) {
    clearTimeout(stateUpdateTimeout);
    stateUpdateTimeout = setTimeout(updateState, timeout);
  }

  function updateState() {
    switch (state) {
      case 'noclient':
        createClient();
        break;
      case 'creatingclient':
        break;
      case 'idle':
        sendRequest();
        break;
      case 'waitingresult':
        break;
    }
    resetUpdateTimeout(globalTimeout);
  }

  function forceUpdate() {
    if (state == 'idle') {
      resetUpdateTimeout(0);
    } else {
      forceNextSend = true;
    }
  }

  function createClient() {
    state = 'creatingclient';
    console.log("Creating client");
    TransportCreator.fromCurrentOptions(function(transport) {
      if (transport) {
        state = 'idle';
        console.log("Client created");
        client = new AriaLib.AriaClient(transport);
        resetUpdateTimeout(0);
        transport.on('error', function() {
          state = 'noclient';
          console.error("Transport got an error");
          client.cancelAllRequests();
          client = null;
          resetUpdateTimeout(clientCreateTimeout);
        });
      } else {
        state = 'noclient';
      }
    });
  }

  function collectRequest(subs) {
    return subs.map(function(sub) {
      return {
        methodName: sub.name,
        params: sub.params
      }
    });
  }

  function sendRequest() {
    if (subscriptions.length == 0) {
      return;
    }
    state = 'waitingresult';
    var currentSubs = subscriptions.slice();
    var request = collectRequest(currentSubs);
    console.log("Sending " + currentSubs.length + " requests");
    client.system.multicall(request, function(err, res) {
      if (err) {
        state = 'idle';
        console.log("Got error for requests", err);
        return;
      }
      console.log("Got response for request");
      res.forEach(function(curResult, index) {
        var sub = currentSubs[index];
        if (!Array.isArray(curResult)) {
          console.error("Request", sub.name, "got error", curResult);
        }
        sub.callback(curResult);
        if (sub.once) {
          currentSubs[index].finished = true;
        }
      });
      subscriptions = subscriptions.filter(function(sub) {
        return !sub.finished;
      });
      state = 'idle';
      if (forceNextSend) {
        forceNextSend = false;
        console.log("Forcing next send");
        resetUpdateTimeout(0);
      }
    });
  }
}]);
