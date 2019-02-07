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
  .alias('k','ignore_missing_pdf')
  .alias('m','ignore_hide_missing_pdf')
  .options({
    'score_min': {default:80, demand:true},
    'xi_min': {default:1, demand:true},
    'h2': {default:false},
    'force-new-revision': {default:false},
    'limit':{default:99999},
    'phase':{default:0, alias:'q'}
  })
  .argv;


var yaml_env; // less priority

;(()=>{
  const yaml_env_file = argv['yaml-env'] || './.upload3-relink-pdf.yaml';
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

function println(x) {console.log(x);}

const force_new_revision = argv['force-new-revision'];
const verbose = argv.verbose;
const pg_monitor = argv['pg-monitor'] || yaml_env.pg_monitor;
const jpeg_folder = argv.jpeg_folder|| yaml_env.jpeg_folder || '/media/dkz/Seagate/18.11-Museum-rsync-inhelium/jpeg-www';
const pdf_folder = argv.pdf_folder || yaml_env.pdf_folder || '/media/dkz/Seagate/18.11-Museum-rsync-inhelium/pdf-www';
const pdf_search_inputs = yaml_env.pdf_inputs; // ARRAY.
const jpeg_search_inputs = yaml_env.jpeg_inputs; // ARRAY.

var input_fn = argv._[0] || `./20190206-full.xlsx`;
if (!input_fn) {
    console.log('Syntax: ./upload3-relink-pdf [options] <file-name.xlsx>');
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
jsonfile.writeFileSync('upload3-(1.1)-xlsx-reformatted.json',json,{spaces:2})
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



// ##########################################################################
/*
            CHECK PDF AND JPEG
*/
// ##########################################################################

const pdf_inputs = new Set();
if (argv.pdf_dir) pdf_inputs.add(argv.pdf_dir)
yaml_env.pdf_inputs && yaml_env.pdf_inputs.forEach(i=>{pdf_inputs.add(i)})
console.log(`pdf-inputs:`, pdf_inputs);
_assert(pdf_inputs.size>0,pdf_inputs,'Missing pdf-inputs')


const jpeg_inputs = new Set();
if (argv.jpeg_dir) jpeg_inputs.add(argv.pdf_dir)
yaml_env.jpeg_inputs && yaml_env.jpeg_inputs.forEach(i=>{jpeg_inputs.add(i)})
console.log(`jpeg-inputs:`,jpeg_inputs);
//_assert(jpeg_inputs.size>0, jpeg_inputs,'Missing jpeg-inputs')


if (argv.phase <2) {
  console.log(`
    ---------------------------------------------
    PHASE 1 COMPLETE (xlsx is now in json format)
    * next is checking if PDF exists.
    * a root folder must be given and/or inputs.
    To continue use option -q2
    ---------------------------------------------
    `);
  process.exit(0);
}

const pdf_sindex = mk_search_index(pdf_inputs, ['\.pdf$']);
jsonfile.writeFileSync('upload3-relink-pdf-sindex.json',pdf_sindex,{spaces:2})

const jpeg_sindex = mk_search_index(jpeg_inputs, ['\.jpg$']);
jsonfile.writeFileSync('upload3-relink-jpeg-sindex.json',jpeg_sindex,{spaces:2})

if (argv.phase <3) {
  console.log(`
    ---------------------------------------------
    PHASE 2 COMPLETE :
    * seach indexes are ready.
    Next is finding pdf in search-index.
    To continue use option -q3
    ---------------------------------------------
    `);
  process.exit(0);
}

check_missing_pdf(json);
check_missing_jpeg(json);


if (argv.phase <4) {
  console.log(`
    ---------------------------------------------
    PHASE 3 COMPLETE :
    * check report with missing pdf-files.
    To continue use option -q4
    ---------------------------------------------
    `);
  process.exit(0);
}

// ##########################################################################
/*
            FROM HERE WE RUN ASYNC.
*/
// ##########################################################################

//const {db, package_id, main_folder, auteurs_folder, publishers_folder} = app_metadata();

//var db;
var package_id;
const articles_all = {};      // xid

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

const pdf_index = {};

async function pull_articles_all() {
  assert (Object.keys(articles_all).length == 0)

  const va = await cms.articles__directory(package_id);
  for (ix in va) {
    const o = va[ix];
    if (o.restricted) continue;
    _assert (o.item_id, o, `fatal-423. Missing item_id`);
    _assert (!o.xid, o, `fatal-423. xid present`);
    if (o.data == undefined) {
      console.log(`upload3-crash-dump-article-directory.yaml`)
      fs.writeFileSync('upload3-crash-dump-article-directory.yaml',
       json2yaml.stringify(va)
       ,'utf8');
    }
    _assert (o.data, o, `fatal-401. missing data`);
    _assert(!articles_all[o.name], o, `fatal-@406. This article already exists.`)
    articles_all[o.name] = o; // full object, ok - just a reference to it.

    o.data.links.forEach(pdf =>{
      pdf_index[pdf.fn] = pdf_index[pdf.fn] || {ref:null, articles:[]}
      pdf_index[pdf.fn].articles.push(o);
    })
  }

  let n2 =0;
  console.log('Warning - pdf-files used in multiples documents')
  Object.keys(pdf_index).forEach((fn,j) =>{
    if (pdf_index[fn].articles.length>1) {
//      console.log(`-- ${fn} ${pdf_index[fn].map(o=>`[${o.item_id}]`).join(', ')}`)
      console.log(`--${n2} ${fn} ${pdf_index[fn].articles.map(o=>`[${o.data.xid}]`).join(', ')}`)
      n2++;
    }
  })


  console.log(`Exit pull_articles  articles:${Object.keys(articles_all).length} collisions:${n2}`);
  return pdf_index; // for each fileName -> list of articles.
}

// ---------------------------------------------------------------------------

async function commit_links_pdf_articles() {

  /*
      PHASE 1: GET ALL PDF, and check if they are used.
  */

  const vf = await cms.pdf__directory();
  console.log(`Found ${vf.length} PDF-files`)
  let lostCount =0;
  vf.forEach((pdf,j)=>{
    const fn = pdf.title.replace(/\.pdf$/,'')
    if (!pdf_index[fn]) {
      lostCount++
      console.log(`--${lostCount}/${j} lost PDF: <${pdf.title}>`)
    } else {
      /*
        Register in pdf_index.
      */
      pdf_index[fn].ref = pdf;
    }
  })

  let nrels =0;
  let mCount =0;
  for (fn in pdf_index) {
    for (ix in pdf_index[fn].articles) {
      const o = pdf_index[fn].articles[ix];
      if (!pdf_index[fn].ref) {
        mCount++;
        if (!argv.ignore_missing_pdf) {
          _assert(pdf_index[fn].ref, pdf_index[fn], `Missing ref for pdf-file <${fn}>\n use option -k to ignore, -m to hide`)
        } else {
          console.log(`--${mCount} ALERT Missing ref for pdf-file <${fn}>`)
        }
        continue;
      }

      if (verbose) {
        console.log(`-- <${fn}>[item_id:${pdf_index[fn].ref.item_id}] used in item_id:${o.item_id} xid:${o.data.xid}`)
      }
      nrels++;
    }
  }
  console.log(`Leaving commit_links_pdf_articles nrels:${nrels} pdf:${Object.keys(pdf_index).length} ${vf.length} PDF-files`)
  console.log(`Leaving commit_links_pdf_articles ${lostCount} pdf errants - Missing count:${mCount}.`)
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
//  const pdf = jsonfile.readFileSync('scanp3-pdf/index.json').index;

  const pdf_root = Array.from(pdf_inputs)[0];
  _assert(pdf_root, pdf_inputs, "Missing pdf-root")
  const pdf = pdf_sindex;
  console.log(`pdf-sindex contains ${Object.keys(pdf).length} pdf-files.`)

  let refCount =0;
  let altCount =0;
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
      } else {
        refCount ++; // this is a CALL: a pdf can be called multiple times.
        /*
            SECOND: give an alert if the file is not in the first folder
        */
        const fn = path.join(pdf_root, path.basename(link.fn + '.pdf'));
        if (!fs.existsSync(fn)) {
          altCount ++;
          console.log(`--${altCount}::${it.xid} pdf-file <${fn}> not found.`)
          rsync_missingCount++;
        }
      } // found in sindex
    }) // each pdf
  } // each xlsx line.

  console.log(`check-missing-pdf: missingCount:${missingCount} rsync-missing:${rsync_missingCount} sindex:${Object.keys(pdf).length}`)
  console.log(`check-missing-pdf: refCount:${refCount} pdf-files called from xlsx.`)

}


