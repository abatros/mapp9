const assert = require('assert');
const app = require('../app-client.js'); // for lookup to access auteurs

const TP = Template['auteur-new'];


TP.onCreated(function(){
  // create the random names for each form's input.

  console.log(generateId())
  // "82defcf324571e70b0521d79cce2bf3fffccd69"

  console.log(generateId(20))
// "c1a050a4cd1556948d41"

  this.form = {
    first_key: generateId(20),
    last_key: generateId(20),
    postfix_key: generateId(20),
    index_key: generateId(20)
  }

//  this.auteur = new ReactiveDict('auteur'); // like Session.
  this.auteur = {};
  this.data.unique_name = new ReactiveVar(); // postfix:first (prefix:last-middle) postfix:year/city/occupation.
})


TP.helpers({
  form() {
    return Template.instance().form;
  },
  auteur() {
    const au = Template.instance().auteur;
    console.log('helper:auteur')
    return au && au.keys;
  }
})

TP.events({
  'input': (e,tp)=>{
    const value = e.target.value;
    console.log(`input target.value:`,e.target.value)
    console.log(`input target.name:`,e.target.name)
//    const auteur = tp.auteur.get();

    switch(e.target.name) {
      case tp.form.first_key: {
        tp.auteur.first = value;
      } break;
      case tp.form.last_key: {
        tp.auteur.last = value;
      } break;
      case tp.form.postfix_key: {
        // sort key for the main-postfix. does not need to be unique.
        // by default, built from last (first)
        tp.auteur.postfix = value;
      } break;
      case tp.form.index_key: {
        // by default, built from last (first) + options
        tp.auteur.index = value
      } break;
    } // switch
    console.log(`tp.auteur:`,tp.auteur);
    const first = tp.auteur.first?` (${tp.auteur.first})`:'';
    const postfix = tp.auteur.postfix?` ${tp.auteur.postfix}`:'';
    tp.data.unique_name.set(`${tp.auteur.last||''}${first}${postfix}`)
    // unique_name lookup.
    const unique_name = tp.data.unique_name.get()
    app.auteur_lookup(unique_name);
  }
})

TP.events({
  'submit form': (e,tp)=>{
    e.preventDefault();
    /* NO NEED we have tp.auteur ready.
    const target = e.target;
    const text = target.first_key.value;
    */

    console.log(`unique_name:`,tp.data.unique_name.get())
    const unique_name = tp.data.unique_name.get()
    app.auteur_lookup(unique_name);
//    tp.auteur.unique_name = unique_name;
    const title = unique_name
    const firstName = tp.auteur.first;
    const lastName = tp.auteur.last;
    const indexName = unique_name;

    Meteor.call('new-auteur',
    {
      unique_name,
      title,
      firstName,
      lastName,
      indexName
    }, (err, retv)=>{
      if (err) {
          console.log(`auteur-new err:`,err)
      }

      console.log(`auteur-new retv:`,retv)

      if (retv.err) {
          console.log(`auteur-new ERROR retv:`,retv.err)
          return; // warning in UI.
      }

      /*
          Update local-store with new auteur.
      */
      app.insert_new_auteur(retv);

    }); // meteor.call
  } // submit
});

// ============================================================================


// ============================================================================

FlowRouter.route('/new-auteur', {
  name: 'new-auteur',
  action: function(params, queryParams){
        console.log('Router::action for: ', FlowRouter.getRouteName());
        console.log(' --- params:',params);
//        document.auteur = "Museum v9";
//        app.article_id.set(undefined);
    BlazeLayout.render('auteur-new');
  }
});


function dec2hex (dec) {
  return ('0' + dec.toString(16)).substr(-2)
}

// generateId :: Integer -> String
function generateId (len) {
  var arr = new Uint8Array((len || 40) / 2)
  window.crypto.getRandomValues(arr)
  return Array.from(arr, dec2hex).join('')
}
