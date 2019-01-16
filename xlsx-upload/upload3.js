#!/usr/bin/env node

/*
(()=>{
  const retv = require('dotenv').config()
  if (retv.error) {
    throw retv.error;
  }
})();
*/

/*
---
  host: localhost
  port: 5432
  database: cms-oacs
  user: postgres
  password: xxxxxxxxxx
  pg_monitor: false
  app_instance: 'cms-236393'


--- THIS IS OBSOLETE
    DB_HOST: inhelium.com
    DB_PORT: 5433
    DB_NAME: cms-openacs
    DB_USER: postgres
    DB_PASS: xxxxxxxxxxxxxxxxx
    DB_MONITOR: true

*/

var XLSX = require('xlsx'); // npm install xlsx
var jsonfile = require('jsonfile');
var fs = require('fs');
const path = require('path');
const assert = require('assert')
//const fsx = require('fs-extra');
const json2yaml = require('json2yaml');
const Json2csvParser = require('json2csv').Parser;
const massive = require('massive');
const hash = require('object-hash');
const utils = require('./dkz-lib.js');
const yaml = require('js-yaml');
const _ = require('lodash')
const argv = require('yargs')
  .alias('v','verbose')
  .count('verbose')
//  .alias('u','debug')
  .alias('m','pg-monitor')        // allow upload, default to false.
  .alias('y','yaml-env')      // env config for PG.
  .alias('u','upload')        // allow upload, default to false.
  .alias('j','jpeg_folder')   // check if jpeg exists in forder
  .alias('p','pdf_folder')    // check if pdf exists in forder
  .alias('h','headline')      // show headline
  .alias('n','stop-number')      // show headline
  .options({
    'score_min': {default:80, demand:true},
    'xi_min': {default:1, demand:true},
    'h2': {default:false},
    'force-new-revision': {default:false}
  })
  .argv;

const force_new_revision = argv['force-new-revision'];
const verbose = argv.verbose;
const pg_monitor = argv['pg-monitor'];
const stop_number = +(argv['stop-number'] || 1);

function println(x) {console.log(x);}
/*
    yaml_env gets db-parameters: host, user, password, port, pakage_id etc...
*/

var yaml_env;

;(()=>{
  const yaml_env_file = argv['yaml-env'] || './.env.yaml';
  try {
    yaml_env = yaml.safeLoad(fs.readFileSync(yaml_env_file, 'utf8'));
    //console.log('env:',yaml_env);
  } catch (err) {
    console.log(err.message);
    console.log(`
      Fatal error opening env-file <${yaml_env_file}>
      Try again using option -y
      ex: ./upload3 -y .env-32024-ultimheat
      `)
    process.exit(-1);
  }
})();

/*
    priority on command line
*/

if (pg_monitor != undefined) yaml_env.pg_monitor = pg_monitor;

//process.exit(-1);

  //let jpeg_folder = argv.jpeg_folder|| './jpeg-1895';
const jpeg_folder = argv.jpeg_folder|| '/media/dkz/Seagate/18.11-Museum-rsync-inhelium/jpeg-www';
  //var pdf_folder = argv.pdf_folder || './pdf-1946';
const pdf_folder = argv.pdf_folder || '/media/dkz/Seagate/18.11-Museum-rsync-inhelium/pdf-www';

var input_fn = argv._[0] || `./20190114-full.xlsx`;
if (!input_fn) {
    console.log('Syntax: node xlsx2json [options] <file-name.xlsx>');
    return;
}

if (!fs.existsSync(input_fn)) {
  console.log(`xlsx file <${input_fn}> does not exist.`);
  process.exit(-1);
} else {
  console.log(`processing xlsx file <${input_fn}>`);
}

function get_real_path(p) {
  let stats = fs.lstatSync(p);
  if (!stats.isDirectory()) {
//    console.log(stats);
//    console.log('isSymbolic:',stats.isSymbolicLink());
    if (stats.isSymbolicLink()) {
      p = fs.readlinkSync(p);
    }
  }
  return p;
}

// ===========================================================================

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
      'root',             // J : other name, author (root-name)!
      'yf',               // K : year founded
      'fr',               // L : texte francais
      'mk',               // M : marque
      'en', 'zh',         // N,O : english chinese
      'ci', 'sa',         // P,Q : city, street address
      'links',            // R : pdf[]
      'flags',             // S : [RT..]
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

jsonfile.writeFileSync('upload3-(1.0)-xlsx-original.json',json,{spaces:2})

require('./reformat.js')(json);
jsonfile.writeFileSync('upload3-(1.1)-reformatted.json',json,{spaces:2})
//check1()

console.log("=============================================")
console.log("PHASE 1 COMPLETE (xlsx is now in json format)")
console.log("=============================================")



// ##########################################################################
/*
            FROM HERE WE RUN ASYNC.
*/
// ##########################################################################

const cms = require('./cms-openacs.js');
//const {db, package_id, main_folder, auteurs_folder, publishers_folder} = app_metadata();

//var db;
var package_id;
const auteurs = {};
const articles = {};
const constructeurs = {}; // the only publishers here, in this App.

/*
cms.open_cms({
  package_id: process.env.package_id,
//  package_id: env.,
  autofix:true,
  pg_monitor: !!argv['pg-monitor']
})*/

