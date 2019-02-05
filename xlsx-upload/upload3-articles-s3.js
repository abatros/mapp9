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
    articles3[o.name] = o; // full object, ok - just a reference to it.
    if (!o.data.sec) { // MINOR FIX
      o.data.sec = 3;
      if (verbose >1) {
        console.log(`-- ALERT fixing incorrect o.data.sec.`)
      }
      articles3[o.name].dirty = true;
    }
    _assert (o.data.sec ==3, o, `fatal-411. Corrupted o.data.sec`);
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

    Articles have links to auteurs+. (isoc=>auteurs)
    We want to have auteurs list for each article.
    That means, auteurs must be recorded in the db, before writing this article in the DB.
    => run upload3-auteurs.js
    Reformat() processes articles/sec in a different way.
    isoc => <auteur>,<auteur>, ... ,<auteur>(point)<titre>
*/


function add_articles3_from_xlsx() {

//  const hh = new Set(); // just to check collisions.
  let missed_pCount =0;
  let dirty_Count = 0;
  let total_Count = 0;
  let new_Count = 0;

  for (const ix in json) { // array
    const it = json[ix];
    if (it.deleted) continue;
    if (it.sec !=3) continue;
    total_Count ++;

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
      _assert(auteurs[name],name,'fatal-591 Missing auteur.')
      if (!auteurs[name]) {
        console.log(`article xid:${xid} auteur (${name}) not found [${title}]`)
        missed_pCount ++;
        console.log(`#auteurs:${Object.keys(auteurs).length}`)
        _assert(auteurs[name], it, `fatal-1297 auteur <${title}>[${name}] not found for article(S3).title:<${title}>`);
      } else {
        if (verbose>1) {
          console.log(`article xid:${xid} auteur (${name}) was found Ok. [${title}]`)
        }
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
//    _assert(false, articles3[name], `fatal-1196 article not found name:<${name}> title:<${title}> articles3:${Object.keys(articles3).length}`)

    new_Count++;
    if (verbose) {
      console.log(`--xlsx:${ix} New article <${title}>`)
    }

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


  console.log(`Exit add_articles3_from_xlsx() titres size: ${Object.keys(articles3).length} new-articles:${new_Count} Missed-authors:${missed_pCount} dirty_Count:${dirty_Count}`)

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
  let committed_Count =0;
  let dirty_Count =0;

  for (const name in articles3) { // array
    const it = articles3[name]; // with xid.
    if (it.deleted) continue;
    if (it.data.sec !=3) continue;
    tCount++;
    if (!it.dirty) continue;
    dirty_Count ++;

    /*
        Validation: either item_id OR (parent_id,name)
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

    const new_checksum = hash(it.data, {algorithm: 'md5', encoding: 'base64' });
    if (it.checksum == new_checksum) {
      if (verbose>1) {
        console.log(`-- xid:${it.data.xid} checksum unchanged => No commit.`)
      }
      continue;
    }


    committed_Count ++;
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
    }
    tCount++;
    it.dirty = false;
  } // loop.
  console.log(`Exit: commit_dirty_articles_S3 dirtyCount:${dirty_Count} committed:${committed_Count}/${tCount}`)
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

  await pull_auteurs_directory();
  dump_array(auteurs, `upload3-(2.2)-authors.yaml`)

  await pull_articles_directory();         // all sections. (articles)
  console.log('dumping articles3.yaml....')
  dump_array(articles3,'upload3-(2.3)-articles3.yaml')

  add_articles3_from_xlsx();
  dump_array(articles3,'upload3-(9)-xlsx-articles-S3.yaml')

  if (stop_number <3) {
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
  console.log(`Everything completed. EXIT.`)
  println('--------------------------------------------------------------------------')


  console.log(`Exit main`)
}
