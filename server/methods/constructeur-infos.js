const assert = require('assert')
const hash = require('object-hash');
import {db, package_id, _assert} from '../cms-server.js'


Meteor.methods({
  'constructeur-infos': (o) =>{
    const etime = new Date().getTime();
    const audit = [];
    assert(o.item_id)
    const query1 = `
      select *
      from cms_publishers__directory
      where item_id = $(item_id);
    `;
    const query2 = `
      select *
      from mapp.pull_constructeur($1)
    `;

    return db.query(query2, [{item_id:o.item_id}], {single:true})
    .then(data =>{
//      _assert(data.length == 1, data, 'fatal-23. Incorrect length')
      _assert(data.pull_constructeur, data, 'fatal-24. corrupted')
      return data.pull_constructeur;
    })
    .catch(err=>{
      console.log(`fatal-error in soc-infos:`,err)
      o.error = err;
      return o;
    })
  }
})
