angular.module('webui.services.storage', ['webui.services.utils'])
.factory('aria.storage', ['$utils', function(utils) {
  return {
    set: set,
    get: get
  }

  function get(key) {
    console.log("Reading", key);
    if (key in localStorage) {
      return JSON.parse(localStorage[key]);
    } else {
      return null;
    }
  }

  function set(key, value) {
    localStorage[key] = JSON.stringify(value);
  }
}]);
