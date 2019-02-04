const assert = require('assert')
const hash = require('object-hash');

//import {get_connection, utils, db_conn} from './oacs-museum.js';
//import cms from '../xlsx-upload/cms-openacs.js'
import {db, package_id} from './cms-server.js'
import dkz from '../imports/dkz-lib.js'
console.log('/server/lib/methods.js executed.')


Meteor.methods({
  'titre-infos': (cmd) =>{
    const etime = new Date().getTime();
    const audit = [];
    assert(cmd.item_id)
    return db.query(`
      select a.*, p.title as publisher_title
      from cms_articles__directory a
      join cms_publishers__directory p on (p.item_id = a.parent_id)
      where a.item_id = $(item_id);
    `,cmd)
    .then(data =>{
      assert(data.length == 1)
      return data[0];
    })
    .catch(err=>{
      console.log(`fatal-error in title-infos:`,err)
      cmd.error = err.message;
      return cmd;
    })
  }, // titre-infos
  'auteur-infos': (cmd) =>{
    const etime = new Date().getTime();
    const audit = [];
    assert(cmd.item_id)
    return db.query("select * from cms_auteurs__latest where item_id = $(item_id);",cmd)
    .then(data =>{
      assert(data.length == 1)
      return data[0];
    })
    .catch(err=>{
      console.log(`fatal-error in auteur-infos:`,err)
      cmd.error = err.message;
      return cmd;
    })
  }, // title-infos
  'cms-new-auteur': (o) =>{

    assert (auteurs_folder_id, `Missing auteurs_folder_id`)
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
        package_id: package_id,
        text: null, //JSON.stringify(o),
        description: "author initial data",
        title: o.title, // goes int cr_revision.
        jsonb_data: o,
        checksum
      }],
      {single:true})
    .then(retv=>{
        console.log(`new-auteur resolving:`,retv.cms_author__new)
        return retv.cms_author__new;
    })
    .catch(err =>{
        console.log(`new-auteur Error:`,err);
        console.log(`from catch...`)
        o.err = `can't store new-auteur.`
        return o;
    })
  },
  'new-titre': (o) =>{
    const {db, package_id, titres_folder_id} = db_conn();

    assert (titres_folder_id, `Missing titre_folder_id`)
    assert (package_id)
    assert(o.name, `Missing name`);    // cr_items.name unique
    o.title = o.title || o.name;
    assert(o.title, `Missing title`);          // cr_revisions.title

    // title is <last> (<first-middle>) <post-data>.
    // (package_id, o.name) UNIQUE : title after normalization.
    // Normalization => <last>-<first/middle>-<post-data>  with spaces replaced by dashes.

    const checksum = hash(o, {algorithm: 'md5', encoding: 'base64' }) // goes int cr_revision.

    if (!o.name) {
      console.log(o)
      throw 'fatal-165 unique-name missing.'
    }

  //    return db.query('select content_item__new($1) as data',
    return db.query('select cms_article__new($1)',
      [{
        parent_id: titres_folder_id,
        name: o.name,
        package_id,
        text: null, //JSON.stringify(o),
        description: "titre initial data",
        title: o.title, // goes int cr_revision.
        jsonb_data: o,
        checksum
      }],
      {single:true})
    .then(retv=>{
        console.log(`new-titre resolving:`,retv.cms_article__new)
        return retv.cms_article__new;
    })
    .catch(err =>{
        console.log(`new-title Error:`,err);
        console.log(`from catch...`)
        o.err = `can't store new-title.`
        return o;
    })
  },

  /*
    Minimum: (item_id,data)
    Optional: (title, description, is_live)
  */
  'update-article': (o) =>{
    assert(o.name, `fatal-199 Missing name`);    // cr_items.name unique
    assert(o.data, `fatal-200 Missing data`)
    assert(o.item_id, `fatal-200 Missing item_id`)

    const p1 = utils.cms_article__new_revision(o)
    console.log(`update-titre p1:`,p1);
    return p1;
  },


  // -------------------------------------------------------------------------

  'update-title': (cmd) =>{
    assert(cmd.item_id, 'fatal-267 Missing item_id')
    if (!cmd.title && !cmd.name) {
      cmd._status = 'failed';
      cmd._message = 'We need at least one argument.'
      return cmd
    }

    console.log(`select cms_update_title cmd:`,cmd)

//    return utils.cms_update_title(cmd)
    return db.query('select cms_update_title($1)',[cmd], {single:true})
    .then (retv =>{
      return retv.cms_update_title;
    })
    .catch(err =>{
      o.err=err;
      return o;
    })
  },
});


// -------------------------------------------------------------------------

Meteor.methods({


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

//    o = dkz.undefine(o, 'revision_id');
    o = Object.assign(o, {
      revision_id: undefined
    });


    const missing = dkz.check_missing(o,'item_id title');
    if (missing) {
      console.log(`publisher::new-revision o:`,o);
      throw (`fatal-104 Missing parameters : `,missing);
    }

    const p1 = db.query("select cms_publisher__new_revision($1)",[o],{single:true})
    console.log(`update-titre p1:`,p1);
    return p1.then(retv=>{
      return retv.cms_publisher__new_revision;
    })
  },

  // --------------------------------------------------------------------------

  'index-marques': ()=>{
    assert(package_id)
    return db.query(`
      select * from mapp.index_marques($1::jsonb);
      `,[{package_id}],{single:false})
    .then(retv =>{
      // console.log('mapp.index_marques() =>retv.length',retv.length); throw {message:'stop-406.'};
//      console.log(`-- etime:${retv.etime} msec.`)
      return retv;
    })
    .catch(err=>{
      console.log(`index-marques err:`,err)
      return {
        error:err.message
      }
    })

  },


  // -------------------------------------------------------------------------

  'index-auteurs': (cmd)=>{
    return db.query(`
      select * from mapp.index_auteurs($1);
      `,[{package_id}],{single:false})
    .then(retv =>{
      return retv;
    })
    .catch(err=>{
      console.log(`index-auteurs err:`,err)
      return {
        error:err.message
      }
    })
  },

  // -------------------------------------------------------------------------


  // --------------------------------------------------------------------------

});

// ----------------------------------------------------------------------------

function _assert(b, o, err_message) {
  if (!b) {
    console.log(`######[${err_message}]_ASSERT=>`,o);
    console.trace(`######[${err_message}]_ASSERT`);
    throw {
      message: err_message // {message} to be compatible with other exceptions.
    }
  }
}

// ----------------------------------------------------------------------------
