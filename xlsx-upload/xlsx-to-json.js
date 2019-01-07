const assert = require('assert');
const XLSX = require('xlsx'); // npm install xlsx
const jsonfile = require('jsonfile');

module.exports = xlsx2json;

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


function xlsx2json(input_fn) {
  var workbook = XLSX.readFile(input_fn, {cellDates:true});
  const sheet1 = workbook.SheetNames[0];
  console.log(sheet1)

  const results = [];
  var total_entries = 0;

  //console.log('>> (before sheet_to_csv) etime21.1: ', new Date()-startTime);
  const json = XLSX.utils.sheet_to_json(workbook.Sheets[sheet1],{
      header:[
        "xid",              // A
        "sec",              // B
        "yp",               // C
        "circa",            // D
        "pic",              // E : jpeg
        "co",               // F : country
        "h1",               // G
        'isoc',             // H
        "h2",               // I
        'aka',              // J : other name, author (root-name)!
        'yf',               // K : year founded
        'fr',               // L : texte francais
        'mk',               // M : marque
        'en', 'cn',         // N,O : english chinese
        'ci', 'sa',         // P,Q : city, street address
        'links',            // R : pdf[]
        'flag',             // S : [RT..]
        'npages',           // T : number of pages
        'rev',              // U : revision date (Update)
        'com',              // V : comments
        'ori'               // W : origine source du document.
      ], range:1
  }); // THIS IS THE HEAVY LOAD.
  //console.log('>> (after sheet_to_csv)  etime21.2: ', new Date()-startTime);

  //bi += 1;
  //console.log(' -- New batch: ',bi, ' at: ',new Date()-startTime);
  console.log(`-- xlsx-sheet1 nlines: ${json.length}`);
  //total_entries += json.length;
  //console.log(JSON.stringify(json));
  //results.push.apply(results,validate(json));

  //console.log(json)
  // VALIDATION.

  const err_Count = validate(json);
  if (err_Count >0) {
      console.log('Validation failed err_Count:',err_Count);
  //    process.exit(-1);
  } else {
      console.log('validation passed.')
      console.error('validation passed.')
  }
  return json;


  function validate(json) {
    const h = {}
    let err_Count =0;

    for (const j in json) {
      const it = json[j];
      it.deleted = (it.flag && (it.flag.indexOf('D')>=0));
      if (it.deleted) {
        console.log(`## deleted (${it.xid}):`,it.h1)
        continue
      }

      it.sec = +((it.sec + '').trim());

      if (!it.pic) {
  //      console.log(`-- Missing primary key line-${j+2} h1:(${it.h1})`);
  //      err_Count ++;
        it.pic = `${it.yp}-${it.h1}-${j+2}.pkey`
      }
      it.pic = it.pic.trim(); // IMPORTANT THIS IS primary key.
      it.xid = +(it.xid);
      if ((it.xid<0)||(it.xid>9000)) {
        console.log('it:',it)
        throw 'fatal-118'
      }

      it.co = iso_cc[it.co]

      if (!it.h1) {
        console.log(`-- Missing SOC/AUTHOR line-${+j+2} h1:(${it.pic})`);
        err_Count ++;
        it.h1 = '*dkz::Unknown-soc/author*'
        throw 'fatal-128'
      }


      it.co = (it.co && it.co.trim()) || 'FR'; // default.
      if (!iso_cc[it.co]) {
  //      console.log(iso_co)
        throw `Unknow (${it.co})`
      }
      it.ci = (it.ci && it.ci.trim());

      if (it.sec ==3) {
        /*
        const {auteurs, titre, titres} = isoc3(it.isoc)
        it.auteurs = auteurs;
        it.titre = titre;
        it.other_titres = titres;*/
//        Object.assign(it,isoc3(it.isoc))
        Object.assign(it,isoc2(it.isoc))
        assert(it.titres)
      } else {
        it.isoc = (it.isoc && it.isoc.split('|').map(it=>it.trim())) || [];
      }

      if (!it.h1) {
        it.h1 = it.isoc[0]
      }
      it.h1 = it.h1.trim(); // IMPORTANT THIS IS KEY FOR SOC.

      if (it.yp.length<0) throw 'fatal-267::'+j;
      if (it.yp<10) throw 'fatal-267::'+j;
      if (it.yp>3000) throw 'fatal-267::'+j;

      h[it.pic] = h[it.pic] || [];
      h[it.pic].push(j);
      if (h[it.pic].length >1) {
  //      console.log(`-- duplicate primary key (${it.pic}) lines:`,h[it.pic]);
        err_Count ++;
      }

      if (it.links) {
        it.links = it.links.split('|');
        const npages = (it.npages && (''+it.npages).split('|')) || []
        it.links = it.links.map((fn,j)=> ({fn:fn.trim(),np:npages[j]||0}));
        it.npages = undefined;
      }

      if (it.h2) { // products
        it.h2 = (''+it.h2).split(',').map(it=>it.trim().toLowerCase())
      }

      if (it.aka) { // aka and owner
        it.aka = (''+it.aka).split(',').map(it=>it.trim())
        assert(Array.isArray(it.aka))
      }

      if (it.yf) { // year founded
        it.yf = (''+it.yf).split(',').map(it=>it.trim());
      }

//      console.log('revision:',it.rev);
      it.rev = new Date(it.rev).toLocaleDateString();
//      console.log('revision:',it.rev);

      if (it.mk) {
        it.mk = (''+it.mk).split(',').map(it=>it.trim());
      }

    } // loop
  //  const index = Object.keys(h).sort().map(co=>`${co} :${h[co]}`).join('\n')
  //  console.log(index);
    return err_Count;
  };
}

/*
    Syntax:

    "<auteur>,<auteur>,...,<auteur><dot><titre-article>|<aka-1>|...|<aka-n>"
    "<auteur>,<auteur>,...,<auteur>|<titre-article>|<aka-1>|...|<aka-n>"
    <auteur> ::= <lastname> (<prefix>) <postfix>
    <prefix> 'Marquis de' , 'Jean Luc'
    <postfix> := [date] [occupation] [city/coutry/...] <= NO parenthesis.
*/

function isoc3 (isoc) {
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


  /*

  */

  let titres = [];
  if (_titre) titres.push(_titre.trim());

  for (const i in v) {
    if (i >0) {
      titres.push(v[i].trim())
    }
  }

  // extract first titre

  const titre = titres.splice(0,1)[0];
  return {auteurs, titre, titres}
}


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


  /*

  */

  let titres = [];
  if (_titre) titres.push(_titre.trim());

  for (const i in v) {
    if (i >0) {
      titres.push(v[i].trim())
    }
  }
  return {auteurs, titres}
}