cms.open_cms(yaml_env)
.then(async (retv) =>{
  //console.log(Object.keys(retv))
//  db = _db;
  package_id = retv.package_id;
  await main();
  cms.close_cms();
})
.catch(err=>{
  cms.close_cms();
  console.log('fatal err:',err)
  throw `fatal-247 err =>"${err.message}"`
})

// ----------------------------------------------------------------------------

async function get_authors_directory() {
  assert (Object.keys(auteurs).length == 0)
  const va = await cms.authors__directory();
  va.forEach(au =>{
    assert(!auteurs[au.name]);
    auteurs[au.name] = au;
    auteurs[au.name].new_titres = [];
    const titles = new Set(auteurs[au.name].titles);
    auteurs[au.name].titles = titles;
//    if (!au.item_id) throw 'stop-220 Missiing item_id'
    if (!au.checksum) {
      console.log(`### ALERT Missing checksum author:`,au)
    }
    if (!au.item_id) {
      console.log(`### ALERT Missing item_id author:`,au)
    }

  })
  console.log(`Exit get_authors_directory - actual size: ${Object.keys(auteurs).length}`)
}

// ----------------------------------------------------------------------------

function add_auteurs_from_cat3() {
  const ha = {}; // for each auteur, list of articles.

  /*
  .filter(it=>((+it.sec ==3)&&(!it.deleted)))
  .map(it=>{
    const {xid, pic, yp, circa, titres, auteurs, links, transcription, restricted} = it;
    return Object.assign({},{
      xid, pic, yp, circa, titres, auteurs, links, transcription, restricted
    })
  })*/

  for (const ix in json) {
    const it = json[ix];
    if (it.deleted || +it.sec != 3) continue;

    it.auteurs.forEach(au =>{
      ha[au] = ha[au] || [];
      ha[au].push(it.xid)
    })
  }

  // write json/yaml files.
  const va = Object.keys(ha)
  .sort((a,b)=>(a.localeCompare(b)))
  .map(atitle => ({atitle:atitle, ref:ha[atitle]}));
  jsonfile.writeFileSync('upload3-(4)-sec3-new-auteurs.json',va,{spaces:2})

  fs.writeFileSync('upload3-(4)-sec3-new-auteurs.yaml',
   json2yaml.stringify(va), //new Uint8Array(Buffer.from(yml)),
   'utf8', (err) => {
    if (err) throw err;
//    console.log('upload-xlsx-auteurs-sec3.YAML file has been saved!');
  });

  /*

      populate auteurs[]
      key is authorName  (nor_au2)

  */

  Object.keys(ha).forEach(title=>{
    // insert a (dirty) entry in auteurs without item_id.
    const name = utils.nor_au2(title + 'author');
    auteurs[name] = auteurs[name] || {
      title,
      name
    }
    auteurs[name].title = auteurs[name].title || title; // patch... bug
  })
  console.log(`Exit add_auteurs_from_cat3 -- auteurs actual-size: ${Object.keys(ha).length}`)
} // add_auteurs_from_cat3

function dump_auteurs(fn) {
  const va = Object.keys(auteurs)
  .sort((a,b)=>(a.localeCompare(b)))
  .map(aName => (auteurs[aName]));

  jsonfile.writeFileSync(fn.replace('.yaml','.json'),va,{spaces:2})

  fs.writeFileSync(fn,
   json2yaml.stringify(va), //new Uint8Array(Buffer.from(yml)),
   'utf8', (err) => {
    if (err) throw err;
//    console.log('upload-xlsx-auteurs-sec3.YAML file has been saved!');
  });

}


async function record_new_auteurs_into_cms() {

  let new_Count =0;
  let revision_Count =0;
  let aCount =0; // auteurs processed.

  for(const ix in auteurs) {
    const au = auteurs[ix];

    /*
          We don't have data for an author, only:
          - name
          - title (legalName)
    */

    au.data = {
      name: au.name,
      title: au.title
    }


    aCount ++;
    if (au.item_id) {
      revision_Count ++;
      if (!au.checksum) {
        console.log(`### ALERT Missing checksum au:`,au)
      }
    }
    else {
      new_Count ++;
    }

//if (!au.item_id) throw 'stop-318'

    const o = await cms.author__save(au);
    if (o.error) {
      console.log(o.error)
      throw 'fatal-234'
    }
    if (au.revision_id == o.revision_id) revision_Count -=1;
    else {
      console.log('before au:',au)
      console.log('after o:',o)
    }
    Object.assign(auteurs[ix],o);

//    console.log(auteurs[ix]); throw 'stop-322'
  }
  console.log(`Exit record_new_auteurs_into_cms -- total authors seen: ${aCount} (new:${new_Count} revisions:${revision_Count})`);
  return;

  /*
        contribute to auteurs (new or revision)
        from ha. (new auteurs)
  */
  /*
  Object.keys(ha).forEach(async au=>{
    // await cms_authors__new()...

//throw 'stop-158';
    auteurs[au] = auteurs[au] || {
      title: au // it will be reformat later.
    }
  })
  */
}

// ---------------------------------------------------------------------------

