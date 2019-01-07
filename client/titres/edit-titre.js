const json2yaml = require('json2yaml');
const hash = require('object-hash');
const app = require('../app-client.js'); // for lookup to access auteurs

const TP = Template['edit-titre'];

/*

  We need a reactive variable only to get the artcle from the db,
  and then when available, update the UI

*/

TP.onCreated(function(){
  console.log(`onCreated titre:`,this.data.id());
  const ti = this;
//  ti.article = new ReactiveVar();
  ti.original = new ReactiveVar();
  ti.item_id = this.data.id();
  ti.new_data = {}; // gets the updates only.

  Meteor.call('titre-infos',{
    item_id:ti.item_id,
    checksum: "", // to be used if we have local copy
  },(err, article)=>{
    console.log('err:',err);
    console.log('article:',article);
    prep(article);
    ti.original.set(article);
  })
}) // onCreated


TP.onRendered(function(){
  console.log(`onRendered titre:`,this.item_id);
  this.x = 'hello'
})

TP.helpers({
  article() {
    const tp = Template.instance();
//    return tp.article.get();
    return tp.original.get();
  }
})

// ===========================================================================
TP.events({
  'focusout #french-txt': (e,tp) =>{
    console.log('focusout e.target:',e.target);
    console.log('focusout e.target.value:',e.target.value);
    tp.new_data.fr = e.target.value;
    console.log(`tp.new_data:`,tp.new_data)
    console.log(`tp.original.get().data:`,tp.original.get().data)
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
  'click .js-save-article': (e,tp)=>{
    //console.log('.js-save-article');
    const cloned = deep_cloneObject(tp.original.get());
    const c1 = hash(cloned.data, {algorithm: 'md5', encoding: 'base64' })
    const new_data = Object.assign(cloned.data, tp.new_data);
    /*

          HERE, cloned has new_data !!!!

    */
    //console.log(`new_data:`,new_data)
    const c2 = hash(new_data, {algorithm: 'md5', encoding: 'base64' })
    //console.log(c1,c2);

    if (c1 == c2) {
      console.log('Unchanged Nothing to do.')
      return;
    }


    console.log('Need db-update article:',cloned)
    const p1 = app.update_article(cloned);
    p1.then(retv=>{
        console.log('update-article success =>',retv)
    })
    .catch(err=>{
        console.log('update-article error =>',err)
    })
  }
})

// ============================================================================

function prep(article) {
  if (article.data && article.data.links)
  article.data.links.forEach(it =>{
    it.label = it.fn
    .replace(/^[0-9]+[\s]?ca\s+/,'')
    .replace(/^[0-9]+\s+/,'')
    .replace(/\s+[0-9]+$/,'')
  })
//  article.raw_data = JSON.stringify(article)

  article.titre = article.titre || article.name;
  console.log('article:',article);
  article.yml = json2yaml.stringify(article);
}

// ============================================================================

FlowRouter.route('/edit-titre/:id', { name: 'edit-titre',
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
        BlazeLayout.render('edit-titre', {id:params.id});
        // render template will get article from DB.
    }
});
