#!/usr/bin/env node

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
  .alias('k','ignore_title_error')
  .alias('m','ignore_hide_title_error')
  .options({
    'score_min': {default:80, demand:true},
    'xi_min': {default:1, demand:true},
    'h2': {default:false},
    'force-new-revision': {default:false},
    'limit':{default:99999}
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

/*
      if everything successful.
check_missing_pdf(json);
check_missing_jpeg(json);
*/
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
  console.log(`----------------------------------------------------`)
  console.log(`Entering phase 3: commit_dirty_auteurs #auteurs:${Object.keys(auteurs).length}`)
  console.log(`----------------------------------------------------`)
  let dirtyCount =0;
  let committedCount =0;
  const force_commit = false;
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
  va.forEach((o,j) =>{
    // article directory does not have xid.
    // FIX:
    /*
    if (o.title.startsWith('*')) {
      o.title = o.data.titres[0];
      o.dirty = true;
    }*/
    _assert (o.item_id, o, `fatal-423. Missing item_id`);
    _assert (!o.xid, o, `fatal-423. xid present`);
    if (o.data == undefined) {
      console.log(`upload3-crash-dump-article-directory.yaml`)
      fs.writeFileSync('upload3-crash-dump-article-directory.yaml',
       json2yaml.stringify(va)
       ,'utf8');
    }
    _assert (o.data != undefined, o, `fatal-410. Missing o.data at line ${j}`);
    _assert (!o.data.sec, o, `fatal-411. Missing o.data.sec`);
    if (+(o.data.sec) ==3) {
      assert(!articles3[o.name]);
      articles3[o.name] = o; // full object, ok - just a reference to it.
    } else {
      assert(!catalogs[o.name]);
      catalogs[o.name] = o; // full object, ok - just a reference to it.
    }
  })
  console.log(`Exit pull_articles_directory  articles:${Object.keys(articles3).length} catalogs:${Object.keys(catalogs).length}`);
}



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
  vp.forEach(p=>{
    _assert(p.name, p, `Missing name`)
    _assert(p.title, p, `Missing title`)
    _assert(p.data, p, 'fatal-517 Missing constructeur.data')
    if (!p.data.title || (p.data.title != p.title)) {
      if (!argv.ignore_hide_title_error) {
        if (!argv.ignore_title_error) {
          console.log(
            `ALERT p.data.title:${p.data.title} <==> p.title:${p.title}
            To ignore this message add option -k
            To ignore and hide this message add option -m
            `
          )
        }
      }
    }
    _assert(!constructeurs[p.name]);
    constructeurs[p.name] = p; // direct access.
  })
  console.log(`Exit pull_constructors_directory size:${vp.length}`)
  return vp; // an array
}

// ---------------------------------------------------------------------------
async function pull_catalogs_directory(package_id) {
  assert (Object.keys(catalogs).length == 0)

  const vc = await cms.catalogs__directory(package_id);
  vc.forEach(c=>{
    _assert(!catalogs[c.name], catalogs[c.name], 'Already exists!');
    _assert(c.name, c, `Missing name`)
    _assert(c.title, c, `Missing title`)
    _assert(c.data, c, `Missing title`)
    _assert(c.data, c, `fatal-578 Invalid data`)
//    p.data.title = c.data.title || c.title;
    _assert(c.data.h1 == c.title, c, `fatal-580 h1<>title`)
    catalogs[c.name] = c; // full.
  })
  console.log(`Exit pull_catalogs_directory size:${vc.length}`)
  return vc; // an array
}

// ---------------------------------------------------------------------------

