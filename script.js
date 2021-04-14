function formatAddress (address) {
  return address.split('+').map((item, i, arr) => {
    if (item.includes('сельское поселение') && i !== arr.length - 1) {
      return '';
    }
    if (item.includes('деревня')) {
      return item.replace('деревня ', '')
    }
    if (item.includes('сельское поселение') && item.includes('сельсовет')) {
      return item.replace('сельское поселение ', '')
    }

    return item;
  }).join('+')
}

async function getPlaces(address) {
  const formatedAddress = formatAddress(address);

  console.log({formatedAddress})
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${formatedAddress}&format=json&polygon_geojson=1&addressdetails=2`,
  );
  return await response.json();
}


ymaps.ready(init);

function init(){
  const myMap = new ymaps.Map("map", {
      center: [55.76, 37.64],
      zoom: 4
  });

  const geoTitleBallon = new ymaps.Balloon(myMap);
  geoTitleBallon.options.setParent(myMap.options);

  function workWithGeoCode(params, event) {
    // в некоторых случаях (например для некоторых городских районов(напр. во Владивостоке или Владикавказе)) с OSM не приходят координаты
    // для таких случаев нужно сделать бэкап - выделять границы родительского геообъекта(города)
    getPlaces(params)
      .then(places => {
        console.log({placesFromWorkWithGeocode: places})
        const placeIndex = places.findIndex(item => item.geojson.type === 'Polygon' || item.geojson.type === 'MultiPolygon');
        const pointPlaceIndex = places.findIndex(item => item.geojson.type === 'Point');
        if (placeIndex !== -1 && places[placeIndex].geojson.type === 'Polygon') {
          const polygon = new ymaps.Polygon(places[placeIndex].geojson.coordinates,
            {interactivityModel: 'default#transparent'},
            {
              fillOpacity: 0.3,
              fillColor: "#54cbba"
            }
          );
          polygon.events.add('click', event => {
            geoTitleBallon.close();
            myMap.geoObjects.remove(polygon);
          })
          myMap.geoObjects.add(polygon);
        }

        if(placeIndex !== -1 && places[placeIndex].geojson.type === 'MultiPolygon') {
          places[placeIndex].geojson.coordinates.forEach(coords => {
            let p = new ymaps.Polygon(coords,
              {interactivityModel: 'default#transparent'},
              {
                fillOpacity: 0.3,
                fillColor: "#54cbba"
              }
            );
            p.events.add('click', event => {
              geoTitleBallon.close();
              myMap.geoObjects.remove(p)
            });
            myMap.geoObjects.add(p)
          })
        }

        if (event && places[placeIndex]) {
          geoTitleBallon.open(event.get('coords'), places[placeIndex].display_name.split(', ').slice(0,2).join(', '))
        }

        if(placeIndex === -1 && pointPlaceIndex !== -1 && event && places[pointPlaceIndex]) {
          geoTitleBallon.open(event.get('coords'), places[pointPlaceIndex].display_name.split(', ').slice(0,2).join(', '))
        } 

      })
      .catch(err => {
        console.error(err);
      })
  }  

  myMap.events.add('click', event => {
    console.log({zoom: myMap._zoom})
    geoTitleBallon.close();
    myMap.geoObjects.removeAll();

    if (myMap._zoom > 15) {
      ymaps.geocode(event.get('coords'), {
        kind: 'house',
        json: true
      })
        .then(res => {
          if (res.GeoObjectCollection.featureMember.length) {
            const geoObject = res.GeoObjectCollection.featureMember[0].GeoObject;
            const params = geoObject.metaDataProperty.GeocoderMetaData.Address.formatted;
            workWithGeoCode(params, event)
          }
        })
        .catch(err => {
          console.error(err)
        })
    } else {
      ymaps.geocode(event.get('coords'), {
        kind: 'district',
        json: true
      })
        .then(res => {
          console.log({districtResponseFromYGeocode: res});
          // нужно отдельно доработать выделение районов Москвы (там в featureMember может приходить [микрорайон, РАЙОН, округ] или [РАЙОН, округ])
          // в остальных городах район приходит последним элементом
          if (myMap._zoom >= 11 && res.GeoObjectCollection.featureMember.length) {
            const geoObject = res.GeoObjectCollection.featureMember[res.GeoObjectCollection.featureMember.length - 1].GeoObject;
            const params = geoObject.metaDataProperty.GeocoderMetaData.Address.formatted;
            workWithGeoCode(params, event);
          } else  {
            ymaps.geocode(event.get('coords'), {
              kind: 'locality',
              json: true
            })
              .then(response => {
                console.log({localResponseFormYGoecode: response})
                let addressLength;
                if (myMap._zoom < 10) {
                  addressLength = 2;
                }

                if (myMap._zoom >= 10 && myMap._zoom <= 11) {
                  addressLength = 3;
                }

                if (myMap._zoom > 11) {
                  addressLength = 4;
                }

                if (myMap._zoom > 13) {
                  addressLength = 5;
                }


                 
                // при зуме до 8 выделяются субъекты, или их центры
                // при зуме от 8 до 10 в регионах выделяются районы или городсие округа (или их центры), от 11 - населенные пункты поменьше (ближайшие к клику)
                
                if (response.GeoObjectCollection.featureMember.length) {
                  const geoObject = response.GeoObjectCollection.featureMember[0].GeoObject;
                  console.log({addressLength})
                  const params = geoObject.metaDataProperty.GeocoderMetaData.Address.formatted.split(', ').slice(0, addressLength).join('+');
                  console.log({params})
                  workWithGeoCode(params, event)
                }
              })
              .catch(err => {
                console.error(err);
              })
          }
        })
        .catch(err => {
          console.error(err)
        })
    }



    
  })

  const searchControl = myMap.controls.get('searchControl');
  searchControl.events.add('resultshow', e => {
    geoTitleBallon.close();
    myMap.geoObjects.removeAll();
    const data = searchControl.getResponseMetaData();
    if (data) {
      const params = data.request;
      workWithGeoCode(params)
    }
  })
  
}