async function get_titles_directory() {
  assert (Object.keys(titres).length == 0)
  const va = await cms.articles__directory(package_id);
  va.forEach(o =>{
    assert(!titres[o.name]);
    // article directory does not have xid.
    titres[o.name] = o; // full object, ok - just a reference to it.
  })
  console.log('Exit get_titles_directory size: ',Object.keys(titres).length);
}

// ----------------------------------------------------------------------------

function add_titles_from_json3() {
}

// ----------------------------------------------------------------------------

/*

    titres[aName] => <directory-infos> // including item_id
    titres[aName] => <object-from-json3>  // no item-id

*/

async function record_new_titles_into_cms() { // section-3
  for (ix in json3) {
    const data = json3[ix];

    const name = `museum-article-${data.xid}`
    if (!data.titres || !data.titres[0]) {
      //console.log(data);
      //throw 'fatal-292'
      data.titres.push(`*Missing-title-xid:${data.xid}*`);
      console.log(`########################################`)
      console.log(`ALERT missing title xid:${data.xid} fixed.`);
//      throw 'stop-319'
    }
//    const title = o.titres[0]; // we will take care of alternate names later.
    const title = data.titres[0];

    /*
    if (data.xid == 7706) {
      console.log(`json[7706].titres:`,data.titres)
    }*/

    if (!titres[name]) {
      /*
          This is a new Article.
      */
      const cmd = {
        name, title, data
      }

      console.log(`-- New article <${title}> cmd:`, cmd)
      //console.log(it);
      const o = await cms.article__new(cmd);
      if (o.error) {
        console.log(`cmd.name:(${cmd.name})`)
        console.log(`o.name:(${o.name})`)
        console.log(`titres[${name}]:`, titres[name])
        throw 'fatal-234'
      }
      titres[ix] = o; // Now, there is an item_id
      assert(o.item_id)
      assert(!o.error)
//      console.log(`back-from-db o:`,o)
//      throw 'stop-331'
      continue;
    }

    /*
        Here, it's a new revision.
        option to skip, if same checksum
        Note 1: same checksum => same title.
        data will be replaced.
    */

    const {item_id, checksum} = titres[name];
    if (!item_id) {
      console.log(`titres[name]:`,titres[name])
      throw 'fatal-350 missing item_id'
    }


    const new_checksum = hash(data, {algorithm: 'md5', encoding: 'base64' }) // goes int cr_revision.
    if ((checksum == new_checksum)&&(!force_new_revision)) {
      continue; // nothing changed.
    }
    console.log(`checksum dir.checksum:${checksum} <=> ${new_checksum} (new)`)

    /*

      throw `stop-339 This is a new Revision for article/xid: ${}`

    */

    const o = await cms.article__new_revision({
      item_id, name, title, data
    })

    if (o.error) {
      console.log(`cms.article__new_revision error:`,o.error)
      console.log(`cmd.name:(${cmd.name})`)
      console.log(`o.name:(${o.name})`)
      console.log(`titres[${name}]:`, titres[name])
      throw 'fatal-234'
    } else {
      assert(o.content_revision__new);
      // should be revision_id - but not used anywhere => Ok.
      console.log(`Article xid:${data.xid} new-revision revision_id:${o.content_revision__new} Ok.`)
    }
    titres[ix] = o; // Now, data is updated
    assert(o.item_id)
    assert(!o.error)


  } // loop on json3.
} // record_new_titles_into_cms


/******************************************************************

      Insert/update authors in database.
      - get auteurs directoy
      - compare checksum, then new_author or new_revision.
      - cr_item.name (title) using ....

*******************************************************************/

// ---------------------------------------------------------------------------

/*
      Restricted :(flag == R): remplacer nom du pdf par "Document  sous droits d'auteur, non communicable"
*/

async function index_auteurs_titres_pdf() {
  console.log(`Rebuilding index auteurs.`)
  console.log(`-- auteurs.size:${Object.keys(auteurs).length}`)
  console.log(`-- titres.size:${Object.keys(titres).length}`)



  async function cleanup1() {
    for (name in auteurs) {
      const au = auteurs[name];
      assert(au.name == name)
      if (au.name.indexOf(',')>0) {
        console.log(`name: ${au.name} to be removed.`)
        const retv = await cms.article__delete(au.item_id);
      }
    }
  }

  await cleanup1();

  /*
  let count =0;
  for (name in auteurs) {
    if (++count >3) break;
    const au = auteurs[name];
    console.log(`${name} => au:`,au)
  }

  count =0;
  for (key in titres) {
    if (++count >3) break;
    const it = titres[key];
    console.log(`${key} => title:`,it)
  }
  */

  /*
      create relations (many-to-many) between article-auteur
  */

  const retv = await cms.index_auteurs_titres_pdf()
  if (retv.error) {
    console.log(`FATAL cms.index_auteurs_titres_pdf retv:\n`,retv)
    throw 'fatal-419 retv:'+retv.error;
  }

  //console.log(retv)
  //jsonfile.writeFileSync('upload3-(6)-report1.json',retv,{spaces:2})

console.log(retv)
  const _auteurs = retv.auteurs;

  ;(()=>{
    const hh = {} // access direct to auteurs.
    Object.keys(_auteurs)
    .sort((a,b)=>(a.localeCompare(b)))
    .forEach(au=>{
      assert(!hh[au])
//      hh[au] = retv[au]
      const v = _auteurs[au].map(ti=>{
        return {
          ti:ti.title, pdf:ti.pdf, T:ti.T
        }
      });
      hh[au] = v;
    })

    jsonfile.writeFileSync('upload3-(6)-report2.json',hh,{spaces:2})
    fs.writeFileSync('upload3-(6)-report2.yaml',
     json2yaml.stringify(hh), //new Uint8Array(Buffer.from(yml)),
     'utf8', (err) => {
      if (err) throw err;
    });

  })()

  console.log('Exit index/auteurs.I know.')
} // index-auteurs.