function add_catalogs_from_xlsx() {
  console.log(`----------------------------`)
  console.log(`Adding catalogs from xlxs...`)

  let missed_pCount =0;

  /*
      All catalogs pulled from database shouls have an item_id.
  */
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

    catalogs[name] = catalogs[name] || {
        item_id: null, // NEW CATALOG
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
      if (verbose) {
        console.log(`--xid:${it.xid} New catalog title:<${title}> name:<${name}>`)
      }
      continue;
    }

    /*
        Here, we are in update mode. MERGE
    */
    const cat = catalogs[name];
    // should we test the checksum here ? NO, it will be done later.
    if (parent_id != cat.parent_id) {
      console.log(`ALERT parent_id has changed ${a1.item_id} => ${parent_id}`)
    }


    Object.assign(catalogs[name],{
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

let committed_Count = 0;
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


    const new_checksum = hash(it.data, {algorithm: 'md5', encoding: 'base64' });
    if (it.checksum == new_checksum) {
      if (verbose>1) {
        console.log(`-- xid:${it.data.xid} checksum for <${it.title}> unchanged => No commit.`)
      }
      continue;
    }

    // MESSY!!!!!!!!!!!!!!!!!
    //it.checksum = new_checksum
    if (verbose) {
      console.log(`-- xid:${it.data.xid} committing <${it.title}>`)
    }
    const retv = await cms.article__save(it);
//    console.log(`cms.article__save retv:`,retv)
    _assert(retv.latest_revision, retv, 'fatal-728 Missing latest_r')
    console.log(`cms.article__save latest_revision:`,retv.latest_revision)
    it.dirty = false;
    committed_Count++;
    if (committed_Count >= argv.limit) {
      console.log(`catalogs - committed_Count:${committed_Count} limit ${argv.limit} reached.`)
      break;
    }
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

function check_missing_pdf(json) {
  _assert(pdf_folder,pdf_folder,'Missing pdf_folder')
  const pdf = jsonfile.readFileSync('scanp3-pdf/index.json').index;
  console.log(`scanp3-pdf/index contains ${Object.keys(pdf).length} pdf-files.`)

  let missingCount =0;
  let rsync_missingCount =0;
  for (const ix in json) {
    const it = json[ix];
    if (it.deleted) continue;

    it.links.forEach(link =>{
      /*
          FIRST: check if the file exists somewhere.
      */
      if (!pdf[link.fn + '.pdf']) {
        missingCount++;
        console.log(`${missingCount} Missing PDF <${link.fn}> for document xid:${it.xid}`)
      }
      /*
          SECOND: check if the file exists in RSYNC folder.
      */
      const fn = path.join(pdf_folder, path.basename(link.fn + '.pdf'));
      if (!fs.existsSync(fn)) {
        console.log(`pdf-file <${fn}> not found xid:${it.xid}`)
        rsync_missingCount++;
      }
    })
  }

  console.log(`check-missing-pdf: missingCount:${missingCount} rsync-missing:${rsync_missingCount}`)

}


function check_missing_jpeg(json) {
  _assert(jpeg_folder, jpeg_folder,'Missing jpeg_folder')
  const jpeg_index = jsonfile.readFileSync('scanp3-jpeg/index.json').index;
  console.log(`scanp3-jpeg/index contains ${Object.keys(jpeg_index).length} jpeg-files.`)

  let missingCount =0;
  let rsync_missingCount =0;
  for (const ix in json) {
    const it = json[ix];
    if (it.deleted) continue;
    if (it.pic.endsWith(`.missing`)) continue;

    /*
        FIRST: check if the file exists somewhere.
    */
    if (!jpeg_index[it.pic + '.jpg']) {
      missingCount++;
      console.log(`${missingCount} Missing JPEG <${it.pic}> for document xid:${it.xid}`)
    }
    /*
        SECOND: check if the file exists in RSYNC folder.
    */
    const fn = path.join(jpeg_folder, it.pic + '.jpg');
    if (!fs.existsSync(fn)) {
      console.log(`jpeg-file <${fn}> not found xid:${it.xid}`)
      rsync_missingCount++;
    }
  }

  console.log(`check-missing-jpeg: total:${Object.keys(jpeg_index).length} missingCount:${missingCount} rsync-missing:${rsync_missingCount}`)

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

//  await pull_auteurs_directory();
//  dump_array(auteurs, `upload3-(2.2)-authors.yaml`)

  const vc = await pull_catalogs_directory(package_id);
  console.log('dumping catalogs.yaml....')
  dump_array(catalogs,'upload3-(2.4)-catalogs.yaml')


  if (stop_number <3) {
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

  if (stop_number <4) {
    println('--------------------------------------------------------------------------')
    console.log(`Stop-number is ${stop_number}`)
    console.log(`check file: upload3-(7)-xlsx-catalogs.yaml`)
    console.log(`Next stop is 'Commit dirty catalogs' (S1,S2). (-n 8)`)
    println('--------------------------------------------------------------------------')
    return;
  }

  await commit_dirty_catalogs();
  dump_array(catalogs, 'upload3-(8)-catalogs-committed.yaml')


  println('--------------------------------------------------------------------------')
  console.log(`Everything completed. EXIT.`)
  println('--------------------------------------------------------------------------')


  console.log(`Exit main`)
}
