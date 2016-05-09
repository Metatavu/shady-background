/*jshint esversion: 6 */
(function() {
  'use strict';

  var _ = require("underscore");
  var WorldScanner = require('worldscanner');
  var ShadyModel = require('shady-model');
  var shadyMessages = require('shady-messages').getInstance();
    
  var Scanner = class {
    
    constructor(settings) {
      this._worldScanner = new WorldScanner({
	    client_id: settings.foursquareClientId,
	    client_secret: settings.foursquareClientSecret,
        ne: {
          lat: 69,
          lng: 31
        },
        sw: {
          lat: 60,
          lng: 20
        }
      });
	  
	  this._worldScanner.on('error', this._onError.bind(this));
      this._worldScanner.on('scanFailed', this._onScanFailed.bind(this));
      this._worldScanner.on('scannerReady', this._onScannerReady.bind(this));
      this._worldScanner.on('completed', this._onCompleted.bind(this));
      this._worldScanner.on('scannerPaused', this._onScannerPaused.bind(this));
      this._worldScanner.on('scannerResumed', this._onScannerResumed.bind(this));
      this._worldScanner.on('areaScanned', this._onAreaScanned.bind(this));
      this._worldScanner.on('areaSplit', this._onAreaSplit.bind(this));
      this._worldScanner.on('venueDiscovered', this._onVenueDiscovered.bind(this));
      
      this._worldScanner.scan();
    }
   
    _onError(err) {
      console.error(err, "Scanner error");
      shadyMessages.trigger("world-scanner:error", err);
    } 
    
    _onScanFailed(err) {
      console.error(err, "Scanner failure");
      shadyMessages.trigger("world-scanner:failure", err);
    } 
    
    _onScannerReady() {
      console.log("Scanner ready");
    }
    
    _onCompleted() {
      console.log("Scanner complted");
    }
     
    _onScannerPaused (resumes) {
      console.log(resumes, "paused");
      
      shadyMessages.trigger("world-scanner:paused", {
        resumes: resumes
      });
    }
    
    _onScannerResumed () {
      console.log("resumed");
      shadyMessages.trigger("world-scanner:resumed", {
      });
    }
    
    _onAreaScanned (area) {
      console.log(area, "scanned");
      shadyMessages.trigger("world-scanner:area-scanned", {
        area: area
      });
    }
    
    _onAreaSplit (newSize) {
      console.log(newSize, "newSize");
      shadyMessages.trigger("world-scanner:area-split", {
        newSize: newSize
      });
    }
    
    _onVenueDiscovered (venue) {
      var CategoryModel = ShadyModel.Category;
      var PlaceModel = ShadyModel.Place;
      
      if (venue && venue.location) {
        var categoryIds = null;
       
        if (venue.categories && venue.categories.length) {
          var categories = _.map(venue.categories, function (venueCategory) {
            return (new CategoryModel({
              id: 'foursquare-' + venueCategory.id,
              name: venueCategory.name,
              icon: venueCategory.icon.prefix + 'bg_32' + venueCategory.icon.suffix
            }));
          }.bind(this));
          
          categoryIds = _.map(venue.categories, function (venueCategory) {
            return 'foursquare-' + venueCategory.id;
          });
          
          var categorySaves = _.map(categories, function (category) {
            return category.save({return_query: true});
          });        
        
          ShadyModel.getInstance().doBatch(categorySaves, function(err){
            if (err) {
              console.error(err);
            } else {
              shadyMessages.trigger("world-scanner:category-discovered", {
                categories: categories
              });
            }
          });
        }
              
        var priceLevel = null;
        if (venue.price && venue.price.tier) {
          switch (venue.price.tier) {
            case 1: 
              priceLevel = 'CHEAP';
            break;
            case 2: 
              priceLevel = 'MID';
            break;
            case 3: 
              priceLevel = 'PRICY';
            break;
            case 4: 
              priceLevel = 'LUXURY';
            break;
          }
        }
        
        var place = new PlaceModel({
          id: 'foursquare-' + venue.id,
          name : venue.name,
          description: venue.description, 
          tags: venue.tags, 
          categories: categoryIds, 
          url: venue.url, 
          priceLevel: priceLevel,
          priceMessage: venue.price ? venue.price.message : null,
          latitude: venue.location.lat, 
          longitude: venue.location.lng, 
          accurate: !venue.location.isFuzzed, 
          streetAddress: venue.location.address, 
          crossStreet: venue.location.crossStreet, 
          city: venue.location.city, 
          state: venue.location.state, 
          postalCode: venue.location.postalCode, 
          country: venue.location.country
        });
        
        place.save(function (err) {
          if (err) {
            console.error(err);
          } else {
            console.log(venue.id, "discoverred");

            shadyMessages.trigger("world-scanner:place-discovered", {
              original: venue,
              place: place
            });
          }
        });
      }
    }
  
  };
  
  module.exports = Scanner;

}).call(this);
