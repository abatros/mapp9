#!/usr/bin/env node

/*
(()=>{
  const retv = require('dotenv').config()
  if (retv.error) {
    throw retv.error;
  }
})();
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
const cms = require('./cms-openacs.js');


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
            FROM HERE WE RUN ASYNC.
*/
// ##########################################################################

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


const db_conn = {
  host: argv.host || process.env.PGHOST || yaml_env.host,
  port: argv.port || process.env.PGPORT || yaml_env.port,
  database: argv.database || process.env.PGDATABASE || yaml_env.database,
  user: argv.user || process.env.PGUSER || yaml_env.user,
  password: argv.password || process.env.PGPASSWORD,
  pg_monitor: argv.pg_monitor || yaml_env.pg_monitor,
  app_instance: argv.app_instance || yaml_env.app_instance
}

if (!db_conn.password) {
  console.log(`MISSING or invalid password in:`,db_conn);
  throw 'fatal-229'
}


cms.open_cms(db_conn)
.then(async (retv) =>{
  console.log(Object.keys(retv))
//  db = _db;
  package_id = retv.package_id;
  await main();
  cms.close_cms();
})
.catch(err=>{
  console.log(`db_conn:`,db_conn)
  cms.close_cms();
  console.log('fatal err:',err)
  console.trace();
  throw `fatal-247 err =>"${err.message}"`
})

// ----------------------------------------------------------------------------



/******************************************************************

      Insert/update authors in database.
      - get auteurs directoy
      - compare checksum, then new_author or new_revision.
      - cr_item.name (title) using ....

*******************************************************************/


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
  for (ix in vp) {
    const p = vp[ix]
    if (verbose) {
      console.log(`--${ix} found constructeur <${p.title}> [${p.name}]`);
    }
    _assert(!constructeurs[p.name], constructeurs[p.name], 'fatal-344');
    if (!p.data) {
      const retv = await cms.drop_publisher({item_id:p.item_id})
      console.log('retv:',retv)
      throw 'stop-340'
    }
    _assert(p.data, p, 'fatal-335 a constructeur should have data');

    /*
    // FIXING:
    if (!p.data) {
      console.log('ALERT pull_constructors_directory fixing NO Data:',p)
      p.data = {
        name: p.name,
        title: p.title,
        aka: [],
        xi: [] // catalogs.
      }
    }*/


    _assert(p.name, p, `Missing name`)
    _assert(p.title, p, `Missing title`)
    p.data.title = p.data.title || p.title;
    _assert(p.data.title == p.title, p, `fatal-708 Invalid data.title`);

    p.aka = new Set(p.data.aka); // tmp.
//    p.xi = new Set(p.data.xi); // tmp.
    p.xi = new Set([].concat(p.data.xi)); // tmp.
    assert(p.aka instanceof Set);
    assert(p.xi instanceof Set);

//    p.xid = new Set([].concat(p.data.xid)); // tmp.
    constructeurs[p.name] = p; // to get direct access.
    _assert(p.data.title == p.title, p, `fatal-739 Invalid data.title`)
  };
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
  let totalCount =0;
  let commitCount =0;
  const force_commit = false;

  for (const _h1 in constructeurs) {
    const co1 = constructeurs[_h1]
    assert (co1.sec !=3)
    if (!co1.dirty) continue;
//    console.log(`committing dirty constructeur "${co1.title}"`)

    totalCount ++;

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
      if (verbose) {
        console.log(`NO CHANGE checksum -- committing dirty constructeur <${title}>`)
      }
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

//    _assert(retv.latest_revision, retv, 'fatal-990 missing latest_revision')
    _assert(retv.revision_id, retv, 'fatal-990 missing revision_id')
    constructeurs[name].latest_revision = retv.revision_id;
    constructeurs[name].committed = true;
    console.log(`Committed: constructeur <${title}> latest_revision:${retv.revision_id}`)

//    console.log(`committed retv:`,retv)
//    console.log(`committed aka:`,data.aka)
//    throw 'stop-808';
  } // each constructeur.
  console.log(`number of constructeurs:${totalCount} committed:${commitCount}`);
  return constructeurs;
}

// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------

/*
    Candidates for create/update have a property new_data.
*/



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





// ##########################################################################

async function main() {
//  console.log(`main ctx:`,Object.keys(ctx))
//  var {db} = ctx;

  const vp = await pull_constructors_directory(package_id); // publishers == constructeurs
  dump_array(vp, `upload3-(2.1)-constructeurs.yaml`)

  add_constructeurs_from_xlsx(); // sec1 & sec2
  dump_array(constructeurs, `upload3-(3)-xlsx-constructeurs.yaml`)

  const hh4 = await commit_dirty_constructeurs() // ~ publishers ~like auteurs
  dump_array(hh4, `upload3-(4)-constructeurs-commited.yaml`)

  console.log(`Exit main`)
}