function check_missing_jpeg(json) {

  const jpeg_root = Array.from(jpeg_inputs)[0];
  _assert(jpeg_root, jpeg_inputs, "Missing jpeg-root")
  const jpeg_index = jpeg_sindex; //jsonfile.readFileSync('scanp3-jpeg/index.json').index;
  console.log(`jpeg_sindex contains ${Object.keys(jpeg_index).length} jpeg-files.`)

  let refCount =0;
  let altCount =0;
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
    } else {
      refCount ++; // this is a CALL: a pdf can be called multiple times.
      /*
          SECOND: give an alert if the file is not in the first folder
      */
      const fn = path.join(jpeg_root, path.basename(it.pic + '.jpg'));
      if (!fs.existsSync(fn)) {
        altCount ++;
        console.log(`--${altCount}::${it.xid} jpeg-file <${fn}> not found.`)
        rsync_missingCount++;
      }
    }
    /*
        SECOND: check if the file exists in RSYNC folder.
    */
    /*
    const fn = path.join(jpeg_folder, it.pic + '.jpg');
    if (!fs.existsSync(fn)) {
      console.log(`jpeg-file <${fn}> not found xid:${it.xid}`)
      rsync_missingCount++;
    }*/

  }

  console.log(`check-missing-jpeg: total:${Object.keys(jpeg_index).length} missingCount:${missingCount} rsync-missing:${rsync_missingCount}`)

}


