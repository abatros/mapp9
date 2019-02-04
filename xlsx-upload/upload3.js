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
    console.log(err.message);-
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

var input_fn = argv._[0] || `./20190128-full.xlsx`;
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

;(()=>{
  let mCount =0;
  let checked =0;
  for (const ix in json) { // array
    const it = json[ix]; // with xid.
    if (it.deleted || (+it.sec !=3)) continue;
    checked ++;
    if (!it.indexNames || it.indexNames.length <1) {
      mCount++;
      console.log(`-- Missing titres(S3) xid:${it.xid} col(H):${it.isoc}`)
    }
  }
  assert(mCount ==0, 'fatal-187 MISSING TITRES.')
})()




console.log("=============================================")
console.log("PHASE 1 COMPLETE (xlsx is now in json format)")
console.log("=============================================")


// ##########################################################################
/*
            CHECK PDF AND JPEG
*/
// ##########################################################################


const pdf = jsonfile.readFileSync('scanp3-pdf/index.json');
console.log(`pdf-directory:${Object.keys(pdf).length}`)
check_missing_pdf(json,pdf);
const jpeg = jsonfile.readFileSync('scanp3-jpeg/index.json');
console.log(`jpeg-directory:${Object.keys(jpeg).length}`)

// ##########################################################################
/*
            FROM HERE WE RUN ASYNC.
*/
// ##########################################################################

const cms = require('./cms-openacs.js');
//const {db, package_id, main_folder, auteurs_folder, publishers_folder} = app_metadata();

//var db;
var package_id;
const constructeurs = {}; // has key: nor_au(titre)
const auteurs = {};       // hash key: nor_au2(title)
const articles3 = {};      // xid
const catalogs = {};      // xid

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
  console.trace();
  throw `fatal-247 err =>"${err.message}"`
})

// ----------------------------------------------------------------------------

async function pull_auteurs_directory() {
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
  console.log(`Exit pull_auteurs_directory - actual size: ${Object.keys(auteurs).length}`)
  return auteurs;
}

// ----------------------------------------------------------------------------

