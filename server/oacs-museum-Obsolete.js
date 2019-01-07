const assert = require('assert');
const massive = require('massive');
const monitor = require('pg-monitor');
const hash = require('object-hash');

//import R from 'ramda';
//const nspell = require('./nspell.js')
//console.log(`nspell.vdico:`,nspell.vdico);

const conn = {
  host: 'localhost',
  port: 5432,
  database: 'museum-openacs',
  user: 'postgres',
  password: 'sandeep'
};

export var db ; //= massive(conn); // a promise
export var package_id;
export var auteurs_folder_id;
export var publishers_folder_id;
export var main_folder_id;


export async function get_connection() {
  db = await massive(conn);
  console.log(`db-search.js:init11`);
  monitor.attach(db.driverConfig);
  console.log(`db-search.js:init12`);

  const retv = await get_metadata(236393, {autofix:true});
  // console.log(retv)
  //{package_id, main_folder_id} = retv;

  package_id = retv.package_id;
  main_folder_id = retv.main_folder_id;

  publishers_folder_id = retv.publishers.folder_id;
  auteurs_folder_id = retv.authors.folder_id;

  if (!package_id
    || !main_folder_id
    || !auteurs_folder_id
    || !publishers_folder_id) {
    console.error(`get_metadata =>`,retv); throw 'fatal-234'
  }
  return db;
}


// ---------------------------------------------------------------------------

async function get_metadata(_package_id, option) {
  package_id = _package_id || 236393;

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


// ---------------------------------------------------------------------------



export async function cms_author__new(o) {
  assert (auteurs_folder_id)
  assert (package_id)

  assert(o.unique_name, `Missing o.unique_name`);    // cr_items.name unique

  assert(o.title, `Missing title`);          // cr_revisions.title


  // title is <last> (<first-middle>) <post-data>.
  // (package_id, o.name) UNIQUE : title after normalization.
  // Normalization => <last>-<first/middle>-<post-data>  with spaces replaced by dashes.

  const checksum = hash(o, {algorithm: 'md5', encoding: 'base64' }) // goes int cr_revision.

  if (!o.unique_name) {
    console.log(o)
    throw 'fatal-504 unique-name missing.'
  }

//    return db.query('select content_item__new($1) as data',
  return db.query('select cms_author__new($1)',
    [{
      parent_id: auteurs_folder_id,
      name: o.unique_name,
      package_id,
      text: null, //JSON.stringify(o),
      description: "author initial data",
      title: o.title, // goes int cr_revision.
      jsonb_data: o,
      checksum
    }],
    {single:true});
} // cms_author__new(o)

// ============================================================================

/*

    Minimum:
    - item_id
    - data

    Optional:
    - title defaults to name
    - description
    - is_live

*/


function cms_article__new_revision(o) {
  if (!o.item_id) {
    console.log('cms_article__new_revision o:',o)
    throw 'fatal-798'
  }
  assert (o.data)
//  assert (title)  defaults to name
//  assert (o.name == o.data.name) // o.name CAN'T BE CHANGED.

  const new_checksum = hash(o.data, {algorithm: 'md5', encoding: 'base64' }) // goes int cr_revision.
  if (o.checksum == new_checksum) {
    //console.log('latest revision up-to-date. Nothing to do.')
    console.log(`article revision (latest) is up-to-date. Nothing to do. <${o.name}>`)
    return {
      retCode: 'Ok',
      msg: 'this article is up-to-date.',
      item_id: o.item_id,
      revision_id: o.revision_id
    };
  }

  console.log(`data.checksum:${o.checksum} == new_checksum:${new_checksum}`);

//    console.log(`article__new_revision o:`,data);

  return db.query('select cms_article__new_revision($1)',
    [{
      item_id: o.item_id,
      description:"article revision",
      text: null, // JSON.stringify(o),
      is_live:true,
      title: o.title || o.name,
      data: o.data,
      checksum: new_checksum
    }]
    ,{single:true})
  .then(retv =>{
    return retv.cms_article__new_revision
  })
  .catch(err=>{
    console.log(err)
    return {
      err:err
    }
  });

}


// ============================================================================


export function cms_publisher__new(data) {
  assert (publishers_folder_id)
  assert (package_id)
  assert (data.name, `fatal-234 Missing Name`);          // cr_revisions.title

  data.title = data.title || data.name;

  if (!data.name) {
    console.log(data)
    throw 'fatal-242 unique-name missing.'
  }

  const checksum = hash(data, {algorithm: 'md5', encoding: 'base64' }) // goes int cr_revision.


//    return db.query('select content_item__new($1) as data',
  return db.query('select cms_publisher__new($1)',
    [{
      parent_id: publishers_folder_id,
      name: data.name,
      package_id,
      text: null, //JSON.stringify(o),
      description: "publisher initial data",
      title: data.title, // goes int cr_revision.
      jsonb_data: data,
      checksum
    }],
    {single:true});
} // cms_publisher__new(o)


export function cms_publisher__new_revision(o) {
  assert (publishers_folder_id)
  assert (package_id)
  assert (o.item_id, `fatal-234 Missing item_id`);          // cr_revisions.title

  if (o.data.name) o.data.name = undefined;
  if (o.title != o.data.title) {
    o.title = o.data.title;
  }

  const checksum = hash(o.data, {algorithm: 'md5', encoding: 'base64' }) // goes int cr_revision.

//    return db.query('select content_item__new($1) as data',
  return db.query('select cms_publisher__new($1)',
    [{
      parent_id: publishers_folder_id,
      name: data.name,
      package_id,
      text: null, //JSON.stringify(o),
      description: "publisher initial data",
      title: data.title, // goes int cr_revision.
      jsonb_data: data,
      checksum
    }],
    {single:true});
} // cms_publisher__new(o)




// ============================================================================

/*
export function cms_update_title(cmd) {
  assert(cmd.item_id, 'fatal-266')
  return db.query('select cms_update_title($1)',[cmd], {single:true});
}
*/

// ============================================================================

export function db_conn() {
  return {
    db, package_id,
    auteurs_folder_id,
    publishers_folder_id
  }
}

export const utils = {
  package_id,
  auteurs_folder_id,
  publishers_folder_id,
  main_folder_id,
  cms_author__new,
  cms_article__new_revision,
  cms_publisher__new,
//  cms_update_title,
}
