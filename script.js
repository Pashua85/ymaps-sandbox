async function getPlaces(address) {
  console.log({address})
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${address}&format=json&polygon_geojson=1&addressdetails=2`,
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
        const placeIndex = places.findIndex(item => item.geojson.type === 'Polygon' || item.geojson.type === 'MultiPolygon');
        if (placeIndex !== -1 && places[placeIndex].geojson.type === 'Polygon') {
          polygon = new ymaps.Polygon(places[placeIndex].geojson.coordinates,
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

      })
      .catch(err => {
        console.error(err);
      })
  }

  

  let polygon;
  myMap.events.add('click', event => {
    console.log({zoom: myMap._zoom})
    geoTitleBallon.close();
    myMap.geoObjects.removeAll();


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
              if (myMap._zoom < 8) {
                addressLength = 2;
              } else if (myMap._zoom < 11) {
                addressLength = 3;
              }
              // при зуме до 8 выделяются субъекты, или их центры
              // при зуме от 8 до 10 в регионах выделяются районы или городсие округа (или их центры), от 11 - населенные пункты поменьше (ближайшие к клику)
              
              if (response.GeoObjectCollection.featureMember.length) {
                const geoObject = response.GeoObjectCollection.featureMember[0].GeoObject;
                const params = geoObject.metaDataProperty.GeocoderMetaData.Address.formatted.split(', ').slice(0, addressLength).join('+');
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