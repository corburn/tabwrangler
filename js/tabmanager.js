/* global angular */

'use strict';

var OBJECT_STORE_NAME='tabwrangler';

// An adapter to replace the chrome api callback with a promise
function callback(deferred) {
  return function(items) {
    if(chrome.runtime.lastError) {
      deferred.reject(chrome.runtime.lastError);
    } else {
      deferred.resolve(items);
    }
  };
}

console.error('TODO: fix upgradeDatabase object store unconditionally deleted');

angular.module('tabmanager', ['xc.indexedDB'])
.config(function($indexedDBProvider) {
  $indexedDBProvider
  .connection('corral')
  // TODO: onupgradeneeded the object store is unconditionally deleted
  // This may cause users to lose information
  .upgradeDatabase(3, function(event, db, tx) {
    if (db.objectStoreNames.contains(OBJECT_STORE_NAME)) {
      db.deleteObjectStore(OBJECT_STORE_NAME);
    }
    var objStore = db.createObjectStore(OBJECT_STORE_NAME, {keyPath: 'id'});
    objStore.createIndex('url', 'url', {unique: true});
  });
})
.factory('settings', function($q) {
  var tab = {
    minutesInactive: 10,
    min: 5,
    purgeClosed: false,
    showBadgeCount: true,
    //allowDuplicates: false,
    autolock: ['^chrome.*//', 'localhost']
  };
  return {
    getAll: function() {
      var deferred = $q.defer();
      chrome.storage.sync.get(tab, callback(deferred));
      return deferred.promise;
    },
    getMinutesInactive: function() {
      var deferred = $q.defer();
      chrome.storage.sync.get({minutesInactive: tab.minutesInactive}, callback(deferred));
      return deferred.promise;
    },
    getMin: function() {
      var deferred = $q.defer();
      chrome.storage.sync.get({min: tab.min}, callback(deferred));
      return deferred.promise;
    },
    getPurgeClosed: function() {
      var deferred = $q.defer();
      chrome.storage.sync.get({purgeClosed: tab.purgeClosed}, callback(deferred));
      return deferred.promise;
    },
    getShowBadgeCount: function() {
      var deferred = $q.defer();
      chrome.storage.sync.get({showBadgeCount: tab.showBadgeCount}, callback(deferred));
      return deferred.promise;
    },
    /*
    *getAllowDuplicates: function() {
    *  var deferred = $q.defer();
    *  chrome.storage.sync.get({allowDuplicates: tab.allowDuplicates}, callback(deferred));
    *  return deferred.promise;
    *}
    */
    getAutolock: function() {
      var deferred = $q.defer();
      chrome.storage.sync.get({autolock: tab.autolock}, callback(deferred));
      return deferred.promise;
    },
    upsert: function(items) {
      var deferred = $q.defer();
      chrome.storage.sync.set(items, callback(deferred));
      return deferred.promise;
    }
  };
})
.factory('corral', function($q, $log, $indexedDB, settings) {
  return {
    addAll: function(data) {
      // Insert tabs into the database
      return $indexedDB.objectStore(OBJECT_STORE_NAME).upsert(data);
      // Get the database count and check if it should be displayed on the extension badge.
      // Combining them allows the count to piggyback on the upsert IDBRequest to avoid an
      // unfinished request error trying to make another request during this transaction.
      /*
       *.then(function(e) {
       *  $log.log('corral.addAll upsert', e);
       *  return $q.all(settings.getShowBadgeCount(), e.count());
       *})
       * Either display the count or clear the badge text with an empty string
       *.then(function(result) {
       *  $log.log('corral.addAll showBadgeCount and count', result);
       *  if (!result[0].showBadgeCount) {
       *    return;
       *  }
       *  // Use a default count if the result is too big to display
       *  if(result[1].result < 999) {
       *    text = result[1].result.toString();
       *  } else {
       *    text = '999+';
       *  }
       *  $log.log('corral.addAll set badge text', text);
       *  chrome.browserAction.setBadgeText({text: text});
       *});
       */
    },
    getAll: function() {
      return $indexedDB.objectStore(OBJECT_STORE_NAME).getAll();
    },
    remove: function(key) {
      return $indexedDB.objectStore(OBJECT_STORE_NAME).delete(key);
    }
  };
})
.factory('range', function($q, filterFilter, $log, settings) {
  var calledOnce = false;
  return {
    addAll: function() {
      var deferTabs = $q.defer();
      var _settings = {};

      // Should only be called once onStartup
      if (calledOnce) {
        $log.error('range.addAll was already called');
        return;
      }
      calledOnce = true;

      chrome.tabs.query({windowType: 'normal', pinned: false, active: false}, callback(deferTabs));
      $q.all([
        // Get all settings
        settings.getAll(),
        // Get all tabs
        deferTabs.promise
      ])
      // Filter tabs matching the autolock patterns
      // TODO: what if a pattern is not a valid regexp?
      .then(function(results) {
        _settings = results[0];
        var regexp = new RegExp(_settings.autolock.join('|'));
        var filteredTabs = [];
        filteredTabs = filterFilter(results[1], function(tab) {
          return !regexp.test(tab.url);
        });
        return filteredTabs;
      })
      // Start timers on all tabs
      // TODO: Filter tabs in windows with less than settings.min tabs
      .then(function(tabs) {
        $log.log('range.addAll alarms', tabs);
        angular.forEach(tabs, function(value) {
          chrome.alarms.create(value.id.toString(), {delayInMinutes: _settings.minutesInactive});
        });
      });
    },
    getAll: function() {
      $log.log('range.getAll');
      // Return a promise with an array of tabs that have alarms set
      var deferred = $q.defer();
      chrome.alarms.getAll(callback(deferred));
      return deferred.promise.then(function(alarms) {
        var promises = [];
        angular.forEach(alarms, function(value) {
          var deferred = new $q.defer();
          promises.push(deferred.promise);
          chrome.tabs.get(parseInt(value.name), function(items) {
            if(chrome.runtime.lastError) {
              deferred.reject(chrome.runtime.lastError);
            } else {
              items.scheduledTime = value.scheduledTime;
              deferred.resolve(items);
            }
          });
        });
        return $q.all(promises);
      });
    },
    resetAlarm: function(tab) {
      settings.getAll().then(function(items) {
        var regexp = new RegExp(items.autolock.join('|'));
        var tabId = tab.id.toString();
        if (regexp.test(tab.url)) {
          $log.log('range.resetAlarm matched an autolock pattern', tab.url, tab);
        } else {
          $log.log('range.resetAlarm', tab);
          // TODO: When chrome version 35+ is more common, add a callback parameter to chrome.alarms.clear
          // that wraps chrome.alarms.create. Is there a potential race condition here?
          chrome.alarms.clear(tabId);
          chrome.alarms.create(tabId, {delayInMinutes: items.minutesInactive});
        }
      });
    },
    upsert: function(settings) {
      $log.log('range.upsert', settings);
      var deferred = $q.defer();
      // If an error occures, it would most likely be MAX_SUSTAINED_WRITE_OPERATIONS_PER_MINUTE exceeded
      // See chrome API documentation for details
      chrome.storage.sync.set(settings, callback(deferred));
      return deferred.promise;
    }
  };
});
