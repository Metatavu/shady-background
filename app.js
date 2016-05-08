(function() {
  'use strict';

  var PlaceIndexer = require(__dirname + '/places/indexer.js');
  var Scanner = require(__dirname + '/places/scanner.js');
  var config = require(__dirname + '/config.json');
  var ShadyModel = require('shady-model');
  var shadyMessages = require('shady-messages').getInstance();
  
  shadyMessages.on("models:ready", function () {
    var scanner = new Scanner({
      foursquareClientId: config.foursquareClientId,
      foursquareClientSecret: config.foursquareClientSecret
    });

    var placeIndexer = new PlaceIndexer({
      elasticSearchHost: config.elasticSearchHost
    });  
  });

  ShadyModel.createInstance({
    cassandraContactPoints: config.cassandraContactPoints,
    cassandraProtocolOptions: config.cassandraProtocolOptions,
    cassandraKeyspace: config.cassandraKeyspace
  });
}).call(this);