import {db, package_id, _assert} from '../cms-server.js'


Meteor.methods({
  'constructeurs-directory': () =>{
    const etime = new Date().getTime();
    const audit = [];
    return db.query(`
      select
        item_id,
    --      name,
        title,
        data->'aka' as aka, -- temporary
        data->'indexNames' as indexNames,
        latest_revision
      from cms_publishers__directory
      where (package_id = $1);
    `,[package_id])
    .then(data =>{
      _assert(Array.isArray(data), data, 'fatal-21. Not an array.')
      return data;
    })
    .catch(err=>{
      console.log(err)
    })
  }, // publishers-directory
})