// ---------------------------------------------------------------------------

function list_constructors(section) {
  assert(Array.isArray(json))

  const hh = {};

  for (const ix in json) { // array.
    const cat = json[ix];
    if (cat.deleted) continue;
    if (+cat.sec != +section) continue;
    assert (!cat.deleted);
    assert (+cat.sec === +section);

    if (!Array.isArray(cat.isoc)) {
      console.log(`json[${ix}].isoc:`, cat.isoc);
      check1();
    }

//    assert(Array.isArray(cat.isoc))

    for (jj in cat.isoc) { // array
      const cname = cat.isoc[jj];
      hh[cname] = hh[cname] || [];
      hh[cname].push({
        xid:cat.xid,
        links:cat.links,
        restricted: cat.restricted,
        transcription: cat.transcription
      }); // does not cost more to take everything.
    }
//    console.log(`${it.xid} (${it.h1})`)
  }

  const v = Object.keys(hh)
  .sort((a,b)=>(a.localeCompare(b)))
//  .map(it=>`(${it}) :[${hh[it].join(',')}]`)
//  .map(cname=>({cname, titres:hh[cname]}));
  .map(cname=>({cname, titres:hh[cname]}));
  // here restricted is Ok.
  // but it has nothing to do with what is in the DB, so-far.

  //console.log(v)
  fs.writeFileSync(`upload3-constructeurs-sec${section}.yaml`,
   json2yaml.stringify(v), //new Uint8Array(Buffer.from(yml)),
   'utf8', (err) => {
    if (err) throw err;
  });

}

// ---------------------------------------------------------------------------

/*

      Article/catalog belongs to 1 publisher (and possibly many authors)
      publishers_directory:
        - item_id
        - revision_id
        - name
        - title
        - package_id
        - folder_id

      publishers__directory gives also alternate names for the company (aka)
      mostly ACRONYMS.
      That is done by tapping in data.acronyms.
      Each acronym has an entry in cr_item, as symlink.

      When a revision becomes live, the symlinks must be updated.
      Most likely using a trigger.

      ALSO: we must convert acronyms and xi Array into Sets. NO!
      There is NO data here. so let's create the data{}
*/

async function pull_constructors_directory(package_id) {
  assert (Object.keys(constructeurs).length == 0)

  const vp = await cms.publishers__directory(package_id);
  vp.forEach(p=>{
    assert(!constructeurs[p.name]);

    if (p.data) {
      // convert to set.
      p.data.aka = new Set(p.data.aka);
      p.data.xi = new Set(p.data.xi);
    } else {
      p.data = {
        aka: new Set(),
        xi: new Set() // references to articles/catalogues.
      }
    }


    assert(p.data.aka instanceof Set);
    constructeurs[p.name] = p; // full.
  })
  console.log(`Exit pull_constructors_directory size:${vp.length}`)
  return vp; // an array
}

// ---------------------------------------------------------------------------

/*

    Constructeurs (S1,S2) are found in isoc reformatted as an array.
    The first item is the main publisher's name. (legalName)
    Others are acronyms (->symlinks) (aka).

    (1) hh contains new constructeurs defined in xlsx. (legalName)
    (2) aggregate acronyms (aka), and set legalName.
    (3) sort and create array of new constructeurs to save as json/yaml files.
*/

