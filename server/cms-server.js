import cms from '../xlsx-upload/cms-openacs.js'

export var db;
export var package_id;

Meteor.startup(() => {

//  db = cms.get_connection();
//  console.log('db:',Object.keys(db))
console.log(`Meteor.settings.public:`,Meteor.settings.public)
console.log(`Meteor.settings.private:`,Meteor.settings.private)

  /*
  process.env.DB_HOST = Meteor.settings.private.host;
//  process.env.DB_PORT || 5432,
  process.env.DB_USER = Meteor.settings.private.user;
  process.env.DB_PASS = Meteor.settings.private.password;



  cms.open_cms({
    package_id:236393,
    autofix:true,
    pg_monitor:true
  })
*/

  cms.open_cms(Meteor.settings.private)
  .then(ctx =>{
    db = ctx.db;
    package_id = ctx.package_id;
    if (!db) throw 'fatal-32. Unable to open database'
  })
  .catch(err=>{
    cms.close_cms();
    console.log('fatal err:',err)
    throw `Meteor.startup [cms-server.js] fatal-37. err =>"${err.message}"`
  })
});

// ---------------------------------------------------------------------------

export function _assert(b, o, err_message) {
  if (!b) {
    console.log(`######[${err_message}]_ASSERT=>`,o);
    console.trace(`######[${err_message}]_ASSERT`);
    throw {
      message: err_message // {message} to be compatible with other exceptions.
    }
  }
}



// ---------------------------------------------------------------------------

//module.exports = {
//  db, package_id, _assert
//}
