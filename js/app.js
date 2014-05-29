/**
*
*/

/* global angular */

'use strict';

angular.module('tabWranglerApp', ['xc.indexedDB', 'ui.bootstrap'])
.config(function($indexedDBProvider) {
  $indexedDBProvider
  .connection('default')
  .upgradeDatabase(2, function(event, db, tx) {
    var objStore = db.createObjectStore('tab', {keyPath: 'id'});
    objStore.createIndex('url', 'url', {unique: false});
  });
})
.directive('countdown', function($interval, dateFilter, $log) {
  var midnight = new Date();
  midnight.setHours(0);
  midnight.setMinutes(0);
  midnight.setSeconds(0);
  midnight.setMilliseconds(0);

  return function(scope, element, attrs) {
    var countdown = attrs.countdown - new Date() + midnight;

    // used to update the UI
    function updateTime() {
      if ((countdown -= 1000) < 0) {
        $log.error('negative countdown', countdown);
      }
      element.text(dateFilter(countdown, 'HH:mm:ss'));
    }

    // so we can cancel the time updates
    var stopTime = $interval(updateTime, 1000);

    // listen on DOM destroy (removal) event, and cancel the next UI update
    // to prevent updating time after the DOM element was removed
    element.on('$destroy', function() {
      $interval.cancel(stopTime);
    });
  };
})
.controller('corralCtrl', function($scope, $log, $indexedDB) {
  $scope.corral = [];

  var OBJECT_STORE_NAME = 'default';

  var objStore = $indexedDB.objectStore(OBJECT_STORE_NAME);

  $log.info('indexedDB getAll');
  objStore.getAll().then(function(results) {
    $log.info('indexedDB getAll $scope.corral = results');
    $scope.corral = results;
  });

  //var query = $indexedDB.queryBuilder().$index('url_idx').$asc.compile();
  //objStore.each(query).then(function(cuLrsor) {
    //cursor.key;
    //cursor.value;
  //});
})
.controller('settingsCtrl', function($scope) {
  // Settings with first run defaults
  $scope.tab = {
    minutesInactive: 10,
    min: 5,
    //max: 500,
    purgeClosed: false,
    showBadgeCount: true,
    autolock: []
  };

  // Load persistent settings from Chrome Sync
  function init() {
    chrome.storage.sync.get($scope.tab, function(items) {
      $scope.tab = items;
    });
  }

  // Save persistent settings to Chrome Sync
  // TODO: Should the entire object be sent with each update or should this be broken
  // into functions for each field?
  function upsert() {
    chrome.storage.sync.set($scope.tab, function() {
      if(chrome.runtime.lastError) {
        // TODO: handle error
        // This would most likely be MAX_SUSTAINED_WRITE_OPERATIONS_PER_MINUTE exceeded
        // See chrome API documentation for details
      }
    });
  }

  $scope.addLock = function(regexp) {
    // TODO add validation
    $scope.tab.autolock.push(regexp);
    upsert();
  };

  $scope.removeLock = function(index) {
    $scope.tab.autolock.splice(index, 1);
    upsert();
  };

  init();
});