function add_constructeurs_from_xlsx() {
  const hh = {}; // key is utils.nor_au2(sname)

  /*
      (1) Create new entries.
      for each article (S1,S2), pull the constructor's legalName,
      - register in hh, add the aka.

  */

  for (const ix in json) {
    const it = json[ix];
    if (it.deleted) continue;
    if (it.sec ==3) continue;
    if (!Array.isArray(it.aka)) {
      console.log('ALERT isoc not an array:',it)
      throw 'fatal-732.'
    }

    /*
        Eazy case is new constructeur not in DB yet.
    */

    //console.log(`#constructeurs:${Object.keys(constructeurs).length}`)
    //console.log(`constructeurs[0]:`,Object.entries(constructeurs)[0])
    //throw 'stop-737.'
    const _h1 = utils.nor_au2(it.h1);
    hh[_h1] = hh[_h1] || {
      h1: it.h1,
      aka:new Set(),
      xi: [],
      xid: []
    };
    hh[_h1].xi.push(ix); // index in json, not xid.
    hh[_h1].xid.push(it.xid); // index in json, not xid.

    hh[_h1].aka.add(...it.aka);
//    it.aka.forEach(aka =>{
//      hh[_h1].aka.add(aka);
//    })
  };

  /*
      Here, we have a list of constructeurs not found in db,
      or new aka to add.
      Why we don't add directly in constructeurs ?
      and set the dirty flag.
  */
  console.log(`add_constructeurs_from_xlsx hh.length:${Object.keys(hh).length}`);

  /*
      (2) aggregate acronyms.
      for each soc hh[sname],
      - for each cat soc.cats[] (xlsx entry)
        - for each constructeur in cat
          - add that constructeur as acronym to soc hh[sname].
  */

  /*
  for (sname in hh) {
    const s1 = hh[sname];
    s1.xi.forEach(ix=>{
      const cat = json[ix];
//      s1.legalName = cat.isoc[0];
      cat.isoc.forEach((sname2,j)=>{
        s1.acronyms.add(sname2);
      })
    })

    s1.acronyms.delete(s1.legalName)
    // console.log(`<${sname}> <${s1.legalName}>::ALSO:: <${Array.from(s1.acronyms).join('> <')}>`)
  }*/


  /*
      (3) sort - select data.
  */


  /*
  // write json/yaml files.
  const vcc = Object.keys(hh) // sorted list.
  .sort((a,b)=>(a.localeCompare(b)))
  // select what we need here...
  .map(_h1 => {
    const {h1,aka,xi} = hh[_h1];
    // acronyms and xi are Set.

    return {
      item_id: null,
      name,
      title,
      data: {
        xi,
        acronyms,
        legalName,
        sec
      }
    }
  });
  */

//  .map(atitle => ({atitle:atitle, ref:ha[atitle]}));

//  jsonfile.writeFileSync(`upload3-(3)-xlsx-constructeurs.json`,vsoc,{spaces:2})

  fs.writeFileSync(`upload3-(3)-xlsx-constructeurs.yaml`,
   json2yaml.stringify(hh), //new Uint8Array(Buffer.from(yml)),
   'utf8', (err) => {
    if (err) throw err;
//    console.log('upload-xlsx-auteurs-sec3.YAML file has been saved!');
  });

  /*

      (4) Add new constructeur to constructeur directory.
      With care when merging. FIRST check the checksum.

  */

  let new_Count =0;
  for (const _h1 in hh) {

    const cc1 = hh[_h1];
    const cc2 = constructeurs[_h1];

    if (!cc2) {
      new_Count++;
      console.log(`NEW Constructeur "${cc1.h1}" aka:`, cc1.aka);
      constructeurs[_h1] = cc1;
      cc1.dirty = true;
      continue;
    }

    //console.log(`Constructeur "${cc1.h1}" [${_h1}] already exists in db => Merging...`)

    /*
        What could change ? aka list.
        aka-list is only for index entries. It does not affect the constructeur/publisher.
        => replace, and tag dirty.
    */

    if (_.isEqual(cc1,cc2)) {
      continue;
    }

    console.log(`Constructeur "${cc1.h1}" Merging: `,cc1.aka,cc2.aka)
    if (!cc2.aka) {
      //console.log('cc2:',cc2)
    }
    cc2.aka = cc1.aka;
    cc1.dirty = true;
  }

  /*
      Convert back to arrays. !!! when
  */


return hh;

  /*

      (5) change sets into arrays. NO ! WAIT FOR OTHER SECTION....
      resolve xi into xrefs !!!
      that should be done later, when we have the catalogs.
      Each catalog should be linked to the owner (publisher)
      How to differentiate main soc[] from symlinks. ???

  */

  for (const sname in constructeurs) {
    const s1 = constructeurs[sname];
    s1.data.xi.has(0);
    s1.data.acronyms.has('dkz');
    // data.xi are links to articles/catalogues.
//    s1.data.xi = Array.from(s1.data.xi).map(lineNo=>(json[lineNo].xid));
    s1.data.xi = [];
    s1.data.acronyms = Array.from(s1.data.acronyms);
  }

  console.log(`New constructeurs size:${vsoc.length}`)
  console.log(`#constructeurs:${Object.keys(constructeurs).length}`)

  return hh;
} // add_constructeurs_from_xlsx


// ---------------------------------------------------------------------------

async function commit_dirty_constructeurs_into_cms() {
  /*
      check the list
  */
  for (const _h1 in constructeurs) {
    const cc1 = constructeurs[_h1]
    assert (cc1.sec !=3)

    function trace() {
      if ((!cc1.item_id) &&Array.from(cc1.data.aka).length>0) {
        if (true) {
          if (cc1.title == cc1.h1)
          console.log(`## <${cc1.h1}> [${cc1.name}] ::aka::`,cc1.data.aka)
        } else {
          console.log(`## <${cc1.title}> [${cc1.name}] <${cc1.h1}> ::aka::`,cc1.data.aka)
        }
      }
    } // trace

    //trace();
    const {item_id, name, checksum, title, h1, data} = cc1;
    if (!Array.isArray(data.xi)) {
      console.log(cc1);
      throw 'stop-819'
    }
    assert(Array.isArray(data.xi))
    assert(Array.isArray(data.aka))
    data.h1 = data.h1 || '*dkz:Unknown*'
    assert(data.h1)

    const retv = await cms.publisher__save({
//      force_new_revision: true,
      item_id,
      name,
      title,
      checksum, // from directory.
      jsonb_data: data
    });

    if (retv.error) {
      console.log('retv:',retv); throw 'stop-808';
    }
  }

}

// ---------------------------------------------------------------------------

