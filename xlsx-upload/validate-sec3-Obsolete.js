const assert = require('assert');

module.exports= (json)=>{
  /*
  const json3 = json.filter(it=>((+it.sec ==3)&&(!it.deleted)));
  console.log(`json3: ${json.length}=>${json3.length}`);

  for (const ix in json3) {
    const it = json3[ix];
//    console.log(`json3[${ix}] xid:${it.xid}`)
    const {xid, titres, auteurs, links} = it;
    const data = Object.assign({},{
      xid, titres, auteurs, links
    })
    console.log(data)
  }
  */

  const json3 = json
  .filter(it=>((+it.sec ==3)&&(!it.deleted)))
  .map(it=>{
    const {xid, pic, yp, circa, titres, auteurs, links, transcription, restricted} = it;
    return Object.assign({},{
      xid, pic, yp, circa, titres, auteurs, links, transcription, restricted
    })
  })

  return json3;
}
