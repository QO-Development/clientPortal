(function ($) {
    
      // var targetUrl = '/storeName';
      var targetUrl = '/api/v1/clientStores.json';
      var prefetchUrl = '/prefetch.json';
      var selectedItem = null;
    
      var placesService;
    
      $(function () {
    
        // $.support.cors = true;
        // url = https://ginger-brownthorne.appspot.com/testJSON?q=%QUERY
    
        placesService = new google.maps.places.PlacesService(map);
    
    
        initiateTypeAhead();
        attachTypeAheadEvents();
        initiateEmailInput();
    
        // Disables the submit button once the form has been submitted.
        $('#service-request-form').on('submit', function (e) {
          $('button[type=submit]').attr('disabled', 'disabled');

          if (!selectedItem && $('#manualEntryForm').data('manualEntry') === false)
            e.preventDefault();
            $('#Input1').focus();
            $('button[type=submit]').removeAttr('disabled');
        });
    
      });
    
    
      // Type ahead
      var initiateTypeAhead = function () {
    
        var stores = new Bloodhound({
          datumTokenizer: Bloodhound.tokenizers.obj.whitespace(['Name', 'StoreNumber', 'Address']),
          queryTokenizer: Bloodhound.tokenizers.whitespace,
          //prefetch: {cache: false, url: targetUrl},
          sufficient: 1,
          remote: {
            url: targetUrl + '?q=%QUERY',
            wildcard: '%QUERY'
            ,
            transform: function (res) {
              for (var i in res) {
                // Build a unique search string
                try {
                  res[i].search = [
                    res[i].Name,
                    res[i].StoreNumber,
                    res[i].Address,
                    res[i].City,
                    res[i].State,
                    res[i].Zip
                  ].join(' ');
                }
                catch (e) {
    
                }
              }
    
              return res;
    
            }
          }
        });
    
        $('#Input1').typeahead({
          hint: false,
          highlight: true,
          minLength: 1
        }, {
          name: 'stores',
          display: function (d) {
            return d.Name + ' (#' + d.StoreNumber + ')';
          },
          source: stores,
          templates: {
            suggestion: function (obj) {
              return [
                '<div style="background:#fff">',
                '<strong>' + obj.Name + ' (#' + obj.StoreNumber + ')</strong><br>',
                '<span>' + obj.Address + '</span>',
                '<span>' + obj.City + ', ' + obj.State + ' ' + obj.Zip + '</span>',
                '</div>'
              ].join(' \n');
            },
    
            notFound: function (obj) {
              return [
                '<div class="alert alert-warning">',
                '<strong>Not seeing your store?</strong><br>',
                '<span>Click <a id="manualEntryLink" href="#">here</a> to enter store info manually.</span>',
                '</div>'
              ].join(' \n');
            }
          }
        });
    
      };
    
      var attachTypeAheadEvents = function () {
        $('#Input1').bind('typeahead:select', function (ev, suggestion) {
          selectedItem = suggestion;
          updateMap(selectedItem.Address + ' '
            + selectedItem.City + ', ' + selectedItem.State + ' ' + selectedItem.Zip, selectedItem.Name);
          updateStoreFoundField(true);
    
        });
    
        $('#Input1').bind('typeahead:change', function (ev, suggestion) {
          // Check if the selected item is part of the store
    
          if (!selectedItem) {
            updateMap(suggestion, '');
            return;
          }
    
          var si = selectedItem.Name + ' (#' + selectedItem.StoreNumber + ')';
          if (si === suggestion) { 
            updateMap(selectedItem.Address + ' '
              + selectedItem.City + ', ' + selectedItem.State + ' ' + selectedItem.Zip, selectedItem.Name);
    
            updateStoreNumber(selectedItem.StoreNumber);
    
          }
          else {
            closeOverlay();
            updateMap(suggestion, '');
            updateStoreFoundField(false);
            updateStoreNumber('');
          }
        });
    
      };
      
      // Multiple Email Input
      var initiateEmailInput = function() {

        $('#InputEmail')
          .on('tokenfield:createtoken', function (e) {
            var data = e.attrs.value.split('|')
            e.attrs.value = data[1] || data[0]
            e.attrs.label = data[1] ? data[0] + ' (' + data[1] + ')' : data[0]
          })

          .on('tokenfield:createdtoken', function (e) {
            // Über-simplistic e-mail validation
            var re = /\S+@\S+\.\S+/
            var valid = re.test(e.attrs.value)
            if (!valid) {
              $(e.relatedTarget).addClass('invalid')
            }
          })

          .on('tokenfield:edittoken', function (e) {
            if (e.attrs.label !== e.attrs.value) {
              var label = e.attrs.label.split(' (')
              e.attrs.value = label[0] + '|' + e.attrs.value
            }
          })
          .tokenfield();

      };
    
      // Map
      var updateMap = function (address, storeName) {
    
        var latlng = new google.maps.LatLng(39, 140.644);
    
        geocoder.geocode({'address': address}, function (results, status) {
    
          if (status == google.maps.GeocoderStatus.OK) {
            window.marker.setPosition(results[0].geometry.location);
            map.setZoom(12);
    
            var scale = Math.pow(2, map.getZoom());
            var worldCoordinateCenter = map.getProjection().fromLatLngToPoint(results[0].geometry.location);
            var pixelOffset = new google.maps.Point((150 / scale) || 0, (10 / scale) || 0);
    
            var worldCoordinateNewCenter = new google.maps.Point(
              worldCoordinateCenter.x - pixelOffset.x,
              worldCoordinateCenter.y + pixelOffset.y
            );
    
            var newCenter = map.getProjection().fromPointToLatLng(worldCoordinateNewCenter);
    
            window.map.setCenter(newCenter); // setCenter takes
            // a LatLng object
    
            closeOverlay();
            if (storeName.length > 0) {
              storeName = storeName.split(',')[0];
              updateOverlay(results[0].geometry.location, storeName);
            }
            updateAddressField(results[0].formatted_address);
    
          }
          else {
            map.setZoom(4);
            window.marker.setPosition({lat: 36, lng: -119});
            updateAddressField(address);
          }
        });
      };
    
      // Places
      var updateOverlay = function (location, storeName) {
        // Search for the establishment based on the store name, if not found
        // then just use the place id from the geo position.
        placesService.nearbySearch({
          name: storeName,
          location: location,
          rankBy: google.maps.places.RankBy.DISTANCE
        }, function (results, status) {
    
          var place_id;
    
          if (status !== 'OK') {
            closeOverlay();
            return false;
          }
    
          for (var i = 0; i < results.length; i++) {
            if (results[i].name == storeName) {
              place_id = results[i].place_id;
              continue;
            }
          }
    
          if (!place_id) {
            place_id = results[0].place_id;
          }
          placesService.getDetails({
            placeId: place_id
          }, function (results, status) {
            if (status !== 'OK') {
              closeOverlay();
              return false;
            }
    
            var image_url;
            var $overlay = $('.placesOverlay');
            var $coverImage = $('.cover_image img', $overlay);
            var $storeName = $('.store_name');
            var $storeAddress = $('.location_details .address');
            var $storeHours = $('.location_details .hours');
            var $storePhone = $('.location_details .phone');
            var $openInGoogleMaps = $('.open_in_maps');
    
            // Update markup:
            window.photos = results.photos;
            if (results.photos.length > 0) {
              image_url = results.photos[0].getUrl({
                'maxWidth': '408',
                'maxHeight': '305'
              });
              $coverImage.attr('src', image_url).show();
            }
            else {
              $coverImage.hide();
            }
    
            $storeName.text(results.name);
            $storeAddress.html("<strong>Address:</strong> " + results.adr_address);
    
            var d = new Date();
            var openingTime = results.opening_hours.periods[d.getDay()];
            var openingTime = convertTimeAMPM(openingTime.open)+ " - " + convertTimeAMPM(openingTime.close);
            $storeHours.html('<strong>Hours:</strong> '+openingTime);
            openOverlay();
    
            $storePhone.html('<strong>Phone:</strong> <a href="tel:' +
              results.international_phone_number+'">'+results.formatted_phone_number+'</a>')
    
            $openInGoogleMaps.attr('href', results.url);
          });
    
    
        });
      };
    
      var convertTimeAMPM = function (googleTime) {
    
        var hours = googleTime.hours;
        var minutes = googleTime.minutes;
    
        var timeValue = "" + ((hours > 12) ? hours - 12 : hours);
        timeValue += (minutes < 10) ? ":0" + minutes : ":" + minutes;  // get minutes
        timeValue += (hours >= 12) ? " PM" : " AM";
        return timeValue
      };
    
      var openOverlay = function () {
        $('.placesOverlay').addClass('open');
      };
    
      var closeOverlay = function () {
        $('.placesOverlay').removeClass('open');
      };
    
      // Field Manipulations
      var updateAddressField = function (address) {
        $('input[name=store_address]').val(address)
      };
    
      var updateStoreNumber = function (storeNumber) {
        $('input[name=store_number]').val(storeNumber);
      }
    
      var updateStoreFoundField = function (found) {
        $('input[name=store_found]').val(found)
      }
    
    })(jQuery);