const json2yaml = require('json2yaml');
const hash = require('object-hash');
//const app = require('../app-client.js'); // for lookup to access auteurs
import reactiveObject, { isSupported } from 'meteor-reactive-object'

import {publishers, app} from '../app-client.js';

const TP = Template['edit-publisher'];

/*

  We need a reactive variable only to get the artcle from the db,
  and then when available, update the UI

*/


TP.onCreated(function(){
  console.log(`onCreated titre:`,this.data.id());
  const tp = this;

  tp.revision = new ReactiveDict(); // this one is driving the UI.
  tp.revision_data = new ReactiveDict(); // this one is driving the UI.
  tp.original = new ReactiveVar();
  tp.edit_title_data = new ReactiveVar(null);

  const find_publisher_byName = async (name)=>{
    const p = await app.find_publisher_byName(name);
    return p;
  }

  tp.post_edit_title = function(o){
    const {name, title, retCode} = o;
    console.log(`post_edit_title : `,o)
    if (retCode == 'apply') {
      tp.revision.set('title',title);
      tp.revision.set('name',name);
      tp.revision_data.set('title',title);
      console.log(`tp.revision_data:`,tp.revision_data)
      return;
    }
    if (retCode == 'quit') {
      tp.edit_title_data.set(null)
      return;
    }
    console.log(`Invalid Return Code (${retCode})`);
  } // post_edit_title.

  const item_id = this.data.id();
  Meteor.call('publisher-infos',{
    item_id,
    checksum: "", // to be used if we have local copy
  },(err, retv)=>{
    if (err) {
      console.log('err:',err);
      return;
    }

console.log('retv:',retv);

    retv = reformat(retv);
    console.log('retv:',retv);

    tp.original.set(retv);

    Object.keys(retv).forEach(k=>{
      tp.revision.set(k,retv[k]);
    })
    Object.keys(retv.data).forEach(k=>{
      tp.revision_data.set(k,retv.data[k]);
    })

  })
}) // onCreated


TP.onRendered(function(){
  console.log(`onRendered titre:`,this.item_id);
  this.x = 'hello'
})

TP.helpers({
  revision(x) {
    const tp = Template.instance();
    /*
    const v = x.split('.');
    if (v.length ==2) {
      return tp.revision.get(v[0]) && tp.revision.get(v[0])[v[1]];
    }
    */
    return tp.revision.get(x)
  },
  revision_data(x) {
    const tp = Template.instance();
    return tp.revision_data.get(x)
  },
  original() {
    const tp = Template.instance();
    return tp.original.get();
  },
  find_publisher_byName() {
    const tp = Template.instance();
    return tp.find_publisher_byName
  },
  edit_title_data() {
    const tp = Template.instance();
    return tp.edit_title_data.get();
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
        flip-flop {{#if edit_title_data}}...{{/if}}
    */
    const x = tp.edit_title_data.get();
    if (x) {
      tp.edit_title_data.set(null);
    } else {
//      tp.edit_title_data.set(tp.revision.get());
      tp.edit_title_data.set({
        title: tp.original.get().title,
        name: tp.original.get().name,
        _post_edit_title: tp.post_edit_title
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
  'click .js-update-publisher': (e,tp)=>{
    const data = tp.revision_data.all();
    data.name = undefined;
    const revision = tp.revision.all();
    console.log('data:',data)
    revision.data = data;
    console.log('revison:',revision)

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

function reformat(retv) {
  if (retv.title != retv.data.title) console.log('ALERT title!=data.title fixed.');
  retv.title = retv.data.title;
  retv.title = retv.title || retv.name;
  retv.yml = json2yaml.stringify(retv);
  return retv;
}

// ============================================================================

FlowRouter.route('/edit-soc/:id', { name: 'edit-soc',
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
