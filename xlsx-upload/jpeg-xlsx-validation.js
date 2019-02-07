#!/usr/bin/env node

var XLSX = require('xlsx'); // npm install xlsx
var jsonfile = require('jsonfile');
var fs = require('fs-extra');
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
  .alias('o','dest-folder')
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

function println(x) {console.log(x);}

const force_new_revision = argv['force-new-revision'];
const verbose = argv.verbose;
const pg_monitor = argv['pg-monitor'] || yaml_env.pg_monitor;
const jpeg_folder = argv.jpeg_folder|| yaml_env.jpeg_folder || '/media/dkz/Seagate/18.11-Museum-rsync-inhelium/jpeg-www';
const pdf_folder = argv.pdf_folder || yaml_env.pdf_folder || '/media/dkz/Seagate/18.11-Museum-rsync-inhelium/pdf-www';
const pdf_search_inputs = yaml_env.pdf_inputs; // ARRAY.
//const jpeg_search_inputs = yaml_env.jpeg_inputs; // ARRAY.

var input_fn = argv._[0] || yaml_env.xlsx;
if (!input_fn) {
    console.log('Syntax: ./upload3-relink-pdf [options] <file-name.xlsx>');
    return;
}

if (!fs.existsSync(input_fn)) {
  console.log(`xlsx file <${input_fn}> does not exist.`);
  process.exit(-1);
} else {
  console.log(`found xlsx file <${input_fn}>`);
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
// console.log(sheet1)

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
console.log(`Writing report file "upload3-(1.0)-xlsx-original.json"`)

require('./reformat.js')(json);
jsonfile.writeFileSync('upload3-(1.1)-xlsx-reformatted.json',json,{spaces:2})
console.log(`Writing report file "upload3-(1.1)-xlsx-reformatted.json"`)
//check1()


const jpeg_inputs = new Set();
if (argv.jpeg_dir) jpeg_inputs.add(argv.pdf_dir)
yaml_env.jpeg_inputs && yaml_env.jpeg_inputs.forEach(i=>{jpeg_inputs.add(i)})
console.log(`jpeg-inputs:`,jpeg_inputs);
_assert(jpeg_inputs.size>0, jpeg_inputs,'Missing jpeg-inputs')


if (argv.phase <2) {
  console.log(`
    ---------------------------------------------
    PHASE 1 COMPLETE (xlsx is now in json format)
    * next is building pdf search-index.
    * a root folder must be given and/or pdf-inputs.
    To continue use option -q2
    ---------------------------------------------
    `);
  process.exit(0);
}


const jpeg_sindex = mk_search_index(jpeg_inputs, ['\.jpg$']);
jsonfile.writeFileSync('upload3-relink-jpeg-sindex.json',jpeg_sindex,{spaces:2})

if (argv.phase <3) {
  console.log(`
    ---------------------------------------------
    PHASE 2 COMPLETE :
    * seach indexes are ready.
    Next is finding pdf from xlsx in search-index.
    To continue use option -q3
    ---------------------------------------------
    `);
  process.exit(0);
}

check_missing_jpeg(json);


if (argv.phase <4) {
  console.log(`
    ---------------------------------------------
    PHASE 3 COMPLETE :
    * check report with missing jpeg-files.
    Next is copy jpeg into dest-folder <${argv['dest-folder']}>
    To continue use option -q4 and -o <dest-folder>
    ---------------------------------------------
    `);
  return;
}

_assert(argv['dest-folder'], argv, 'fatal-@198 Missing dest-folder')
const dest_folder = argv['dest-folder'].toString();

const batch = Object.keys(jpeg_sindex)
.filter(baseName => (jpeg_sindex[baseName].refCount >0))
.map(baseName => jpeg_sindex[baseName]);

for (ix in batch) {
  if (ix >= argv.limit) break;
  const pdf = batch[ix];
  _assert(pdf.files[0], pdf, 'fatal-@206')
  const fn = pdf.files[0].fn;
  const baseName = path.basename(fn);
  const ofn = path.join(dest_folder,baseName);
  if (argv.copy) {
    fs.copySync(fn, ofn, {overwrite:false, preserveTimestamps:true})
    console.log(`--${ix+1} copy <${fn}> <${ofn}>`)
  } else {
    console.log(`--${ix+1} no-copy <${fn}> <${ofn}>`)
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


function check_missing_jpeg(json) {

  const jpeg_root = Array.from(jpeg_inputs)[0];
  _assert(jpeg_root, jpeg_inputs, "Missing jpeg-root")
  const jpeg_index = jpeg_sindex; //jsonfile.readFileSync('scanp3-jpeg/index.json').index;
  console.log(`jpeg_sindex contains ${Object.keys(jpeg_index).length} jpeg-files.`)

  let refCount =0; // jpeg from jpeg_sindex with at least 1 hit.
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
    const baseName = it.pic + '.jpg';
    if (!jpeg_index[baseName]) {
      missingCount++;
      console.log(`--${missingCount} xid:${it.xid} <${baseName}> not found.`)
    } else {
      jpeg_index[baseName].refCount ++;
      refCount ++; // this is a CALL: a pdf can be called multiple times.
      /*
          SECOND: give an alert if the file is not in the first folder
      */
//      const fn = path.join(jpeg_root, path.basename(it.pic + '.jpg'));
      const fn = path.join(jpeg_root, baseName);
      if (!fs.existsSync(fn)) {
        altCount ++;
        console.log(`--${altCount} xid:${it.xid} <${fn}> not found in root-folder`)
        rsync_missingCount++;
      }
    }
  } // each line in xlsx.

  console.log(`check-missing-jpeg: total:${Object.keys(jpeg_index).length} missingCount:${missingCount} rsync-missing:${rsync_missingCount}`)

  const batch = Object.keys(jpeg_sindex)
  .filter(baseName => (jpeg_sindex[baseName].refCount >0))
  .map(baseName => jpeg_sindex[baseName]);

  console.log(`found ${batch.length} unique pdf-files.`)

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
      if ((argv.phase ==2)&&(argv.verbose)) {
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
        index[base] = index[base] || {
          files:[],   // all full names files
          refCount:0  // how many times used (later)
        }
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
