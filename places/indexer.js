/*jshint esversion: 6 */
(function() {
  'use strict';
  
  var _ = require("underscore");
  var util = require('util');
  var async = require("async");
  var shadyMessages = require('shady-messages').getInstance();
  var Search = require('shady-search');
  var ShadyModel = require('shady-model');
    
  var PlaceIndexer = class {
    
    constructor(options) {
      this._search = new Search({
        elasticSearchHost: options.elasticSearchHost
      });
      
      shadyMessages.on("place-persister:place-persisted", this._onPlacePersisted.bind(this));
      shadyMessages.on("system:reindex-places", this._onSystemReindexPlaces.bind(this));
    }
    
    _createBatches (arr, size) {
      var result = [];
      var index = 0;
      var batch = null;
    
      while (arr.length > 0) {
        if ((index % size) === 0) {
          batch = [];
          result.push(batch);
        }
      
        batch.push(arr.shift());
        index++;
      }
   
      return result;
    }
    
    _onPlacePersisted (event, data) {
      this._search.indexPlace(data.place, function (err, data) {
        if (err) {
          shadyMessages.trigger("place-indexer:error", {
            err: err,
            place: data.place
          });
        } else {
          shadyMessages.trigger("place-indexer:place-indexed", {
            place: data.place
          });
        }
      }.bind(this));
    }
    
    _onSystemReindexPlaces (event, data) {
      console.log("Going to reindex all places");
      ShadyModel.Place.find({}, { select: ['id'], fetchSize: 2147483647 }, function (err, idRows) {
        var ids = _.pluck(idRows, 'id');
        
        var idCount = ids.length;
        var idGroups = this._createBatches(ids, 10);
        console.log(util.format("Reindexing %d places in %d batches", idCount, idGroups.length));

        var indexTasks = _.map(idGroups, function (groupIds) {
          return function (callback) {
            ShadyModel.Place.find({ id : { '$in': groupIds }}, function (loadErr, places) {
              if (loadErr) {
                callback(loadErr);
              } else {
                this._search.indexPlaces(places, callback); 
              }
            }.bind(this));
          }.bind(this);
        }.bind(this));
        
        async.series(indexTasks, function (err, results) {
          if (err) {
            console.error(err, "Place reindexing task failed");
          } else {
            console.log(util.format("Place reindexing complete"));
          }
        });
      }.bind(this));
    } 
  };
  
  module.exports = PlaceIndexer;

}).call(this);