function add_auteurs_from_xlsx() {

  for (const ix in json) {
    const it = json[ix];
    if (it.deleted || +it.sec != 3) continue;

    it.auteurs.forEach(title =>{
      const name = utils.nor_au2(title + 'author');
      auteurs[name] = auteurs[name] || {
        name,
        title,
        xid:[],
        dirty: true
      };
      auteurs[name].xid = auteurs[name].xid || [];
      auteurs[name].xid.push(it.xid) // reference to this article.
      auteurs[name].dirty = true;
    })
  }

  // cleanup and fixes:
  for (const name in auteurs) {
    const auteur = auteurs[name];
    if (!auteur.dirty) continue;
    _assert(auteur.xid && (auteur.xid.length>0), auteur, 'fatal-289 auteur.xi corrupted');
    const {title} = auteur;
    auteur.data = auteur.data || {name,title};
    auteur.data.h1 = auteur.data.h1 || title;
    // merge auteur.data.xi with auteur.xi
    auteur.data.xid = auteur.data.xid || [];
    _assert(auteur.data.xid &&(Array.isArray(auteur.data.xid)) && (auteur.data.xid.length>=0), auteur, 'fatal-295 auteur.xi corrupted');
    _assert(auteur.xid &&(Array.isArray(auteur.xid)) &&(auteur.xid.length>=0), auteur, 'fatal-296 auteur.xi corrupted');
//    const s = new Set([...[1,2,3],...[4,5,6]]); console.log(s); throw 'stop'
    const s = new Set([...(auteur.data.xid), ...(auteur.xid)]);
    auteur.data.xid = Array.from(s);
    auteur.xid = undefined;
  }

  console.log(`Exit add_auteurs_from_xlsx -- auteurs actual-size: ${Object.keys(auteurs).length}`)


  // write json/yaml files.
  const va = Object.values(auteurs)
  .sort((a,b)=>(a.title.localeCompare(b.title)))

  return va; // to be printed.
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


async function commit_dirty_auteurs() {

  let dirtyCount =0;
  let committedCount =0;

  for(const ix in auteurs) {
    const auteur = auteurs[ix];
    if (!auteur.dirty) continue;
    dirtyCount ++;

    const {item_id, name, title, data, checksum, xi} = auteur;
    // item_id is null for new auteurs.
    _assert(data && data.h1 == title, auteur, `fatal-332 data.h1 corrupted`)
    data.title = undefined;
    _assert(data.xid && data.xid.length >0, data, `fatal-333 missing data.xi`); // we could have no xi in DB

    auteur.new_titres = undefined;
    auteur.titles = undefined;

    const new_revision = {
//      force_new_revision: true,
      item_id,
      name,
      title,
      checksum: hash(data, {algorithm: 'md5', encoding: 'base64' }),
      data
    }

    if ((new_revision.checksum == checksum)&&(!force_commit)) {
      console.log(`NO CHANGE checksum -- committing dirty constructeur <${title}>`)
      continue;
    }

    committedCount ++;
    const o = await cms.author__save(new_revision);
    if (o.error) {
      console.log(o.error)
      throw 'fatal-234'
    }
    if (auteur.revision_id == o.revision_id) committedCount -=1;
    else {
      console.log('before au:',auteur)
      console.log('after o:',o)
    }
    Object.assign(auteurs[ix],o);

//    console.log(auteurs[ix]); throw 'stop-322'
  }
  console.log(`Exit commit_dirty_auteurs -- dirty:${dirtyCount} committed:${committedCount})`);
}

// ---------------------------------------------------------------------------

async function pull_articles_directory() {
  assert (Object.keys(articles3).length == 0)

  const va = await cms.articles__directory(package_id);
  va.forEach(o =>{
    // article directory does not have xid.
    // FIX:
    /*
    if (o.title.startsWith('*')) {
      o.title = o.data.titres[0];
      o.dirty = true;
    }*/
    _assert (o.item_id, o, `fatal-423. Missing item_id`);
    _assert (!o.xid, o, `fatal-423. xid present`);
    if (+o.data.sec ==3) {
      assert(!articles3[o.name]);
      articles3[o.name] = o; // full object, ok - just a reference to it.
    } else {
      assert(!catalogs[o.name]);
      catalogs[o.name] = o; // full object, ok - just a reference to it.
    }
  })
  console.log(`Exit pull_articles_directory  articles:${Object.keys(articles3).length} catalogs:${Object.keys(catalogs).length}`);
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

    // FIXING:
    if (!p.data) {
      console.log('ALERT pull_constructors_directory fixing NO Data:',p)
      p.data = {
        name: p.name,
        title: p.title,
        aka: [],
        xi: [] // catalogs.
      }
    }

    _assert(p.name, p, `Missing name`)
    _assert(p.title, p, `Missing title`)
    p.data.title = p.data.title || p.title;
    _assert(p.data.title == p.title, p, `fatal-708 Invalid data.title`)

    /*
    if (!p.data.xi || !Array.isArray(p.data.xi)) {
      // create empty-one
      console.log('pull_constructors_directory cc.data.xi:',p.data.xi)
      p.data.xi = [];
//      throw 'stop-685 No data.xi'
    }


    if (p.data.acronyms) {
      p.data.acronyms = undefined;
      p.dirty = true;
    }

    if (p.data.legalName) {
      p.data.legalName = undefined;
      p.dirty = true;
    }
    */

    p.aka = new Set(p.data.aka); // tmp.
//    p.xi = new Set(p.data.xi); // tmp.
    p.xi = new Set([].concat(p.data.xi)); // tmp.
    assert(p.aka instanceof Set);
    assert(p.xi instanceof Set);

//    p.xid = new Set([].concat(p.data.xid)); // tmp.
    constructeurs[p.name] = p; // full.
    _assert(p.data.title == p.title, p, `fatal-739 Invalid data.title`)
  })
  console.log(`Exit pull_constructors_directory size:${vp.length}`)
  return vp; // an array
}

