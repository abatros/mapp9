#!/usr/bin/env node

/*
*/


if (true) {
  require('babel-register')({
     presets: [ 'es2015' ]
  });
}

//require('./object-new-prototypes.js')
const utils = require('./dkz-lib.js')

var XLSX = require('xlsx'); // npm install xlsx
var jsonfile = require('jsonfile');
var fs = require('fs');
const path = require('path');
const assert = require('assert')
//const unidecode = require('unidecode');
//const punycode = require('punycode');
//const fsx = require('fs-extra');
const json2yaml = require('json2yaml');
const Json2csvParser = require('json2csv').Parser;
const massive = require('massive');
const hash = require('object-hash');

// ----------------------------------------------------------------------------

//const uploadOne_article = require('./lib/uploadOne-article.js')
// ----------------------------------------------------------------------------

const argv = require('yargs')
  .alias('v','verbose')
  .count('verbose')
//  .alias('u','debug')
  .alias('u','upload')        // allow upload, default to false.
  .alias('j','jpeg_folder')   // check if jpeg exists in forder
  .alias('p','pdf_folder')    // check if pdf exists in forder
  .alias('h','headline')      // show headline
  .options({
    'score_min': {default:80, demand:true},
    'xi_min': {default:1, demand:true},
    'h2': {default:false}
  })
  .argv;



// ---------------------------------------------------------------------------------

var bi = 0;
const startTime = new Date();

//let jpeg_folder = argv.jpeg_folder|| './jpeg-1895';
const jpeg_folder = argv.jpeg_folder|| '/media/dkz/Seagate/18.11-Museum-rsync-inhelium/jpeg-www';
//var pdf_folder = argv.pdf_folder || './pdf-1946';
const pdf_folder = argv.pdf_folder || '/media/dkz/Seagate/18.11-Museum-rsync-inhelium/pdf-www';

// ----------------------------------------------------------------------------

var input_fn = argv._[0] || `./20181228-full.xlsx`;
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

const json = require('./xlsx-to-json.js')(input_fn);

/*
    Here, we have json Array with:
      - section : string
      - yp: string (year published)
      - xid: string (unique)
      - pic: string
      - co: string (normalized iso)
      - ci & sa : strings
      - h1 : soc name (1,2) or publication name (3)
      - h2[] : products, or keywords
      - isoc[] : index alternative names.
      - aka[] : other names (1,2) - auteur (3)
      - yf[] : founded (years) or other keywords
      - fr,en,zh: string
      - links[] : {fn,npages}
      - flags: string
      - comment: strings
      - origin: string (second comment).
      - auteurs: [] only (sec ==3)
*/

jsonfile.writeFileSync('upload-json-data1.json',json,{spaces:2})


const publishers = {}; // publishers : societe publishing the catalog.
const auteurs = {};

aggregate_soc_data();


function aggregate_soc_data() {
  Object.keys(publishers).forEach(h1=>{
    //console.log(h1,lines)
    const o = publishers[h1];
    o.data = {};
    o.lines.forEach(lineNo =>{
      if (json[lineNo].ci) {
        o.data.addresses = o.data.addresses || new Set();
        o.data.addresses.add(`${json[lineNo].sa||''}<>${json[lineNo].ci}<>${json[lineNo].co}`);
      }
      if (json[lineNo].h2) {
        o.data.products = o.data.products || new Set();
        json[lineNo].h2.forEach(it=>{o.data.products.add(it)});
      }
      if (json[lineNo].aka) { // aka and owner
        o.data.aka = o.data.aka || new Set();
        json[lineNo].aka.forEach(it=>{o.data.aka.add(it)});
      }
      if (json[lineNo].yf) { // year founded
        o.data.yf = o.data.yf || new Set();
        json[lineNo].yf.forEach(it=>{o.data.yf.add(it)}); // alert if more than 1.
        if(Object.keys(o.data.yf).length>1) {
          console.log('ALERT MULTIPLE YF:',o.data.yf);
        }
      }
    })
//      o.addresses && console.log(`soc:<${h1}>`,o.addresses)
//      o.products && console.log(`soc:<${h1}>`,o.products);
//    console.log(`soc:<${h1}>`,o.data);
  })

  /*
      PHASE 2 => replace sets by arrays.
  */
  Object.keys(publishers).forEach(h1=>{
    const o = publishers[h1];
    if (o.data.products)
      o.data.products = Array.from(o.data.products);
    if (o.data.addresses)
      o.data.addresses = Array.from(o.data.addresses);
    if (o.data.yf) {
      (Array.from(o.data.yf).length >1) && console.log('ALERT:',o.data.yf);
      o.data.yf = o.data.yf[0];
    }
  });
} // aggregate_soc_data.

