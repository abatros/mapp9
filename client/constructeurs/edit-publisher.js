const json2yaml = require('json2yaml');
const hash = require('object-hash');
//const app = require('../app-client.js'); // for lookup to access auteurs
import reactiveObject, { isSupported } from 'meteor-reactive-object'

import {publishers, app, _assert} from '../app-client.js';

const TP = Template['edit-publisher'];

/*

  We need a reactive variable only to get the artcle from the db,
  and then when available, update the UI

*/


TP.onCreated(function(){
  console.log(`onCreated titre:`,this.data.id());
  const tp = this;

//  tp.revision = new ReactiveDict(); // this one is driving the UI.
  tp.revision_data = new ReactiveDict(); // this one is driving the UI.
  tp.original = new ReactiveVar();
  tp.popup_data = new ReactiveVar(null);
  tp.data.yaml = new ReactiveVar();

  // ----------------------------------------------------------------------
  const find_publisher_byName = async (name)=>{
    const p = await app.find_publisher_byName(name);
    return p;
  }

  tp.popup_exit = function(o){
    const {name, title, retCode} = o;
    console.log(`popup_exit (callback) : `,o)
    const original = tp.original.get();
    console.log(`Original:`, original);

    if (retCode == 'js-apply') {
      tp.revision_data.set('title',title);
      tp.revision_data.set('name',name);
      console.log(`tp.revision_data:`,tp.revision_data)
      console.log(`tp.original:`,tp.original.get())
      return;
    }
    if (retCode == 'js-quit') {
      tp.popup_data.set(null)
      return;
    }
    console.log(`Invalid Return Code (${retCode})`);
  } // post_edit_title.
  // ----------------------------------------------------------------------

  const item_id = this.data.id();
  Meteor.call('constructeur-infos',{
    item_id,
    checksum: "", // to be used if we have local copy
  },(err, retv)=>{
    if (err) throw err;
    const constructeur = retv.constructeur;
    const catalogs = retv.articles;
    prep_fix(constructeur)
    tp.data.yaml.set(json2yaml.stringify(constructeur));
//    constructeur.yml = json2yaml.stringify(constructeur);

    console.log('constructeur-infos => :',retv);
    tp.original.set(constructeur);

    /*
        NEED CLONING.
    */
    const revision_data = JSON.parse(JSON.stringify(constructeur.data))
    Object.keys(revision_data).forEach(p=>{
      tp.revision_data.set(p,revision_data[p]);
    })
  })
}) // onCreated

function prep_fix(co) {
  _assert(co, co, 'fatal-216')
  _assert(co.name, co, 'fatal-219')
  _assert(co.title, co, 'fatal-220')
  co.fa_ = [];
  co.data && co.data.addresses && co.data.addresses.forEach(a=>{
    const [sa,ci,country] = a.split('<>');
    co.fa_.push(`${sa?sa:''}${ci?' - '+ci:''}${country?' - '+country:''}`)
  })
  co.data.indexNames = co.data.indexNames || co.data.aka;
}

/*
function reformat(retv) {
  retv.data =  retv.data || {};
  Object.assign(retv.data,{name: retv.name, title: retv.title});
  retv.yml = json2yaml.stringify(retv);
  return retv;
}
*/

TP.onRendered(function(){
  console.log(`onRendered titre:`,this.item_id);
  this.x = 'hello'
})

TP.helpers({
  indexNames() {
    const indexNames = Template.instance().revision_data.get('indexNames');
    return indexNames && Array.isArray(indexNames) && indexNames.join('\n');
  },
  /*
  revision(x) {
    const tp = Template.instance();
    return tp.revision.get(x)
  }, */
  revision_data(x) {
    const tp = Template.instance();
    return tp.revision_data.get(x)
  },
  /*
  original() {
    const tp = Template.instance();
    return tp.original.get();
  },*/
  find_publisher_byName() {
    const tp = Template.instance();
    return tp.find_publisher_byName
  },
  popup_data() {
    const tp = Template.instance();
    return tp.popup_data.get();
  },
})



