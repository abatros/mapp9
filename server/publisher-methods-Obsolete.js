const assert = require('assert')
const hash = require('object-hash');

//import {get_connection, utils, db_conn} from './oacs-museum.js';

//import {utils, db_conn} from './oacs-museum.js'

//import dkz from '/imports/dkz-lib.js';


process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'postgres';
process.env.DB_PASS = 'sandeep';

import cms from '../xlsx-upload/cms-openacs.js'

var db;
var package_id;

cms.open_cms({
  app_instance: 'cms-236393',
  autofix:true
})
.then(async ctx =>{
  //console.log(Object.keys(retv))
  db = ctx.db;
  package_id = ctx.package_id;
  console.log('publishers-methods db:',Object.keys(db))
  assert(db)
//  await main(ctx);
  cms.close_cms();
})
.catch(err=>{
  cms.close_cms();
  console.log('fatal err:',err)
  throw `fatal-247 err =>"${err.message}"`
})


/*
var db;
Meteor.startup(() => {
  db = db_conn().db;
  console.log('publisher-methods db:',Object.keys(db).length)
});
*/

Meteor.methods({
  'soc-directory': (query) =>{
    try {
      const etime = new Date().getTime();
      const audit = [];
      return db.query("select * from cms_publishers__directory;",[])
      .then(data =>{
        return data;
      })
    }
    catch(e) {
      console.log(e)
    }
  }, // publishers-directory
  'soc-infos': (o) =>{
    const etime = new Date().getTime();
    const audit = [];
    assert(o.item_id)
    return db.query("select * from cms_publishers__latest where item_id = $(item_id);",o)
    .then(data =>{
      assert(data.length == 1)
      return data[0];
    })
    .catch(err=>{
      console.log(`fatal-error in soc-infos:`,err)
      o.error = err;
      return o;
    })
  }, // title-infos

  'insert-new-publisher': (o) =>{
    return utils.cms_publisher__new(o)
    .then (retv =>{
      return retv.cms_publisher__new;
    })
    .catch(err =>{
      o.err=err;
      return o;
    })
  },

  'publisher-infos': (cmd) =>{
    const etime = new Date().getTime();

      // MOVE THHIS into oacs-museum

    if (cmd.item_id) {
      return db.query("select * from cms_publishers__latest as publisher where item_id = $(item_id);",cmd,{single:true})
      .then(publisher =>{
        publisher._etime = new Date().getTime() - etime;
        return publisher;
      })
      .catch(err=>{
        console.log(`fatal-error in publisher-infos:`,err)
        o.error = err;
        return o;
      });
      return;
    }

    if (cmd.name) { // INCORRECT, we need also the package_id
      return db.query("select * from cms_publishers__latest as publisher where name = $(name);",cmd,{single:true})
      .then(publisher =>{
        if (!publisher) {
          return {
            cmd,
            error: 'NOT-FOUND',
            _etime: new Date().getTime() - etime
          }
        }
        publisher._etime = new Date().getTime() - etime;
        return publisher;
      })
      .catch(err=>{
        console.log(`fatal-error in publisher-infos:`,err)
        o.error = err;
        return o;
      });
      return;
    }

    console.log('publisher-infos cmd:',cmd);
    throw 'fatal-240 Invalid Command.'
  }, // publisher-infos

  // --------------------------------------------------------------------------

  'publisher::new-revision': (o) =>{

    o = dkz.undefine(o, 'revision_id');

    const missing = dkz.check_missing(o,'item_id title');
    if (missing) {
      console.log(`publisher::new-revision o:`,o);
      throw (`fatal-104 Missing parameters : `,missing);
    }

    const p1 = db.query("select cms_publisher__new_revision($1)",[o])
    console.log(`update-titre p1:`,p1);
    return p1.then(retv=>{
      return ({
        new_revision_id: retv[0].cms_publisher__new_revision,
        retCode: 'ok'
      })
    })
  }

  // --------------------------------------------------------------------------
})
