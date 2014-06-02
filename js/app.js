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

  return {
    restrict: 'A',
    scope: {
      countdown: '@',
      timeout: '&'
    },
    link: function(scope, element, attrs) {
      var stopTime;
      var countdown = attrs.countdown - new Date().getTime() + midnight.getTime();

      // used to update the UI
      function updateTime() {
        if ((countdown -= 1000) < midnight.getTime()) {
          scope.timeout();
          //$log.error('negative countdown', countdown);
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
    }
  };
})
.directive('search', function() {
  return {
    restrict: 'E',
    require: '^ngModel',
    scope: {
      ngModel: '='
    },
    template: '<div class="row">' +
      '<div class="col-lg-6">' +
      '<div class="input-group">' +
      '<input type="text" class="form-control" placeholder="search" ng-model="ngModel">' +
      '<div class="input-group-btn open">' +
      '<button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown" ng-click="dropdown = !dropdown">Order by <span class="caret"></span></button>' +
      '<ul class="dropdown-menu pull-right" ng-show="dropdown">' +
      '<li><a href="">title</a></li>' +
      '<li><a href="">url</a></li>' +
      '<li><a href="">favicon</a></li>' +
      '<li><a href="">tab</a></li>' +
      '<li><a href="">timestamp</a></li>' +
      '</ul>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>',
    //link: function(scope) {
      //console.log(scope);
      //}
  };
})
// Manage closed tabs
.controller('corralCtrl', function($scope, corral) {
  $scope.corral = [];
  // TODO: should this be limited with pagination?
  corral.getAll().then(function(result) {
    $scope.corral = result;
  });
  // Discard tab
  $scope.remove = function(index) {
    // Remove from the database
    corral.remove($scope.corral[index])
    .then(function() {
      // Remove from the popup
      $scope.corral.splice(index,1);
    });
  };
  // Restore tab from the corral
  $scope.reopen = function(index) {
    corral.reopen($scope.corral[index]);
  };
})
// Manage open tabs
.controller('rangeCtrl', function($scope, $log, range) {
  $scope.range = [];
  $scope.update = function() {
    $log.log('rangeCtrl.update');
    range.getAll()
    .then(function(result) {
      $log.log('rangeCtrl', result);
      $scope.range = result;
    }, function(result) {
      $log.error('rangeCtrl', result);
    });
  };
  $scope.update();
})
// Manage settings
.controller('settingsCtrl', function($scope, settings) {
  settings.getAll().then(function(result) {
    $scope.tab = result;
  });
  $scope.addLock = function(regexp) {
    // Check regexp is valid
    try {
      new RegExp(regexp);
    } catch(e) {
      // TODO: alert the user the regexp is invalid
      return;
    }
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
