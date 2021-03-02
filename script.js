ymaps.ready(init);

function init(){
  const myMap = new ymaps.Map("map", {
      center: [55.76, 37.64],
      zoom: 4
  });
  const regionBalloon = new ymaps.Balloon(myMap);
  regionBalloon.options.setParent(myMap.options);

  ymaps.borders.load('RU', {
    lang: 'ru',
    quality: 2
  }).then((result) => {
    
    const regionsCollection = new ymaps.GeoObjectCollection({}, {
      fillColor: '#16acdb',
      strokeColor: '#16acdb',
      strokeOpacity: 0.3,
      strokeWidth: 1,
      strokeStyle: 'dot',
      fillOpacity: 0.3,
      fill: false,
      hintCloseTimeout: 0,
      hintOpenTimeout: 0,
      hasHint: false
    });
    

    result.features.forEach(feature => {
      regionsCollection.add(new ymaps.GeoObject(feature))
    })

    
    let highlightedRegion;
    regionsCollection.events.add('click', event => {
      regionBalloon.close();
      const region = event.get('target');
      if(highlightedRegion) {
        highlightedRegion.options.set({fill: false})
      }
      console.log(`клик - ${region.properties._data.hintContent} - zoom: ${myMap._zoom}`);
      if (myMap._zoom < 8) {
        region.options.set({fill: true});
        regionBalloon.open(event.get('coords'), region.properties._data.hintContent);
      }
      
      highlightedRegion = region;
    })    

    myMap.geoObjects.add(regionsCollection);
  })
  .catch(err => {
    console.log(err)
  })
  
}