/*

    FIRST RUN on json, to populate hp,ha.

*/


/*
    HERE, each publisher:
    - products,
    - addresses
    - yf
    - aka
*/

;(()=>{
  /*
      make reports on auteurs and titles.
  */

  const h2 = {};
  const t2 = {};

  const j2 = json.filter(it=>((it.sec==3) && (it.deleted==false))).map(it=>{
    it.auteurs.forEach(au=>{
      h2[au] = h2[au] || [];
      h2[au].push(it.xid);
    });


//    t2[it.titre] = t2[it.titre] || [];
//    t2[it.titre].push(it.xid);

    it.titres.forEach(ti=>{
      t2[ti] = t2[ti] || []
      t2[ti].push(it.xid);
    });

    return utils.Object_update({
      xid:null,
      auteurs:null,
      titre:null,
      titres:null,
      deleted:null
    },it)

/*
    return {
      xid:it.xid,
      auteurs:it.auteurs,
      titre:it.titre,
      titres:it.titres,
      deleted: it.deleted
    }
*/
  })

  jsonfile.writeFileSync('upload-xlsx-auteurs-sec3.json',j2,{spaces:2})

  let yml = json2yaml.stringify(j2);
  fs.writeFileSync('upload-xlsx-auteurs-sec3.yaml',
   yml, //new Uint8Array(Buffer.from(yml)),
   'utf8', (err) => {
    console.log('done')
    if (err) throw err;
    console.log('upload-xlsx-auteurs-sec3.YAML file has been saved!');
  });

  const v2 = Object.keys(h2).sort((a,b)=>(a.localeCompare(b)));
  let yml2 = json2yaml.stringify(v2.map(it=>(`${it} ::${h2[it].join(',')}`)));
  fs.writeFileSync('upload-xlsx-auteurs.yaml',
   yml2, //new Uint8Array(Buffer.from(yml)),
   'utf8', (err) => {
    console.log('done')
    if (err) throw err;
    console.log('upload-xlsx-auteurs.YAML file has been saved!');
  });

  const vt2 = Object.keys(t2).sort((a,b)=>(a.localeCompare(b)));
  let yml3 = json2yaml.stringify(vt2.map(it=>(`${it} ::${t2[it].join(',')}`)));
  fs.writeFileSync('upload-xlsx-titres.yaml',
   yml3, //new Uint8Array(Buffer.from(yml)),
   'utf8', (err) => {
    console.log('done')
    if (err) throw err;
    console.log('upload-xlsx-titres.YAML file has been saved!');
  });

})();

console.log("=============================================")
console.log("PHASE 1 COMPLETE (xlsx is now in json format)")
console.log("=============================================")
// ---------------------------------------------------------------------------

const {db_connect, app_metadata, db_close} = require('./openacs-museum.js');
//const {db, package_id, main_folder, auteurs_folder, publishers_folder} = app_metadata();

//db_connect()
app_metadata()
.then(ctx =>{
  //console.log(Object.keys(retv))
  main(ctx);
})
.catch(err=>{
  db_close();
  console.log('fatal err:',err)
  throw `fatal-247 err =>"${err.message}"`
})


