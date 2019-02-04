const assert = require('assert')
const hash = require('object-hash');

//import {get_connection, utils, db_conn} from './oacs-museum.js';
////import cms from '../xlsx-upload/cms-openacs.js'
//import dkz from '../imports/dkz-lib.js'
import {db, package_id, _assert} from '../cms-server.js'

Meteor.methods({
  'catalogs-directory': (cmd) =>{
    _assert(db,db,'fatal-11.')
    _assert(package_id,package_id,'fatal-12.')
    const etime = new Date().getTime();
//    const query1 = `select * from cms_articles__directory;`
    const query2 = `
    select
      item_id,
      --name,
      title,       -- index ready
      --data->>'h1' as h1, -- legalName
      data->'h2' as h2,  -- products array NOT text
      data->>'yp' as yp,
      data->'indexNames' as indexNames,
      latest_revision
    from cms_articles__directory
    where (package_id = $1)
    and ((data->>'sec')::integer != 3)
    `;
    return db.query(query2, [package_id])
    .then(data =>{
      console.log(`Method catalogs-directory data.length:`,data.length)
      return data;
    })
    .catch(err =>{
      console.log(`cms-articles-directory err:`,err)
      throw err;
//      console.log(`cms-articles-directory err:`,err)
//      cmd.error = err.message;
//      return cmd;
    })
  }, // titles-directory
});