// ##########################################################################

async function main() {
//  console.log(`main ctx:`,Object.keys(ctx))
//  var {db} = ctx;

  if (argv.phase <5) {
    println(`
    --------------------------------------------------------------------------
    file: upload3-(1.0)-xlsx-original.json
    file: upload3-(1.1)-reformatted.json
    Next stop is 'pulling all data from DB' => ./upload3.json -q3
    --------------------------------------------------------------------------
    `);
    return;
  }

  const vc = await pull_articles_all(package_id);
  console.log('dumping upload3-relink-pdf1.yaml ....')
  dump_array(articles_all,'upload3-relink-pdf1.yaml')

  if (argv.phase <6) {
    println(`
    ------------------------------------------------------
    ------------------------------------------------------
    `);
    return;
  }

  await commit_links_pdf_articles();


  println('--------------------------------------------------------------------------')
  console.log(`Everything completed. EXIT.`)
  println('--------------------------------------------------------------------------')


  console.log(`Exit main`)
}

// ============================================================================

function mk_search_index(inputs, patterns) {
  const hhd = {}; // directories where files found
  const index = {}; // for each baseName => list of {fn, fsize, mt}
  const _index = {};

  if (inputs.length<=0) return [];

  inputs.forEach(absolutePath=>{
    // validate folder exists.
    if (!fs.existsSync(absolutePath)) throw `fatal-@538 <${absolutePath}> not found.`
    if (!fs.statSync(absolutePath).isDirectory()) throw `fatal-@539 <${absolutePath}> not a directory.`
  });

  let nfiles =0;
  let total_size =0; // for all files visited (found)

  inputs.forEach(absolutePath=>{
  for (const fn of walkSync(absolutePath, patterns)) {
      // do something with it
      if (argv.phase ==2) {
        console.info(`${++nfiles} ${fn}`);
      }
      const stats = fs.statSync(fn)
      const base = path.basename(fn)
      const dirname = path.dirname(fn)
      total_size += stats.size;

      // frequence
      hhd[dirname] = hhd[dirname] || 0;
      hhd[dirname]++;

      const new_data = { // override existing
        fn,
        fsize: stats.size,
        mt: stats.mtime.toString()
      }

      if (_index[fn]) {
        _index[fn] = new_data; // override obsolete-one.
        // is already in index[base].files
      } else {
        _index[fn] = new_data; // override obsolete-one.
        index[base] = index[base] || {files:[]}
        index[base].files.push(new_data);
//        total_moved += stats.size;
      }
      /*
          check on fsize.
          Raise sflag if not all the files have same size.
          That will prevent any copy or move operation.
      */
      index[base].fsize = index[base].fsize || stats.size;
      if (index[base].fsize != stats.size) {
        index[base].sflag = true;
      }

      index[base].mt = index[base].mt || new_data.mt;
      if (index[base].mt != new_data.mt) {
        index[base].mtflag = true;
      }

      index[base].latest_revision = index[base].latest_revision || new_data.mt;
      if (index[base].latest_revision > new_data.mt) {
        index[base].latest_revision = new_data.mt;
      }
    }
  })
  return index;
} // mk_search_index

// ----------------------------------------------------------------------------

function *walkSync(dir,patterns) {
  const files = fs.readdirSync(dir, 'utf8');
//  console.log(`scanning-dir: <${dir}>`)
  for (const file of files) {
    try {
      const pathToFile = path.join(dir, file);
      if (file.startsWith('.')) continue; // should be an option to --exclude
        const fstat = fs.statSync(pathToFile);
      const isSymbolicLink = fs.statSync(pathToFile).isSymbolicLink();
      if (isSymbolicLink) continue;

      const isDirectory = fs.statSync(pathToFile).isDirectory();
      if (isDirectory) {
        if (file.startsWith('.')) continue;
          yield *walkSync(pathToFile, patterns);
      } else {
        if (file.startsWith('.')) continue;
        let failed = false;
        for (pat of patterns) { // AND
          const regex = new RegExp(pat,'gi');
          if (file.match(regex)) continue;
          failed = true;
          break;
        };
        if (!failed)
        yield pathToFile;
      }
    }
    catch(err) {
      console.log(`ALERT on file:${ path.join(dir, file)} err:`,err)
//      console.log(`ALERT err:`,err)
      continue;
    }
  }
} // walkSync (dir,pattern)

// ----------------------------------------------------------------------------
