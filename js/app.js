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
.controller('corralCtrl', function($scope, corral) {
  $scope.corral = [];
  corral.getAll().then(function(result) {
    $scope.corral = result;
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
});
