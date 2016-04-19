angular
.module('webui.services.rpc', ['ClientCreator'])
.factory('$rpc', ['$globalTimeout', '$alerts', 'ClientCreator',
function(globalTimeout, alerts, ClientCreator) {
  ClientCreator.whenClientReady(function(client) {
    client.enableThrottling(globalTimeout);
  });

  var subscriptions = [];
  window.setInterval(updateSubscriptions, globalTimeout);

  return {
    // get currently configured directURL
    // TODO: move this to another place (like settings service)
    getDirectURL : function() { return '' },
    once: once,
    subscribe: subscribe,
    forceUpdate: forceUpdate
  };

  // syscall is done only once, delay is optional
  // and pass true to only dispatch it in the global timeout
  // which can be used to batch up once calls
  function once(name, params, cb, delay) {
    cb = cb || angular.noop;
    params = params || [];
    // TODO: process cases when no connection available
    function makeRequest() {
      ClientCreator.whenClientReady(function(client) {
        client.call('aria2.' + name, params, function(err, res) {
          if (err) {
            console.error("Got an error for request:", name, params, err);
            setTimeout(globalTimeout, makeRequest);
          } else {
            cb([res]);
          }
        });
        if (!delay) {
          forceUpdate();
        }
      });
    }
    makeRequest();
  }

  // callback is called once in global timeout,
  function subscribe(name, params, cb) {
    subscriptions.push({
      name: 'aria2.' + name,
      params: params || [],
      cb: cb || angular.noop
    });
  }

  function updateSubscriptions() {
    ClientCreator.whenClientReady(function(client) {
      subscriptions.forEach(function(s) {
        client.call(s.name, s.params, function(err, res) {
          if (err) {
            console.error("Got error for subscription:", s.name, s.params, err);
          } else {
            s.cb([res]);
          }
        });
      });
    });
  }

  // force the global update
  function forceUpdate() {
    ClientCreator.whenClientReady(function(client) {
      client.disableThrottling();
      client.enableThrottling(globalTimeout);
    });
  }
}]);
