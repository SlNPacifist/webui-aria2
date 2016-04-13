angular.module('webui.services.storage', ['webui.services.utils'])
.factory('aria.storage', ['$utils', function(utils) {
  return {
    set: set,
    get: get
  }

  function get(key) {
    var chunks = document.cookie.split(";");
    for (var i = 0; i < chunks.length; i++) {
      var ckey = chunks[i].substr(0, chunks[i].indexOf("=")).replace(/^\s+|\s+$/g,"");
      var cvalue = chunks[i].substr(chunks[i].indexOf("=") + 1);
      if (key == ckey) {
        return JSON.parse(unescape(cvalue));
      }
    }

    return null;
  }

  function set(key, value) {
    var exdate = new Date();
    exdate.setDate(exdate.getDate() + 30 * 12);
    var cvalue = escape(JSON.stringify(value)) + "; expires=" + exdate.toUTCString();
    document.cookie = key + "=" + cvalue;
  }
}]);
