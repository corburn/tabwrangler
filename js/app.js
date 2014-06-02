/**
*
*/

/* global angular */

'use strict';

angular.module('tabWranglerApp', ['tabmanager', 'ui.bootstrap'])
.directive('countdown', function($interval, dateFilter, $log) {
  var midnight = new Date();
  midnight.setHours(0);
  midnight.setMinutes(0);
  midnight.setSeconds(0);
  midnight.setMilliseconds(0);

  return function(scope, element, attrs) {
    var stopTime;
    var countdown = attrs.countdown - new Date().getTime() + midnight.getTime();
    $log.log(countdown);
    $log.log(attrs.countdown);

    // used to update the UI
    function updateTime() {
      if ((countdown -= 1000) < midnight.getTime()) {
        $log.error('negative countdown', countdown);
        $interval.cancel(stopTime);
        element.css('color', 'red');
        return;
      }
      element.text(dateFilter(countdown, 'HH:mm:ss'));
    }

    // so we can cancel the time updates
    stopTime = $interval(updateTime, 1000);

    // listen on DOM destroy (removal) event, and cancel the next UI update
    // to prevent updating time after the DOM element was removed
    element.on('$destroy', function() {
      $interval.cancel(stopTime);
    });
  };
})
.controller('corralCtrl', function($scope, corral) {
  $scope.corral = [];
  // TODO: should this be limited with pagination?
  corral.getAll().then(function(result) {
    $scope.corral = result;
  });
  // Restore tabs from the corral
  $scope.reopen = function(index) {
    corral.reopen($scope.corral[index]);
  }
})
.controller('rangeCtrl', function($scope, $log, range) {
  $scope.range = [];
  range.getAll().then(function(result) {
    $log.log('rangeCtrl', result);
    $scope.range = result;
  }, function(result) {
    $log.error('rangeCtrl', result);
  });
})
.controller('settingsCtrl', function($scope, settings) {
  settings.getAll().then(function(result) {
    $scope.tab = result;
  });
  $scope.addLock = function(regexp) {
    // TODO add validation
    $scope.tab.autolock.push(regexp);
    // Clear the input so the filter won't hide all the locks
    $scope.regexp = '';
    settings.upsert($scope.tab);
  };

  $scope.removeLock = function(index) {
    $scope.tab.autolock.splice(index, 1);
    settings.upsert($scope.tab);
  };

  $scope.upsert = settings.upsert;
});
