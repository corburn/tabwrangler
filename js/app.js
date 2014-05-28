/**
*
*/

/* global angular */

'use strict';

angular.module('tabWranglerApp', ['xc.indexedDB'])
.config(function($indexedDBProvider) {
  $indexedDBProvider
  .connection('default')
  .upgradeDatabase(2, function(event, db, tx) {
    var objStore = db.createObjectStore('tab', {keyPath: 'id'});
    objStore.createIndex('url', 'url', {unique: false});
  });
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
  //objStore.each(query).then(function(cursor) {
    //cursor.key;
    //cursor.value;
  //});
});
