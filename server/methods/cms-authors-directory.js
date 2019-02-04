import {db, package_id, _assert} from '../cms-server.js'

Meteor.methods({
  'cms-auteurs-directory': (cmd) =>{
    _assert(db, db, 'fatal-5. DB not initialized.')
    const etime = new Date().getTime();
    const audit = [];
    return db.query(`
      select *
      from cms_authors__directory
      where (package_id = $1)
      ;`,[package_id])
    .then(data =>{
      return data;
    })
    .catch(err =>{
      console.log(`cms-auteurs-directory err:`,err)
      cmd.error = err.message;
      return cmd;
    })
  }, // authors-directory
})