function add_catalogs_from_xlsx() {

  const hh = new Set(); // just to check collisions.
  let missed_pCount =0;

  for (const ix in json) { // array
    const it = json[ix];
    if (it.deleted) continue;
    if (it.sec ==3) continue;

//    it.publisher = it.publisher || (it.isoc && it.isoc[0]) || '*Unknown-publisher*'
//    it.publisherName = utils.nor_au2(it.publisher);

    // here it's a catalog, lets take what we need.
    const {xid, sec, yp, circa, pic, co,
      h1, h2, fr, en, zh, mk, ci, sa,
      isoc,
      links, transcription, restricted,
      title, publisher, publisherName
    } = it; // from xlsx, reformat adding publisherName.

    assert(publisher)
    assert(title == publisher)
    assert(publisherName)
    /*

        check if publisher exists.

    */

    if (!soc[publisherName]) {
      console.log(`article xid:${xid} publisher (${publisher}) not found [${publisherName}]`)
      missed_pCount ++;
    } else {
      if (verbose)
      console.log(`article xid:${xid} publisher (${publisher}) was found Ok. [${publisherName}]`)
    }


    const data = {
      title,
      publisher, publisherName,
      xid, sec, yp, circa, pic, co,
      h1, isoc, h2, fr, en, zh, mk, ci, sa,
      links, transcription, restricted
    }

    const name = `mapp-catalog-${xid}`;

    assert(!hh.has(name)); hh.add(name);

    titres[name] = titres[name] || {
      item_id: null,
      name,
      title, // indexName
      data,
      xid, // is known for new catalogs.
      publisher,
      publisherName,
      dirty: true
    }

    function dump(o) {
      console.log(o)
    }

    const _titre = titres[name]; // only way to retrieve an article.
    if (_titre.item_id) {
      // here we are in update mode.
      // what can happen here ? new name, title, data ....
      assert (name == _titre.name)
//      assert (title == _titre.title, dump(_titre))
//      assert (title == _titre.title)
      _titre.title = title;

// xid is not in directory      assert (xid == _titre.data.xid)
      _titre.data = data; // replace :: we are NOT loosing the old checksum.
      _titre.dirty = true;
      // because still in _titre.checksum - we are safe!
      _titre.publisher = publisher;
      _titre.publisherName= publisherName;
    }

    /*
        NOTE: only new article have an xid.
    */
  } // loop on json


  console.log(`Exit add_catalogs_from_xlsx titres size: ${Object.keys(titres).length} Missed publishers: ${missed_pCount}`)

} // add_catalogs_from_xlsx

// ---------------------------------------------------------------------------

/*
    Candidates for create/update have a property new_data.
*/

async function record_new_catalogs_into_cms() {
  for (const name in titres) { // array
    const it = titres[name]; // with xid.
    if (it.deleted) continue;
    if (it.sec ==3) continue;
    if (!it.dirty) continue;

    /*
        NOTE: only new article have an xid.
    */

    if (!soc[it.publisherName]) {
      console.log(`record_new_catalogs_into_cms:: article xid:${it.xid} publisher (${it.publisher}) not found [${it.publisherName}]`)
      missed_pCount ++;
      continue;
    } else {
      if (false)
      console.log(`record_new_catalogs_into_cms:: article xid:${it.xid} publisher (${it.publisher}) was found Ok. [${it.publisherName}]`)
    }

    //    it.force_new_revision = true;

    it.parent_id = soc[it.publisherName].item_id;
    if (!it.parent_id) {
      console.log(`publisher[${soc[it.publisherName]}]:`,soc[it.publisherName]);
      throw 'stop-970'
    }
    await cms.article__save(it);
    it.dirty = false;
  }
}

// ---------------------------------------------------------------------------

function check_articles_parent_publisher() {
  for (const name in titres) { // array
    const titre = titres[name]; // with xid.
    if (titre.deleted) continue;
    if (titre.sec ==3) continue;

    const _name = utils.nor_au2(titre.publisher);
    const constructeur = soc[_name] || '***';
//    console.log(`${titre.title} (${titre.item_id}) => publisher: <${titre.publisher}> [${constructeur.name}] @${constructeur.item_id}`)

    /*
          compare article.parent_id with publisher.item_id
    */

    if (!titre.parent_id) {
      console.log(titre); throw 'stop-953'
    }

    if (!titre.parent_id != constructeur.item_id) {
      console.log(`alert article parent_id: ${titre.parent_id} <=!=> constructeur_id: ${constructeur.item_id}`)
    }
  }
}

// ---------------------------------------------------------------------------

/*

    Those articles have links to auteurs+.
    We want to have auteurs list for each article.
    That means, auteurs must be recorded in the db, before writing this article in the DB.
    Reformat() processes articles/sec in a different way.
    isoc => <auteur>,<auteur>, ... ,<auteur>(point)<titre>
*/


