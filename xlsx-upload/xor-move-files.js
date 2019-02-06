#!/usr/bin/env node

/*

    $ ./select.js <source> -r \.pdf --join <folder> [--delete]

*/

const find = require('find'); // directory and sub directories.
const path = require('path');
const fs = require('fs-extra')

const argv = require('yargs')
  .alias('v','verbose')
  .count('verbose')
  .alias('r','patterns').array('patterns')
  .alias('a','all')  // show all files.
  .options({
    'score_min': {default:80, demand:true},
    'xi_min': {default:1, demand:true},
    'h2': {default:false},
    'force-new-revision': {default:false},
    'delete': {default:false},
    'remove': {default:false},
    'copy': {default:false},
  })
  .argv;

const verbose = argv.verbose || 0;
const patterns = argv.patterns || [];
const argv_remove = argv.delete || argv.remove;

console.log(`dirname:${__dirname}`);
console.log(`cwd:${process.cwd()}`);

const src_folder =  argv._[0];
const join_folder = argv.join && path.resolve(argv.join.toString());
/*
    FIRST check if that path exists.
*/

if (!src_folder) {
  console.log(argv);
  console.log("missing source folder");
  console.log(`$ ./select.js <src-folder> -r \.pdf --join <join-folder> [--delete]`)
  throw 'stop-35.'
}

if (!join_folder) {
  console.log(argv);
  console.log("missing join folder");
  console.log(`$ ./select.js <src-folder> -r \.pdf --join <join-folder> [--delete]`)
  throw 'stop-47.'
}

if (!fs.existsSync(src_folder)) {
  throw 'stop-54.'
    // Do something
}

if (!fs.existsSync(join_folder)) {
  throw 'stop-59.'
    // Do something
}


console.log(`join-folder:<${join_folder}>`)
/*

    For each file in folder
      check if that file exists in reference-folder
*/

let nfiles =0;
let removeCount =0;
let movedCount =0;

if (argv.phase <2) {
  console.log(`
    -------------------------------------------------------
    * found src-folder and dst/join-folder - Ok.
    * next step is walkSync on src-folder.
    * and check if file already exists in dest/join-folder
    * to enable copy to dest-folder, use option --copy
    * to remove from source, use option --remove
    To continue, use option -p2
    -------------------------------------------------------
    `)
  process.exit(0);
}


for (const fn of walkSync(src_folder,patterns)) {
  ++nfiles;
  const baseName = path.basename(fn);
//  console.log(`${nfiles}-- ${fn}`);
  /*
      check if exists in join-folder (destination)
  */
  const join_fn = path.join(join_folder, baseName);
  if (!fs.existsSync(join_fn)) {
    if (argv.copy) {
      fs.copySync(fn, join_fn, {overwrite:false, preserveTimestamps:true})
      console.log(`-- moving into join/dest : ${join_fn}`)
    } else {
      console.log(`-- file-not-found : ${join_fn}`)
    }
    continue;
  }

  /*
      Here, the file exists in destination.
      either with same size or different size.
  */

  const src_stats = fs.statSync(fn)
  const join_stats = fs.statSync(join_fn); // destination

  if (src_stats.size == join_stats.size) {
    // count "delete"
    if (argv_remove) {
      fs.removeSync(fn);
      console.log(`-- removed ${fn}`)
      removeCount ++;
    } else {
      console.log(`-- found same-size [delete] "${fn}" mtime src:${src_stats.mtime}<> join:${join_stats.mtime}`)
    }
    continue;
  }


  if (argv.all) {
    const newer = (join_stats.mtime > src_stats.mtime)? 'NEWER':'OLDER'
    const bigger = (join_stats.size > src_stats.size)? 'BIGGER':'SMALLER'
    console.log(`-- ${baseName} date/size: ${src_stats.mtime}/${src_stats.size}  <===>  ${join_stats.mtime}/${join_stats.size} (${newer})${bigger}`)
  }



  if (fs.existsSync(join_fn)) {
    /*
        Compare fsize and mtime
    */

    /*
    if (src_stats.mtime > join_stats.mtime) {
      console.log(`-- found ${baseName} but newer than join:${src_stats.mtime}<>${join_stats.mtime}`)
    }
    if ((src_stats.size != join_stats.size)
    || (src_stats.mtime.toString() != join_stats.mtime.toString())) {
      console.log(`-- found ${baseName} but different size or mtime size:${src_stats.size}<>${join_stats.size}`)
      console.log(`-- found ${baseName} but different size or mtime size:${src_stats.mtime}<>${join_stats.mtime}`)
      continue;
    }

    console.log(`-- found delete candidate ${baseName} `)
  } else {
    console.log(`-- do-not remove : missing in <dest> ${baseName}`)
    if (action_move) {
//      fs.moveSync(fn, join_fn, {overwrite:false, preserveTimestamps:true})
      fs.copySync(fn, join_fn, {overwrite:false, preserveTimestamps:true})
    }*/
  }

}


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
      console.log(`ALERT on file:${ path.join(dir, file)} err:`,err)
//      console.log(`ALERT err:`,err)
      continue;
    }
  }
}