var db;
async function main(ctx) {
  console.log(`main ctx:`,Object.keys(ctx))
//  var {db} = ctx;
  db = ctx.db;
  package_id = ctx.package_id;
  await load_publishers_directory();
  await load_authors_directory();
  if (true) {
    console.log('Recap:')
    console.log(' -- publishers_directory size:', Object.keys(publishers).length)
    console.log(' -- auteurs_directory size:', Object.keys(auteurs).length)
  }
  await require('./process-xlsx-articles.js').process_xlsx_articles(ctx,json);
  db_close();
}

// ============================================================================
/*
    MINIMUM
    select content_item__new('test-soc-tartempion',7171,7169);

*/

async function load_publishers_directory() {
  const retv = await db.query(`
    select *
    from cms_publishers__directory
    where package_id = $1`,[package_id]);

  console.log('load_publishers_directory pdir:',retv.length)
  retv.forEach((p,j)=>{
    if(publishers[p.name]) {
      console.log(`retv[${j}] publishers[${p.name}] already exists:`,p);
      throw 'fatal-648'
    }
    publishers[p.name] = p;
    publishers[p.name].new_titres = [];
  })
//    console.log(pdir);
}

async function load_authors_directory() {
  const retv = await db.query(`
    select *
    from cms_authors__directory
    where package_id = $1`,[package_id]);

  console.log('load_authors_directory adir:',retv.length)
  retv.forEach(p=>{
    assert(!auteurs[p.name]);
    auteurs[p.name] = p;
    auteurs[p.name].new_titres = [];
    const titles = new Set(auteurs[p.name].titles);
    auteurs[p.name].titles = titles;
  })
//    console.log(adir);
}