function add_articles3_from_xlsx() {

  const hh = new Set(); // just to check collisions.
  let missed_pCount =0;
  let dirty_Count = 0;

  for (const ix in json) { // array
    const it = json[ix];
    if (it.deleted) continue;
    if (it.sec !=3) continue;

    const {xid, sec, yp, circa, pic, co,
      h1, h2, fr, en, zh, mk, ci, sa,
      isoc,
      links, transcription, restricted,
      title,
      titres:_titres, auteurs:_auteurs
    } = it; // from xlsx, reformat adding publisherName.

    assert(Array.isArray(_titres))
    assert(Array.isArray(_auteurs))

    /*
      Should we save auteurs.item_id ????
    */

    _auteurs.forEach(au=>{
//      console.log(`xid:${xid} au:(${au}) [${utils.nor_au2(au+'author')}]=> item_id:${auteurs[utils.nor_au2(au+'author')].item_id}`,auteurs[utils.nor_au2(au+'author')].title);
      const name = utils.nor_au2(au+'author');
      if (!auteurs[name]) {
        console.log(`article xid:${xid} auteur (${name}) not found [${au.title}]`)
        missed_pCount ++;
      } else {
        if (verbose)
        console.log(`article xid:${xid} auteur (${name}) was found Ok. [${au.title}]`)
      }
    })

    const data = {
      title,
      titres:_titres, auteurs:_auteurs,
      xid, sec, yp, circa, pic, co,
      h1, isoc, h2, fr, en, zh, mk, ci, sa,
      links, transcription, restricted
    }

    const name = `mapp-article3-${xid}`;

    assert(!hh.has(name)); hh.add(name);

    titres[name] = titres[name] || {
      item_id: null,
      name,
      title, // indexName
      data,
      xid, // is known for new catalogs.
      auteurs:[], titres:[], // for index.
      dirty: true
    }

    function dump(o) {
      console.log(o)
    }

    const _titre = titres[name]; // only way to retrieve an article.
    if (_titre.item_id) {
      // here we are in update mode.
      // what can happen here ? new name, title, data ....
      assert (name == _titre.name)
//      assert (title == _titre.title, dump(_titre))
//      assert (title == _titre.title)
      _titre.title = title;

// xid is not in directory      assert (xid == _titre.data.xid)
      _titre.data = data; // replace :: we are NOT loosing the old checksum.
      _titre.dirty = true;
      // because still in _titre.checksum - we are safe!
//      _titre.publisher = publisher;
//      _titre.publisherName= publisherName;
    }

    if (titres[name].dirty) {
      dirty_Count ++;
    }

    assert(+titres[name].data.sec == 3)
    /*
        NOTE: only new article have an xid.
    */
  } // loop on json


  console.log(`Exit add_articles3_from_xlsx() titres size: ${Object.keys(titres).length} Missed authors: ${missed_pCount} dirty_Count:${dirty_Count}`)

} // add_articles3_from_xlsx

// ---------------------------------------------------------------------------

async function record_new_articles3_into_cms() {

  /*
      FIRST, we need publisher "S3" articles-section3
  */

  const title = 's3publisher';
  const name = utils.nor_au2(title);
/*
  const a3 = await cms.publisher__get({name});
  if (!a3.item_id) {
    const a3 = await cms.publisher__new({
      name,
      title,
      data: {name,title}
    });
    item_id = a3.item_id;
  } else {
    item_id = a3.item_id;
  }
*/

  const s3 = await cms.publisher__new({
    name,
    title,
    data: {name,title}
  })
  const {item_id} = s3;
  if (!item_id) {
    console.log(`item_id:${item_id} s3:`,s3);
  }

  /*
      LOOP for each article
  */

  console.log(`1261- processing titres size:${Object.keys(titres).length}`)
//  let nochange_Count =0;
  let tCount =0;
  let revision_Count =0;

  for (const name in titres) { // array
    const it = titres[name]; // with xid.
    if (it.deleted) continue;
    if (it.data.sec !=3) continue;
    if (!it.dirty) continue;

    /*
        NOTE: only new articles have an xid.
    */

    /*
    if (!soc[it.name]) {
      console.log(`record_new_articles3_into_cms:: article xid:${it.xid} publisher (${it.publisher}) not found [${it.publisherName}]`)
      missed_pCount ++;
      continue;
    } else {
      if (false)
      console.log(`record_new_articles3_into_cms:: article xid:${it.xid} publisher (${it.publisher}) was found Ok. [${it.publisherName}]`)
    }*/

    //    it.force_new_revision = true;

    it.parent_id = item_id;
    if (!it.parent_id) {
      console.log(`publisher[${soc[it.publisherName]}]:`,soc[it.publisherName]);
      throw 'stop-970'
    }
    const w1 = await cms.article__save(it);
    if (w1.error) {
      console.log('dirty@1267:',it)
      console.log('w1:',w1);
      throw 'stop-1293.'
    }
    if (w1.info) {
      //if (w1.retCode != 'ok')
      console.log(`w1.info (xid:${it.data.xid}) retCode:${w1.retCode} message:`, w1.info);
    } else {
      revision_Count ++;
    }
    tCount++;
    it.dirty = false;
  } // loop.
  console.log(`Exit: record_new_articles3_into_cms rCount:${revision_Count}/${tCount}`)
} // record_new_articles3_into_cms


// ---------------------------------------------------------------------------

function check1() {
  for (const ix in json) {
    const it = json[ix];
    if (it.deleted) continue;
    if (it.sec ==3) continue;
    if (!Array.isArray(it.isoc)) {
      console.log(it)
      console.trace();
      throw 'fatal-645'
    }
  }
}

