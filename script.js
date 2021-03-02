async function getPlaces(address) {
  console.log('from getPlace')
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


  myMap.events.add('click', event => {
    console.log('map click')
  })
  const regionBalloon = new ymaps.Balloon(myMap);
  regionBalloon.options.setParent(myMap.options);

  // ymaps.borders.load('RU', {
  //   lang: 'ru',
  //   quality: 2
  // }).then((result) => {
    
  //   const regionsCollection = new ymaps.GeoObjectCollection({}, {
  //     fillColor: '#16acdb',
  //     strokeColor: '#16acdb',
  //     strokeOpacity: 0.3,
  //     strokeWidth: 1,
  //     strokeStyle: 'dot',
  //     fillOpacity: 0.3,
  //     fill: false,
  //     hintCloseTimeout: 0,
  //     hintOpenTimeout: 0,
  //     hasHint: false
  //   });
    

  //   result.features.forEach(feature => {
  //     regionsCollection.add(new ymaps.GeoObject(feature))
  //   })

    
  //   let highlightedRegion;
  //   regionsCollection.events.add('click', event => {
  //     regionBalloon.close();
  //     const region = event.get('target');
  //     if(highlightedRegion) {
  //       highlightedRegion.options.set({fill: false})
  //     }
  //     console.log(`клик - ${region.properties._data.hintContent} - zoom: ${myMap._zoom}`);
  //     if (myMap._zoom < 8) {
  //       region.options.set({fill: true});
  //       regionBalloon.open(event.get('coords'), region.properties._data.hintContent);
  //     }
      
  //     highlightedRegion = region;
  //   })    
  //   myMap.geoObjects.add(regionsCollection);
  // })
  // .catch(err => {
  //   console.log(err)
  // })


  let polygon;
  myMap.events.add('click', event => {
    if (polygon) {
      myMap.geoObjects.remove(polygon)
    }
    ymaps.geocode(event.get('coords'), {
      kind: 'locality',
      json: true
    })
      .then(res => {
        console.log({res})
        const addressLength = myMap._zoom < 8 ? 2 : 3;
        if (res.GeoObjectCollection.featureMember.length) {
          const geoObject = res.GeoObjectCollection.featureMember[0].GeoObject;
          const params = geoObject.metaDataProperty.GeocoderMetaData.Address.formatted.split(', ').slice(0, addressLength).join(' ').split(' ').join('+');
          console.log({params})
          getPlaces(params)
            .then(places => {
              if(places.length) {

                polygon = new ymaps.Polygon(places[0].geojson.coordinates);
                console.log({place: places[0]})
                myMap.geoObjects.add(polygon);
              }
            })
        } else {
          console.log('from else')
          // ymaps.geocode(event.get('coords'), {
          //   kind: 'district',
          //   json: true
          // })

          // if (res.GeoObjectCollection.featureMember.length) {
          //   const geoObject = res.GeoObjectCollection.featureMember[0].GeoObject;
          //   const params = geoObject.metaDataProperty.GeocoderMetaData.Address.formatted.split(', ').slice(0, addressLength).join(' ').split(' ').join('+');
          //   console.log({params})
          //   getPlaces(params)
          //     .then(places => {
          //       if(places.length) {
  
          //         polygon = new ymaps.Polygon(places[0].geojson.coordinates);
          //         console.log({place: places[0]})
          //         myMap.geoObjects.add(polygon);
          //       }
          //     })
          // }
        }
        
      })
  })
  
}