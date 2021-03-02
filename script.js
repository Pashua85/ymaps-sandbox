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

  let polygon;
  myMap.events.add('click', event => {
    geoTitleBallon.close();
    if (polygon) {
      myMap.geoObjects.remove(polygon)
    }
    ymaps.geocode(event.get('coords'), {
      kind: 'locality',
      json: true
    })
      .then(res => {
        const addressLength = myMap._zoom < 8 ? 2 : 3;
        if (res.GeoObjectCollection.featureMember.length) {
          const geoObject = res.GeoObjectCollection.featureMember[0].GeoObject;
          const params = geoObject.metaDataProperty.GeocoderMetaData.Address.formatted.split(', ').slice(0, addressLength).join('+');
          
          getPlaces(params)
            .then(places => {
              if(places.length) {
                polygon = new ymaps.Polygon(places[0].geojson.coordinates);
                polygon.events.add('click', event => {
                  geoTitleBallon.close();
                  myMap.geoObjects.remove(polygon);
                })
                myMap.geoObjects.add(polygon);
                geoTitleBallon.open(event.get('coords'), places[0].display_name.split(', ')[0])
              }
            })
            .catch(err => {
              console.error(err);
            })
        }
      })
      .catch(err => {
        console.error(err);
      })
  })
  
}