function check2(x,y) {
  if (!x) {
    console.log(`FATAL check2`);
    console.log(y)
    console.trace();
    throw `FATAL check2`;
  }
}

// --------------------------------------------------------------------------

function dump_array(a,fn) {
  if (fn.endsWith('yaml')) {
    fs.writeFileSync(fn,
     json2yaml.stringify(a), //new Uint8Array(Buffer.from(yml)),
     'utf8', (err) => {
      if (err) throw err;
      console.log(`<${fn}> file cpmplete!`);
    });
  }
}


// ##########################################################################

async function main() {
//  console.log(`main ctx:`,Object.keys(ctx))
//  var {db} = ctx;

  if (stop_number <2) {
    println('--------------------------------------------------------------------------')
    console.log(`Stop-number is ${stop_number}`)
    console.log(`file: upload3-(1.0)-xlsx-original.json`)
    console.log(`file: upload3-(1.1)-reformatted.json`)
    console.log(`Next stop is 'Getting publishers directory' => ./upload3.json -n 2`)
    println('--------------------------------------------------------------------------')
    return;
  }

  const vp = await pull_constructors_directory(package_id); // publishers == constructeurs
  dump_array(vp, `upload3-(2)-constructeurs.yaml`)

  if (stop_number <3) {
    println('--------------------------------------------------------------------------')
    console.log(`Stop-number is ${stop_number}`)
    console.log(`file: upload3-(2)-constructeurs.json`)
    console.log(`Next stop is 'Adding constructeurs from xlsx' => ./upload3.json -n 3`)
    println('--------------------------------------------------------------------------')
    return;
  }

  add_constructeurs_from_xlsx(); // sec1 & sec2

  if (stop_number <4) {
    println('--------------------------------------------------------------------------')
    console.log(`Stop-number is ${stop_number}`)
    console.log(`file: upload3-(3)-constructeurs.json`)
    console.log(`Next stop is 'Commit new constructeurs sec1 & sec2'. (-n 4)`)
    println('--------------------------------------------------------------------------')
    return;
  }

  // add_publishers_from_xlsx(); // sec3
  await commit_dirty_constructeurs_into_cms() // ~ publishers ~like auteurs

  if (stop_number <5) {
    println('--------------------------------------------------------------------------')
    console.log(`Stop-number is ${stop_number}`)
    console.log(`file: upload3-(4)-constructeurs.json`)
    console.log(`Next stop is 'Getting titles/articles directory from DB'. (-n 5)`)
    println('--------------------------------------------------------------------------')
    return;
  }

  await get_titles_directory();         // all sections. (articles)

  if (stop_number <6) {
    println('--------------------------------------------------------------------------')
    console.log(`Your stop-number is ${stop_number}`)
    console.log(`Next stop is 'Adding catalogs from sec1 & sec2'. (-n 6)`)
    println('--------------------------------------------------------------------------')
    return;
  }

  add_catalogs_from_xlsx();             // from sec1 & sec2 only.

  if (stop_number <7) {
    println('--------------------------------------------------------------------------')
    console.log(`Your stop-number is ${stop_number}`)
    console.log(`Next stop is 'Recording new catalogs (or updates) from sec1 & sec2'. (-n 7)`)
    println('--------------------------------------------------------------------------')
    return;
  }

  await record_new_catalogs_into_cms();

  if (stop_number <8) {
    println('--------------------------------------------------------------------------')
    console.log(`Your stop-number is ${stop_number}`)
    console.log(`Next stop is 'Getting authors-directory'. (-n 8)`)
    println('--------------------------------------------------------------------------')
    return;
  }

  await get_authors_directory();

  if (stop_number <9) {
    println('--------------------------------------------------------------------------')
    console.log(`Your stop-number is ${stop_number}`)
    console.log(`Next stop is 'Adding authors from cat3'. (-n 9)`)
    println('--------------------------------------------------------------------------')
    return;
  }

  await add_auteurs_from_cat3();
  dump_auteurs('upload3-(5)-sec3-auteurs-full.yaml')

  if (stop_number <10) {
    println('--------------------------------------------------------------------------')
    console.log(`Your stop-number is ${stop_number}`)
    console.log(`Next stop is 'Recording new authors (or updates) for cat3'. (-n 10)`)
    println('--------------------------------------------------------------------------')
    return;
  }

  await record_new_auteurs_into_cms()

  if (stop_number <11) {
    println('--------------------------------------------------------------------------')
    console.log(`Your stop-number is ${stop_number}`)
    console.log(`Next stop is 'Adding new article (sec3) from xlsx'. (-n ${stop_number+1})`)
    println('--------------------------------------------------------------------------')
    return;
  }

  add_articles3_from_xlsx();

  if (stop_number <12) {
    println('--------------------------------------------------------------------------')
    console.log(`Your stop-number is ${stop_number}`)
    console.log(`Next stop is 'Recording new article (sec3)'. (-n ${stop_number+1})`)
    println('--------------------------------------------------------------------------')
    return;
  }

  await record_new_articles3_into_cms();

  println('--------------------------------------------------------------------------')
  console.log(`Your stop-number is ${stop_number}`)
  console.log(`Everything completed. EXIT.`)
  println('--------------------------------------------------------------------------')


  console.log(`Exit main`)
}