async function main_() {

  const retv = await get_metadata(236393, {autofix:true});
  // console.log(retv)
  const {package_id, main_folder_id} = retv;

  const p_folder_id = retv.publishers.folder_id;
  const a_folder_id = retv.authors.folder_id;

  if (!(package_id
    && main_folder_id
    && p_folder_id
    && a_folder_id)) {
    console.error(`get_metadata =>`,retv); throw 'fatal-234'
  }

  await load_publishers_directory();
  await load_authors_directory();

  /*
  json.forEach((it,lineNo)=>{
    // update index soc/auteurs. (for later)

    if (it.aka) {
      assert(Array.isArray(it.aka))
      it.aka.forEach(aka=>{
        auteurs[aka] = auteurs[aka] || {lines:[]};
        auteurs[aka].lines.push(+lineNo)
      })
    }


    if (it.sec == 3) {
    }
    else {
      publishers[it.h1] = publishers[it.h1] || {lines:[]};
      publishers[it.h1].lines.push(+lineNo);
    }
  });
  */

  /*
  that was to create from ha/hp.
  Since we load before, if not exists, we create on the fly in process_xlsx_articles.
//  await process_xlsx_authors(); // create ifnot exists.
//  await process_xlsx_publishers();
  */

  await process_xlsx_articles();
  jsonfile.writeFileSync('./upload-json-ha2.json',ha,{spaces:2})
  await update_authors(); // create ifnot exists.

  console.log('upload-data Done! - closing db.');
  db.pgp.end();

  async function get_metadata(package_id, option) {
    try {
      const query_metadata = `select * from cms_folders where package_id = $(package_id)`;
      let retv = await db.query(query_metadata,{package_id},{single:false})
      if (!retv) {
        console.log('Unable to get instance metadata - create the instance')
        throw 'fatal-unable to get metadata'
        retv = await db.query("select cms_instance__new($1)",[{name:'museum-test',verbose:1}],{single:true})
//    select cms_instance__new($1)",[{name:'museum-test', verbose:1}])
      }

      const o = {};
      retv.forEach(folder =>{
        o.package_id = o.package_id || folder.package_id;
        assert (o.package_id === folder.package_id); // !!
        if (folder.parent_id == -100) {
          o.main_folder_id = folder.folder_id;
        }
        o[folder.name] = folder;
      })

//      console.log(`o:`,o);
//      throw 'stop-279'


      if ((!o.publishers) && (option.autofix)) {
        console.log(`recreate the folder publishers`);
        console.log(`o:`,o);
        const retv = await db.query("select content_folder__new($1,$2,$3,$4,$5)",
          [
            'publishers',         // 1: name
            'Publishers ',                    // 2: label
            'CMS Publishers sub-folder',     // 3: description
          	o.main_folder_id,                  // 4: parent_id
          	package_id                       // 5: packag_id
          ])[0].content_folder__new;

        console.log(`retv:`,retv);

        o.publishers = {
          folder_id:retv
        }
      }


      if ((!o.authors) && (option.autofix)) {
        console.log(`recreate the folder authors`);
//        console.log(`o:`,o);
        const retv = await db.query("select content_folder__new($1,$2,$3,$4,$5)",
          [
            'authors',         // 1: name
            'Authors ',                    // 2: label
            'CMS Authors sub-folder',     // 3: description
          	o.main_folder_id,                  // 4: parent_id
          	package_id                       // 5: packag_id
          ]);
        console.log(`retv:`,retv);
        o.authors = {
          folder_id:retv[0].content_folder__new
        }
      }




      return o;
    } catch(err) {
      console.log(err)
      throw 'fatal-244'
    }
  } // get metadata(package_id)


  function process_xlsx_publishers() {
    return new Promise(async (resolve,reject)=>{
      const publishers = Object.entries(hp);
      // [h1,{lines,data}]
      console.log(`process_xlsx_publishers count:${publishers.length}`)

      for (const lineNo in publishers) {
        if (lineNo >16) break;
        const h1 = publishers[lineNo][0];
        const data = publishers[lineNo][1].data;
        data.publisher_name = h1;
        await uploadOne_publisher(data);
      }
      console.log('process_xlsx_publishers Done!');
  //    db.pgp.end();
      resolve();
    })
  }


  /*

        Here we have all publishers in DB.
        Next is to register all authors.
        Authors are found in column J (aka) - (root-name)
        and available in ha.
        Procedure like publishers.

  */

  jsonfile.writeFileSync('./upload-json-ha.json',ha,{spaces:2})


  function process_xlsx_authors() {
    return new Promise(async (resolve,reject)=>{
      const authors = Object.entries(ha);
      console.log(`process_xlsx_authors/owners count:${authors.length}`)
      for (const lineNo in authors) {
        //if (lineNo >10) break;
        if (authors[lineNo] && authors[lineNo].length>0 && authors[lineNo][0]) {
          await uploadOne_author({
            author_name: authors[lineNo][0]
          });
        }
      }
      console.log('process_xlsx_author Done!');
  //    db.pgp.end();
      resolve();
    })
  }



  // ============================================================================




  // ========================================================================



  // ========================================================================

  /*
      for each author,
      - collect articles and establish relation (many-to-many)

  */


  async function update_authors() {
    const va = Object.keys(ha);
    console.log(`update_authors (${va.length})...`)

    for (ai in va) {
      const author_name = va[ai]; // author_name
      const new_titres = Array.from(auteurs[author_name].new_titres)

      if (new_titres.length>0) {
        console.log(`new_titres:`,new_titres)
        console.log(`titles:`,auteurs[author_name].titles)
      }

      // IF NEW TITLE FOR THIS AUTHOR, WE MUST CREATE A NEW REVISION.
      // because we are about to create a new revision.

      for (it in new_titres) {
        const title = new_titres[it];
        assert(!auteurs[author_name].titles.has(title.title_article), 'fatal-523')
//        const object_id_one = title.revision_id;
//        const object_id_two = auteurs[author_name].latest_revision;

        const object_id_one = title.item_id;
        const object_id_two = auteurs[author_name].item_id;

        console.log(`title.revision_id:${object_id_one} - author revision_id:${object_id_two}`)
        await db.query("select acs_rel__new($1)",[{
          rel_type: 'title-author',
          object_id_one,
          object_id_two
        }])
      }
    }
  } // update_authors


} // main.
