const assert = require('assert')
const utils = require('./dkz-lib.js');

const iso_cc = {
  DE:'Allemagne',
  GB:'Angleterre',
  AT:'Autriche',
  BE:'Belgique',
  FR:'France',
  ES:'Espagne',
  IE:'Irlande',
  IT:'Italie',
  LU:'Luxembourg',
  MC:'Principauté de Monaco',
  RU:'Russie',
  CH:'Suisse',
  US:'USA',
  GK:'Grèce',
  CN:'Chine',
  SC:'Ecosse',
  NL:'Hollande',
  SW:'Suède',
  PR:'Prusse',
  DK:'Danemark',
  MO:'Monaco',
  JP:'Japon',
  SA:'Allemagne (Sarre)'
};

console.log(`\nCountries Index/frequence`)
Object.keys(iso_cc).forEach(cc=>{
  iso_cc[iso_cc[cc]] = cc;
})

function isoc2 (isoc) {
  /*
      proteger les points dans les parenteses; split on "|".
  */
  const v = isoc.replace(/\([^\)]*\)/g,($)=>{
    return $.replace(/\./g,'~');
  }).split('|')


  /*
      split first part, if (dot) is found.
      <auteur>,<auteur>(dot)<titre>
  */

  const vv = v[0].split('.').map(it=>(it.trim()));
  let [va, _titre] = vv;

  /*
      Get auteurs, re-establish dots in parenteses.
  */

  const auteurs = va.split(',').map(it=>(it.trim().replace(/~/g,'.')));

  let titres = [];
  if (_titre) titres.push(_titre.trim());

  for (const i in v) {
    if (i >0) {
      titres.push(v[i].trim())
    }
  }
  return {titres, auteurs} // titres[0] main titre.
}


module.exports= (json)=>{
  for (const ix in json) {
    const it = json[ix];

    // S: flags
    it.flags = (''+(it.flags||'*')).trim().toUpperCase();
    it.deleted = (it.flags && (it.flags.indexOf('D')>=0)) || false;
    it.restricted = (it.flags && (it.flags.indexOf('R')>=0)) || false;
    it.transcription = (it.flags && (it.flags.indexOf('T')>=0)) || false;

    if (it.deleted) {
      json[ix] = {deleted:true, xid:0};
      continue;
    }


    // A: xid
    it.xid = +(it.xid);
    if ((it.xid<0)||(it.xid>9000)) {
      console.log('it:',it)
      throw 'fatal-118'
    }

    // B: sec
    it.sec = +((it.sec + '').trim());

    // C: yp
    if (it.yp.length<0) throw `fatal-267::xid:${it.xid}`;
    it.yp = +((it.yp + '').trim());
    if (it.yp<10) throw `fatal-267::xid:${it.xid}`
    if (it.yp>3000) throw `fatal-267::xid:${it.xid}`

    // D: circa 'ca'
    it.circa = (it.circa && it.circa.toLowerCase().trim() == 'ca')?'ca':undefined;

    // E: jpeg-pic
    if (!it.pic) {
      it.pic = `${it.yp}-xid-${it.xid}.missing`
    } else {
      it.pic = it.pic.trim();
    }

    // F: co - country
    it.co = (it.co && it.co.trim()) || 'FR'; // default.
    if (!iso_cc[it.co]) {
//      console.log(iso_co)
      throw `Unknow (${it.co})`
    }
    it.co = iso_cc[it.co]

    // G: h1
    if (!it.h1) { // The Original NAME - not suitable for sort.
      console.log(`-- Missing SOC/AUTHOR line-${ix+2} xid:${it.xid}`);
      err_Count ++;
      it.h1 = '*dkz::Unknown-soc/author*'
      throw 'fatal-128'
    } else {
      it.h1 =it.h1.trim();
    }

    // H: isoc
    if (+it.sec ==3) { // Article - without publisher.
      /*
      const {auteurs, titre, titres} = isoc3(it.isoc)
      it.auteurs = auteurs;
      it.titre = titre;
      it.other_titres = titres;*/
//        Object.assign(it,isoc3(it.isoc))

      Object.assign(it,isoc2(it.isoc))
      assert(it.titres)
      assert(it.auteurs)
    } else { // Catalog from Constructeurs. (publisher)
      /*
          h1: Article Original name is found in h1.
          title: Article title === Article name index-ready (indexName).
          TITLE +++ idexName
      */
      const v = it.isoc.split('|').map(it=>it.trim());
      it.isoc = [].concat(v);
      assert(Array.isArray(it.isoc))
      it.title = it.isoc[0]; // IMPORTANT
      it.publisher = it.title;
      it.publisherName = utils.nor_au2(it.publisher); // could be done later
    }

    // I: h2 - keywords, products
    if (it.h2)
    it.h2 = (''+it.h2).split(',').map(it=>it.trim().toLowerCase())

    // J: root
    if (it.root)
    it.root = (''+it.root).split(',').map(it=>it.trim());

    // K: yf - year founded
    if (it.yf)
    it.yf = (''+it.yf).split(',').map(it=>it.trim());

    // L: fr
    it.fr = (''+it.fr).trim();

    // M: marques
    if (it.mk) {
      it.mk = (''+it.mk).split(',').map(it=>it.trim());
    }

    // N: en - english
    if (it.en) it.en = it.en.trim();
    // O: zh - chinese
    if (it.zh) it.zh = it.zh.trim();

    // P: ci
    if (it.ci) it.ci = it.ci.trim();

    // Q: sa
    if (it.sa) it.sa = it.sa.trim();

    // RT: pdf-npages
    it.links = (it.links && (''+it.links).split('|').filter(it=>(it.length>0))) || []
//    it.links = (''+it.links).split('|').filter(it=>(it.length>0));
    it.npages = (it.npages && (''+it.npages).split('|').filter(it=>(it.length>0))) || []
    //    it.npages = (''+it.npages).split('|').filter(it=>(it.length>0));
    // validation must be done after flags

    it.links = it.links.map((fn,j)=> ({fn:fn.trim(),np:it.npages[j]||0}));


    // U: rev
    if (it.rev) it.rev= (''+it.rev).trim();
    // V: com
    if (it.com) it.com= (''+it.com).trim();
    // W: ori
    if (it.ori) it.ori= (''+it.ori).trim();


    //    if (transcription) assert(links.length==0)
    if (it.links.length==0) {
      if (it.transcription || it.restricted) {
        // ok
      } else {
        console.log(`ALERT xid:${it.xid} sec:${it.sec} flags:${it.flags} pdf:${it.links.length} npages:[${it.npages.join(',')}] jpeg:<${it.pic}>`,)
      }
      //      console.log(it);
      //      assert(it.transcription || it.restricted);
    } else {
      if (it.links.length != it.npages.length) {
        console.log(`xid:${it.xid} pdf:${it.links.length} npages:`,it.npages)
  //      throw 'fatal-166'
      }
    }
    if ((it.links.length==0) && it.transcriptions) {
//      links.push(`${it.xid}.transcription`)
    }


    // invalidate.
    it.flags = undefined
    it.npages = undefined;
    if (+it.sec !=3) assert(Array.isArray(it.isoc))

  } // loop
}