// ===========================================================================
TP.events({
  'focusout #french-txt': (e,tp) =>{
    console.log('focusout e.target:',e.target);
    console.log('focusout e.target.value:',e.target.value);
    tp.new_data.fr = e.target.value;
    console.log(`tp.new_data:`,tp.new_data)
    console.log(`tp.revision.get().data:`,tp.revision.get().data)
  },
  'focusout .js-data': (e,tp) =>{
    console.log('focusout e.target:',e.target);
    console.log(`focusout e.target name:(${e.target.name})=>value:(${e.target.value})`);

    tp.new_data[e.target.name] = e.target.value; // not reactive.
//    console.log(`tp.new_data:`,tp.new_data)
//    console.log(`tp.original.get().data:`,tp.original.get().data)
  }
})

// ===========================================================================

/*
        Modification in title.

        1. change title in localStore
        2. compute a new key.
        3. validate the new key-name.
        4. do not change the key-name
        5. when update requested, pas the key-name along w/new data.
          It will update also the key-name
        Note: key-name not in data.
*/

TP.events({
  'click .js-edit-title': (e,tp)=>{
    /*
        flip-flop {{#if popup_data}}...{{/if}}
    */
    const x = tp.popup_data.get();
    if (x) {
      tp.popup_data.set(null);
    } else {
//      tp.popup_data.set(tp.revision.get());
      tp.popup_data.set({
        title: tp.revision_data.get('title'),
        name: tp.revision_data.get('name'),
        on_exit: tp.popup_exit
      });
    }
  } // js-edit-title
});

// ===========================================================================


String.prototype.hashCode = function() {
  var hash = 0, i, chr;
  if (this.length === 0) return hash;
  for (i = 0; i < this.length; i++) {
    chr   = this.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};


function deep_cloneObject(obj) {
    var clone = {};
    for(var i in obj) {
        if(obj[i] != null &&  typeof(obj[i])=="object")
            clone[i] = deep_cloneObject(obj[i]);
        else
            clone[i] = obj[i];
    }
    return clone;
}

TP.events({
  'focusout textarea[name=indexNames]': (e,tp)=>{
    const indexNames = tp.find('textarea[name=indexNames]').value
    console.log(`focusout =>`,indexNames)
    tp.revision_data.set('indexNames',indexNames.split('\n').map(na=>(na.trim())).filter(na=>(na.length>0)))
  }
})

TP.events({
  'click .js-commit-update': (e,tp)=>{
    const original = tp.original.get();
    const revision_data = tp.revision_data.all();
    revision_data.xxxxxxxxxxxxxxxxx=undefined;
    console.log('js-update-publisher revision_data:', revision_data)

    /*
        check if something has changed.
        tp.data contains the original.
    */

    const revision_checksum = hash(revision_data, {algorithm: 'md5', encoding: 'base64' });

    if (revision_checksum == original.checksum) {
      console.log(`No need for Update : same checksum revision.checksum:`,revision_checksum)
      console.log(`original:`,original);
      console.log(`revision_data:`,revision_data);
      return;
    }

    /*
        ATTENTION === From here the original is lost. ===
    */
    const revision = Object.assign(original, {
      jsonb_data: revision_data,
      title: revision_data.title,
      name: revision_data.name,
      checksum: revision_checksum
    })

    console.log(`Revision:`,revision);


    const p1 = app.publisher__new_revision(revision);
    p1.then(retv=>{
        console.log('update-publisher success =>',retv)
    })
    .catch(err=>{
        console.log('update-publisher error =>',err)
    })
  },
})

// ============================================================================


// ============================================================================

FlowRouter.route('/edit-constructeur/:id', { name: 'edit-constructeur',
    action: function(params, queryParams){
        console.log('Router::action for: ', FlowRouter.getRouteName());
        console.log(' --- params:',params);
        console.log(' --- query:',queryParams);
        if (queryParams.a == 'jj') {
//          Session.set('username','jj');
        }
/*
        document.titre = "Museum v9";
        app.article_id.set(params.id);
        app.show_article(params.id);
*/
        BlazeLayout.render('edit-publisher', {id:params.id});
        // render template will get article from DB.
    }
});
