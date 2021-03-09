async function getPlaces(address) {
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
    getPlaces(params)
      .then(places => {
        const placeIndex = places.findIndex(item => item.geojson.type === 'Polygon' || item.geojson.type === 'MultiPolygon');
        if (placeIndex !== -1 && places[placeIndex].geojson.type === 'Polygon') {
          polygon = new ymaps.Polygon(places[placeIndex].geojson.coordinates, {interactivityModel: 'default#transparent'});
          polygon.events.add('click', event => {
            geoTitleBallon.close();
            myMap.geoObjects.remove(polygon);
          })
          myMap.geoObjects.add(polygon);
        }

        if(placeIndex !== -1 && places[placeIndex].geojson.type === 'MultiPolygon') {
          places[placeIndex].geojson.coordinates.forEach(coords => {
            let p = new ymaps.Polygon(coords, {interactivityModel: 'default#transparent'});
            p.events.add('click', event => {
              geoTitleBallon.close();
              myMap.geoObjects.remove(p)
            });
            myMap.geoObjects.add(p)
          })
        }

        if (event) {
          geoTitleBallon.open(event.get('coords'), places[placeIndex].display_name.split(', ').slice(0,2).join(', '))
        }

      })
      .catch(err => {
        console.err(err);
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
              const addressLength = myMap._zoom < 8 ? 2 : 3;
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
        console.err(err)
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