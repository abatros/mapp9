#!/usr/bin/env node

const find = require('find'); // directory and sub directories.
const path = require('path');
const jsonfile = require('jsonfile');
const yaml = require('js-yaml');
const fs = require('fs-extra');
const json2yaml = require('json2yaml');
const assert = require('assert')
const hasha = require('hasha');

const argv = require('yargs')
  .alias('v','verbose')
  .count('verbose')
  .alias('r','patterns').array('patterns')
  .alias('o','output') // file
  .options({
    'score_min': {default:80, demand:true},
    'xi_min': {default:1, demand:true},
    'h2': {default:false},
    'force-new-revision': {default:false},
    'copy': {default:false},
    'move': {default:false}
  })
  .argv;

const verbose = argv.verbose || 0;
//const patterns = argv.patterns || [];

console.log(`dirname:${__dirname}`);
console.log(`cwd:${process.cwd()}`);

const yaml_env_file = path.join(process.cwd(),'scanp3-config.yaml'); //argv['yaml-env'] || './.env.yaml';
const yaml_env = yaml.safeLoad(fs.readFileSync(yaml_env_file, 'utf8'));
console.log(yaml_env);
//console.log(`regex:${yaml_env.regex}`);
//console.log(`inputs:${yaml_env.inputs}`);

//const regex = yaml_env.regex;
const inputs = yaml_env.inputs
const patterns = yaml_env.patterns;

console.log(`
  scanp3.js
  Scan folders to locate file matching a pattern and move them to a new folder.
  Inputs: <${inputs.join(':')}>
  Pattern: <${patterns.join(' | ')}>
  `)



_assert(inputs && (inputs.length>0), yaml_env, 'Missing directory to scan.')

const hhd = {}; // stats on folders
const index = {};
//const index = jsonfile.readFileSync('scanp-pdf.json');

const _index = {}; // to check if already exists in the system.
for (const fn in _index) {
  _index[fn].files.forEach(file =>{
    _index[file.fn] = file;
  })
}

async function get_hash(fn) {
  return hasha.fromFile(fn, {algorithm: 'md5'});
}

function *walkSync(dir) {
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
          yield *walkSync(pathToFile);
      } else {
        if (file.startsWith('.')) continue;
        let failed = false;
        for (pat of patterns) {
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
      console.log(`ALERT err on file:${ path.join(dir, file)}`)
//      console.log(`ALERT err:`,err)
      continue;
    }
  }
}

//const absolutePath = path.resolve(__dirname, root);

let nfiles =0;
let total_size =0;
let total_moved =0;


inputs.forEach(absolutePath=>{
for (const fn of walkSync(absolutePath)) {
    // do something with it
    console.info(`${++nfiles} ${fn}`);
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
      total_moved += stats.size;
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


console.log(`${nfiles} files total-size:${format_size(total_size)} moved:${format_size(total_moved)}`);

// show frequences
const directories = Object.entries(hhd).sort((a,b)=>(b[1]-a[1])).map(([key,value])=>({size:value, fn:key}));


jsonfile.writeFileSync('index.json',{directories,index},{spaces:2})
fs.writeFileSync('index.yaml',
 json2yaml.stringify({directories,index}), //new Uint8Array(Buffer.from(yml)),
 'utf8');


/*

      check if file in prefered folder is the most recent.

*/

const output = directories[0].fn;

const alerts = [];
for (base in index) {
  const ii = index[base]
  if (ii.sflag) {
    ii.alerts = ii.alerts || [];
    alerts.push(ii)
    /*
        DO THE CHECK.
        find the newest file and see if in directory[0]
        => if a file is in dir[0] and has not @latest_revision => ALERT
    */
    for (ix in ii.files) {
      const file = ii.files[ix];
      const dirname = path.dirname(file.fn)
      if ((dirname == output)
      && (file.mt != ii.latest_revision)) {
        ii.alerts.push(`file in prefered folder <${output}> is not at the latest-revision <${file.mt}>`)
//        ii.prevent_copy = true;
        break;
      }
    }
  }
}


fs.writeFileSync('alerts.yaml',
 json2yaml.stringify(alerts), //new Uint8Array(Buffer.from(yml)),
 'utf8');



/*
    When a prevent_copy is detected,
    we need to do a deep lookup:
    for each file in a particular index, find one with latest_revision (most-recent)
    Always exists 1 at least.
    The -force option is required, since it will overwrite an existing file in the output folder.
*/

if (!argv.copy && !argv.move) {
  console.log('No copy/more requested. EXIT Ok.');
  return;
}

if (argv.copy || argv.move) {


  let nCopy =0;
  let conflicts =0;
  for (base in index) {

    /*
    if (index[base].prevent_copy) {
      console.log(`ALERT "file already exists in main folder" - file:<${base}> - Use option (--copy --force) to overwrite.`)
      conflicts ++;
      continue;
    };*/
    /*

        check index[basename].files[0]
        if not in first directory => NO-ALERT

    */

    const dirname = path.dirname(index[base].files[0].fn)
    if (dirname == output) {
      if (!argv.force) {
        console.log(`ALERT overwriting in main-directory file:<${base}> not allowed.`)
        continue;
      }
    }

    /*

        LOOP until most-recent is found (timeStamp)
    */
    const ii = index[base];
    for (ix in ii.files) {
      const file = ii.files[ix];
      if (file.mt == ii.latest_revision) {
        const dest_file = path.join(output,base);
        console.log(`from: <${index[base].files[0].fn}>`)
        console.log(`  to: <${dest_file}>`)

        try {
          fs.copySync(index[base].files[0].fn, dest_file, {
            preserveTimestamps: true,
            overwrite: false,
            errorOnExist: true
          });
          console.log('success!')
          nCopy++;
        } catch (err) {
          console.error(err)
          throw 'fatal-243'
        }
        break;
      } // if-most-recent
    } // each-file
  } // each index-entry.

  // here first file is not in the output-directory.

  console.log(`${nCopy} copy/move to output <${output}>`)
  console.log(`${conflicts} files in conflict -mode`)
} // if-copy-move requested.


function format_size(total_size) {
  const total = (total_size<1000)? total_size
    : (total_size<1000000)? `${total_size/1000} Kb`
    : (total_size<1000000000)? `${total_size/1000000} Mb`
    : `${total_size/1000000000} Gb`;
  return total;
}

function _assert(b, o, err_message) {
  if (!b) {
    console.log(`[${err_message}]_ASSERT=>`,o);
    console.trace(`[${err_message}]_ASSERT`);
    throw {
      message: err_message // {message} to be compatible with other exceptions.
    }
  }
}