// ---------------------------------------------------------------------------

/*

    Constructeurs (S1,S2) are found in isoc reformatted as an array (indexNames)
    They are acronyms aka indexNames.

    (1) hh contains new constructeurs defined in xlsx. (h1: legalName)
    (2) aggregate acronyms (aka), and set legalName.
    (3) sort and create array of new constructeurs to save as json/yaml files.
    (4) hh does not contains aka (acronyms, indexName)
*/

function add_constructeurs_from_xlsx() {

  //const hh = {}; // key is utils.nor_au2(sname)

  /*
      Constructeur name is found in catalog.indexNames[0] => constructeur.title

      (1) Create new entries.
      for each article (S1,S2), pull the constructor's legalName (title) from indexNames[0]
      - register in hh, add the aka.
  */

  for (const ix in json) {
    const it = json[ix];
    if (it.deleted) continue;
    if (it.sec ==3) continue;

    _assert(Array.isArray(it.indexNames) && (it.indexNames.length>0), it, 'fatal-781 indexNames is not an Array')
//    const title = it.h1; // NOT CONSISTENT
    const name = utils.nor_au2(it.indexNames[0]); // unique key while waiting for item_id.

    _assert(it.h1, it, `fatal-804 NO DATA.H1`) // this is document.title not construteur.title
    const title = it.h1; // first indexName[0] is also the construteur.title.
    /*
        h1 is the constructeur.title legalName (S1,S2)
        but name,title are built from indexNames[0]
        IF different from what is in the DB => push in aka.
    */
    constructeurs[name] = constructeurs[name] || {
      name,
      title,
      data: {name,title},
      xi: new Set(),
      aka: new Set(),
      dirty: true
    };
    const p = constructeurs[name];

    /*
          ###################################################
          IF this.title is different from actual.title in db,
          PUSH this new title as aka.
          ###################################################
    */
    // next line is for already commited constructeurs.
    if (p.title != title) {
      p.aka = p.aka || new Set();
      p.aka.add(title);
    }

    _assert(p.xi instanceof Set, p, 'fatal-791')
    _assert(p.aka instanceof Set, p, 'fatal-792')

    p.xi.add(it.xid); // we don't have item_id yet!
    p.dirty = true;

//    _assert(constructeurs[name].title == title, constructeurs[name], `fatal-818 invalid h1:<${title}>`);
  };


  console.log(`add_constructeurs_from_xlsx constructeurs:${Object.keys(constructeurs).length}`);
  /*

      Here, for each constructeur.title we have a new set of catalogs (xi)
      and a new set of aka (alias) acronyms. (!= indexNames entries.)
      if constructeur already exists => MERGE.
  */

  let new_Count =0;
  for (const name in constructeurs) {
    const p = constructeurs[name];
    if (!p.dirty) continue;

    p && _assert((p.xi instanceof Set)&&(p.xi.size>0), p, 'fatal-842 xi empty')

    if (p.xi && p.xi.size>0) {
      p.data.xi = Array.from(p.xi);
      p.xi = undefined;
    }
    p.data.xi = p.data.xi.filter(xid => (+((''+xid).replace(/"/g,''))>=3000))


    _assert(p.aka &&(p.aka instanceof Set), p, 'fatal-830 aka is Missing.')
    if (p.aka && (p.aka.size>0)) {
      p.aka.delete(p.title)
      console.log(`Removing <${p.title}> from aka`)
      p.data.aka = Array.from(p.aka);
      p.aka = undefined
    }
//    p.data.aka = p.data.aka.filter(aka => (aka != p.title))

    p.data.indexNames = undefined;
    _assert(p.data.title == p.title, p, `fatal-867 Invalid co.data.title`)
  } // each dirty constructeur

} // add_constructeurs_from_xlsx


// ---------------------------------------------------------------------------

async function commit_dirty_constructeurs() {
  /*
      check the list
  */
  let dirtyCount =0;
  let commitCount =0;
  const force_commit = false;

  for (const _h1 in constructeurs) {
    const co1 = constructeurs[_h1]
    assert (co1.sec !=3)
    if (!co1.dirty) continue;
//    console.log(`committing dirty constructeur "${co1.title}"`)

    dirtyCount ++;

    //trace();
    const {item_id, name, checksum, title, data} = co1;
    _assert(data.title == title, data, `fatal-1029 h1 corrupted`)
    _assert(data.xi && data.xi.length >0, co1, `fatal-1028 missing data.xi`); // we could have no xi in DB

    // back to data as Arrays.
//    data.indexNames = Array.from(indexNames)
//    data.xi = Array.from(xi)
    data.h1 = undefined;

    const new_revision = {
//      force_new_revision: true,
      item_id,
      name,
      title,
      checksum: hash(data, {algorithm: 'md5', encoding: 'base64' }),
      data
    }

    if ((new_revision.checksum == checksum)&&(!force_commit)) {
      console.log(`NO CHANGE checksum -- committing dirty constructeur <${title}>`)
      continue;
    }

    commitCount ++;
    const retv = await cms.publisher__save(new_revision);

    if (retv.error) {
      console.log('retv:',retv);
      console.log('co1.name:',co1.name);
      console.log('co1.data.name:',co1.data.name);
      throw 'stop-808';
    }

    _assert(retv.latest_revision, retv, 'fatal-990 missing latest_revision')
    constructeurs[name].latest_revision = retv.latest_revision;
    constructeurs[name].committed = true;
    console.log(`Committed: constructeur <${title}> latest_revision:${retv.latest_revision}`)

//    console.log(`committed retv:`,retv)
//    console.log(`committed aka:`,data.aka)
//    throw 'stop-808';
  } // each constructeur.
  console.log(`number of dirty:${dirtyCount} commits:${commitCount}`);
  return constructeurs;
}

// ---------------------------------------------------------------------------

function add_catalogs_from_xlsx() {
  console.log(`----------------------------`)
  console.log(`Adding catalogs from xlxs...`)

  let missed_pCount =0;

  Object.keys(catalogs).forEach(name=>{
    _assert((catalogs[name].item_id), catalogs[name], 'fatal-1069 Missing item_id')
  })

  for (const ix in json) { // array
    const it = json[ix];
    if (it.deleted) continue;
    if (it.sec ==3) continue;

    // here (S1,S2)

    // here it's a catalog, lets take what we need.
    const {xid, sec, yp, circa, pic, co,
      h1, h2, fr, en, zh, mk, ci, sa,
      indexNames, // for cIndex
      // h1 is the constructeur legalName
      links, transcription, restricted
    } = it; // from xlsx, reformat adding publisherName.

//    _assert(it.data._publisherName, it, 'fatal-1210 Missing data._publisherName')
    _assert(indexNames && indexNames.length >0, it, 'fatal-1088 Missing indexNames.')

    /*
        indexNames[0] is the constructeur name for this catalog
        h1 is the title for the catalog
        indexNames[i>=0] are all entries in constructeurs-index
        A constructeur has unique key-name (nor_au2).
    */
    const title = h1;
    const name = `mapp-catalog-${xid}`;
    const _cName = utils.nor_au2(indexNames[0]);
    /*

        check if constructeur-publisher exists.

    */
    _assert(constructeurs[_cName], _cName, `fatal-1110 Missing constructeur <${indexNames[0]}> for catalog.title: <${title}>`)
    const parent_id = constructeurs[_cName].item_id;
    _assert (parent_id, constructeurs[_cName], `fatal-1113 constructeur [${_cName}] Missing parent_id`);


    const data = {
      name,
//      title,  (title === h1)
      xid, sec, yp, circa, pic, co,
      h1, h2, fr, en, zh, mk, ci, sa,
      links, transcription, restricted,
      indexNames, // constructeur name, alias, index entries.
//      _publisherName:_cName // nor_au2
    }
    _assert ((title == data.h1), data, `fatal-1125 title:<${title}> does not match data.h1`);

    console.log(`New catalog-candidate title:<${title}> name:<${name}>`)

    catalogs[name] = catalogs[name] || {
        item_id: null,
        parent_id,
        name,
        title, // h1
        data,
        // will not go into db
        xid, // is known ONLY for new catalogs.
        //cName, _cName,
        indexNames,
        dirty: true
      }

//      hh[name] = articles[name];
    if (!catalogs[name].item_id) {
      console.log(`New catalog title:<${title}> name:<${name}>`)
      continue;
    }

    /*
        Here, we are in update mode. MERGE
    */
    const a1 = catalogs[name];
    /*

          ERROR IN XLSX ====> IGNORE THOSE CATALOGS.

    */
    if (!a1.item_id) {
      console.log(`ALERT CORRUPTED XID IGNORED`);
//      continue;
    }

    _assert (a1.item_id, a1, `fatal-1158 Missing item_id for catalogs[${name}]`);
    // should we test the checksum here ? NO, it will be done later.
    if (parent_id != a1.parent_id) {
      console.log(`ALERT parent_id has changed ${a1.item_id} => ${parent_id}`)
    }

    Object.assign(a1,{
      title,
      parent_id,
      data, // might have a different constructeur.
      // will not go into db
      xid, // is known for new catalogs.
      _cName, indexNames,
      dirty:true
    })

    /*
        NOTE: only new article have an xid.
    */
  } // loop on json


  function dump(o) {
    console.log(o)
  }

  console.log(`Exit add_catalogs_from_xlsx ${Object.keys(catalogs).length} articles - Missed publishers: ${missed_pCount}`)
} // add_catalogs_from_xlsx

// ---------------------------------------------------------------------------

/*
    Candidates for create/update have a property new_data.
*/

async function commit_dirty_catalogs() {
  for (const name in catalogs) { // array
    const it = catalogs[name]; // with xid.
    if (it.deleted) continue;
    if (it.sec ==3) continue;
    if (!it.dirty) continue;

    /*
        NOTE: only new article have an xid.
    */

    /* WAS CHECKED EARLIER
    if (!soc[it.publisherName]) {
      console.log(`commit_dirty_catalogs:: article xid:${it.xid} publisher (${it.publisher}) not found [${it.publisherName}]`)
      missed_pCount ++;
      continue;
    } else {
      if (false)
      console.log(`commit_dirty_catalogs:: article xid:${it.xid} publisher (${it.publisher}) was found Ok. [${it.publisherName}]`)
    }
    */


    //    it.force_new_revision = true;
    _assert(it.parent_id, it, 'fatal-1208 Missing parent_id.')
//    _assert(it._cName, it, 'fatal-1210 Missing data._cName')
    _assert(it.data.indexNames && it.data.indexNames.length >0, it, 'fatal-1211 Missing indexNames for index-constructeurs')
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

//  const hh = new Set(); // just to check collisions.
  let missed_pCount =0;
  let dirty_Count = 0;

  for (const ix in json) { // array
    const it = json[ix];
    if (it.deleted) continue;
    if (it.sec !=3) continue;

    const {xid, sec,
      yp, circa,
      pic,
      h1, // titre de l'article
      h2,
      fr, en, zh,
      mk,
      co, ci, sa,
      links, transcription, restricted,
      indexNames, // entries in index.
      auteurs:_auteurs // to avoid confict with global auteurs[]
    } = it; // from xlsx, reformat adding publisherName.

    const name = `mapp-article3-${xid}`;
    const title =  h1;

    const data = {
      xid, sec, yp, circa, pic, co,
      h1, h2, fr, en, zh, mk, ci, sa,
      links, transcription, restricted,
      auteurs:_auteurs, // should we use the normalized form ?
      indexNames
    }

    _assert(Array.isArray(indexNames) && (indexNames.length>0), it, 'fatal-1284 indexNames not an Array or null')
    _assert(Array.isArray(_auteurs) && (_auteurs.length>0), it, 'fatal-1285 auteurs not an Array or null')

    /*
      Should we save auteurs.item_id ????
    */
    // VALIDATION
    _auteurs.forEach(title=>{
//      console.log(`xid:${xid} au:(${au}) [${utils.nor_au2(au+'author')}]=> item_id:${auteurs[utils.nor_au2(au+'author')].item_id}`,auteurs[utils.nor_au2(au+'author')].title);
      const name = utils.nor_au2(title+'author');
      if (!auteurs[name]) {
        console.log(`article xid:${xid} auteur (${name}) not found [${title}]`)
        missed_pCount ++;
        console.log(`#auteurs:${Object.keys(auteurs).length}`)
        _assert(auteurs[name], it, `fatal-1297 auteur <${title}>[${name}] not found for article(S3).title:<${title}>`);
      } else {
        if (verbose)
        console.log(`article xid:${xid} auteur (${name}) was found Ok. [${title}]`)
      }
    });


    // HERE THE PUBLISHER (parent_id) DOES NOT CHANGE.... bidon.

    if (articles3[name]) {
      const a1 = articles3[name];
      _assert(a1.item_id, a1, `fatal-1180 - Missing item_id`)
      _assert(a1.data.xid == xid, a1, `fatal-1319 xid:${xid} does not match a1.xid:${a1.xid}`)
      _assert(a1.data.sec == 3, a1, `fatal-1320 Invalid a1.data,sec`)
      Object.assign(a1, {
        data,
        title,
        dirty:true
      })
      _assert(a1.item_id, a1, 'fatal-1187 Missing item_id');
      continue;
    }

    //_assert(!!parent_id, it, 'fatal-1329 New article(S3) Missing parent_id')

    /*
        NEW ARTICLE (S3)
    */
    _assert(false, articles3[name], `fatal-1196 article not found name:<${name}> title:<${title}> articles3:${Object.keys(articles3).length}`)
    articles3[name] = {
      item_id: null,
      // parent_id, will be set @commit
      name,
      title, // indexName
      data,
//      xid, // is known for new catalogs.
//      auteurs: _auteurs,
//      indexNames, // for index.
      dirty: true
    }

    function dump(o) {
      console.log(o)
    }

    /*
    const _titre = articles[name]; // only way to retrieve an article.
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

    if (articles[name].dirty) {
      dirty_Count ++;
    }*/

    assert(+articles3[name].data.sec == 3)
    /*
        NOTE: only new article have an xid.
    */
  } // loop on json


  console.log(`Exit add_articles3_from_xlsx() titres size: ${Object.keys(articles3).length} Missed-authors:${missed_pCount} dirty_Count:${dirty_Count}`)

} // add_articles3_from_xlsx

// ---------------------------------------------------------------------------

async function commit_dirty_articles_S3() {

  /*
      FIRST, we need publisher "S3" articles-section3
  */

  const parent_id = await (async ()=>{
    const title = 's3publisher';
    const name = utils.nor_au2(title);
    const s3 = await cms.publisher__new({
      name,
      title,
      data: {name,title}
    })
    const {item_id:parent_id} = s3;
    _assert(parent_id, s3, 'fatal-1397 Unable to get s3publisher parent_id');
    return parent_id;
  })();

  assert(parent_id)

  /*
      LOOP for each article
  */

  console.log(`1261- processing articles size:${Object.keys(articles3).length}`)
//  let nochange_Count =0;
  let tCount =0;
  let revision_Count =0;

  for (const name in articles3) { // array
    const it = articles3[name]; // with xid.
    if (it.deleted) continue;
    if (it.data.sec !=3) continue;
    if (!it.dirty) continue;

    _assert(it.item_id, it, 'fatal-1283')


    /*
        Validation
    */
    if (!it.item_id) {
      _assert(!it.parent_id, it, 'fatal-1288')
  //    _assert(it.xid, it, 'fatal-1289')
    } else {
      _assert(it.parent_id, it, 'fatal-1291')
//      _assert(!it.xid, it, 'fatal-1292')
    }


    /*
        NOTE: only new articles have an xid.
    */

    //    it.force_new_revision = true;

    /*
    _assert (it.data.indexNames, it, 'fatal-1426 Missing titres');
    it.title = it.title || it.data.indexNames[0];
    _assert (it.title, it, 'fatal-1427 Missing title');
    _assert (it.parent_id, it, 'fatal-1428 Missing parent_id');
    */

    console.log(`Commit article xid:${it.data.xid} title:<${it.title}>`)

    it.parent_id = parent_id;

    const w1 = await cms.article__save(it);
    _assert(!w1.error, {it,w1}, 'fatal-1298 Unable to commit article(S3)')

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
  console.log(`Exit: commit_dirty_articles_S3 rCount:${revision_Count}/${tCount}`)
} // commit_dirty_articles_S3


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

function _assert(b, o, err_message) {
  if (!b) {
    console.log(`######[${err_message}]_ASSERT=>`,o);
    console.trace(`######[${err_message}]_ASSERT`);
    throw {
      message: err_message // {message} to be compatible with other exceptions.
    }
  }
}


// --------------------------------------------------------------------------

function dump_array(a,fn) {
  if (fn.endsWith('.yaml')) {
    const err = fs.writeFileSync(fn,
     json2yaml.stringify(a), //new Uint8Array(Buffer.from(yml)),
     'utf8');
  } else {
    throw 'Invalid file format'
  }
}

// --------------------------------------------------------------------------

function check_missing_pdf(json, pdf) {
  let missingCount =0;
  for (const ix in json) {
    const it = json[ix];
    if (it.deleted) continue;

    it.links.forEach(link =>{
      if (!pdf[link.fn + '.pdf']) {
        missingCount++;
        console.log(`${missingCount} Missing PDF <${link.fn}> for document xid:${it.xid}`)
      }
    })
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
    console.log(`Next stop is 'pulling all data from DB' => ./upload3.json -n 2`)
    println('--------------------------------------------------------------------------')
    return;
  }

  const vp = await pull_constructors_directory(package_id); // publishers == constructeurs
  dump_array(vp, `upload3-(2.1)-constructeurs.yaml`)

  await pull_auteurs_directory();
  dump_array(auteurs, `upload3-(2.2)-authors.yaml`)

  await pull_articles_directory();         // all sections. (articles)
  console.log('dumping articles3.yaml....')
  dump_array(articles3,'upload3-(2.3)-articles3.yaml')
  console.log('dumping catalogs.yaml....')
  dump_array(catalogs,'upload3-(2.4)-catalogs.yaml')


  if (stop_number <3) {
    println('--------------------------------------------------------------------------')
    console.log(`Stop-number is ${stop_number}`)
    console.log(`file: upload3-(2)-constructeurs.json`)
    console.log(`Next stop is 'Adding constructeurs from xlsx' => ./upload3.json -n 3`)
    println('--------------------------------------------------------------------------')
    return;
  }

  add_constructeurs_from_xlsx(); // sec1 & sec2
  dump_array(constructeurs, `upload3-(3)-xlsx-constructeurs.yaml`)

  if (stop_number <4) {
    println('--------------------------------------------------------------------------')
    console.log(`Stop-number is ${stop_number}`)
    console.log(`file: upload3-(3)-xlsx-constructeurs.yaml`)
    console.log(`Next stop is 'Commit-dirty-constructeurs (S1,S2)'. (-n 4)`)
    println('--------------------------------------------------------------------------')
    return;
  }

  // add_publishers_from_xlsx(); // sec3
  const hh4 = await commit_dirty_constructeurs() // ~ publishers ~like auteurs
  dump_array(hh4, `upload3-(4)-constructeurs-commited.yaml`)


  if (stop_number <5) {
    println('--------------------------------------------------------------------------')
    console.log(`Stop-number is ${stop_number}`)
    console.log(`check file: upload3-(5)-authors.yaml`)
    console.log(`Next stop is 'Adding authors from xlsx cat3'. (-n 6)`)
    println('--------------------------------------------------------------------------')
    return;
  }

  add_auteurs_from_xlsx();
  dump_array(auteurs,'upload3-(5)-xlsx-auteurs.yaml')

  if (stop_number <6) {
    println('--------------------------------------------------------------------------')
    console.log(`Stop-number is ${stop_number}`)
    console.log(`check file: upload3-(6)-xlsx-auteurs.yaml`)
    console.log(`Next stop is 'Commit dirty authors (S3)'. (-n 7)`)
    println('--------------------------------------------------------------------------')
    return;
  }

  await commit_dirty_auteurs()
  dump_array(auteurs,'upload3-(6)-auteurs-committed.yaml')


  if (stop_number <7) {
    println('--------------------------------------------------------------------------')
    console.log(`Stop-number is ${stop_number}`)
    console.log(`check file: upload3-(6)-catalogs.yaml`)
    console.log(`Next stop is 'Adding catalogs from xlsx (S1,S2)'. (-n 7)`)
    println('--------------------------------------------------------------------------')
    return;
  }

  console.log('add catalogs from xlsx....')
  add_catalogs_from_xlsx();             // from sec1 & sec2 only.
  dump_array(catalogs,'upload3-(7)-xlsx-catalogs.yaml')

  if (stop_number <8) {
    println('--------------------------------------------------------------------------')
    console.log(`Stop-number is ${stop_number}`)
    console.log(`check file: upload3-(7)-xlsx-catalogs.yaml`)
    console.log(`Next stop is 'Commit dirty catalogs' (S1,S2). (-n 8)`)
    println('--------------------------------------------------------------------------')
    return;
  }

  await commit_dirty_catalogs();
  dump_array(catalogs, 'upload3-(8)-catalogs-committed.yaml')

  if (stop_number <9) {
    println('--------------------------------------------------------------------------')
    console.log(`Stop-number is ${stop_number}`)
    console.log(`check file: upload3-(8)-articles-committed.yaml`)
    console.log(`Next stop is 'Add xlsx-articles3' (S3). (-n 9)`)
    println('--------------------------------------------------------------------------')
    return;
  }


  add_articles3_from_xlsx();
  dump_array(articles3,'upload3-(9)-xlsx-articles-S3.yaml')

  if (stop_number <10) {
    println('--------------------------------------------------------------------------')
    console.log(`Your stop-number is ${stop_number}`)
    console.log(`check file: upload3-(9)-xlsx-articles-S3.yaml`)
    console.log(`Next stop is 'Recording new article (sec3)'. (-n ${stop_number+1})`)
    println('--------------------------------------------------------------------------')
    return;
  }

  await commit_dirty_articles_S3();
//  dump_array(articles,'upload3-(12)-articles-S3-committed.yaml')

  println('--------------------------------------------------------------------------')
  console.log(`Your stop-number is ${stop_number}`)
  console.log(`Everything completed. EXIT.`)
  println('--------------------------------------------------------------------------')


  console.log(`Exit main`)
}
