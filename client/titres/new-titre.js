const assert = require('assert');
const app = require('../app-client.js'); // for lookup to access auteurs

const TP = Template['new-titre'];


TP.onCreated(function(){
  this.titre = {};
//  this.data.unique_name = new ReactiveVar(); // postfix:first (prefix:last-middle) postfix:year/city/occupation.
  Session.set('last-auteur-add-display','nodisplay')
  this.auteurs = new ReactiveArray();
  this.last_auteur = new ReactiveVar();
  this.auteurs.push('tartenpion')
})


TP.helpers({
  auteurs() {
    const tp = Template.instance();
    console.log('helper:auteurs')
    return tp.auteurs.get()
  }
  /*
  form() {
    return Template.instance().form;
  },
  titre() {
    const titre = Template.instance().titre;
    console.log('helper:auteur')
    return au && au.keys;
  }
  */
})

// ===========================================================================
TP.events({
  'focusout .js-data': (e,tp) =>{
    console.log('focusout e.target:',e.target);
    console.log(`focusout e.target name:(${e.target.name})=>value:(${e.target.value})`);

    tp.new_data[e.target.name] = e.target.value; // not reactive.
    //    console.log(`tp.new_data:`,tp.new_data)
    //    console.log(`tp.original.get().data:`,tp.original.get().data)
  },
})
// ===========================================================================

TP.events({
  'click .js-add-auteur-line': (e,tp)=>{
    /*
          push the last line onto stack, a reactive array.
    */
    tp.auteurs.push('another')
  }
})


TP.events({
  /*
  'input .js-auteur-name': (e,tp)=>{
    console.log(`auteur-name:`,e.target.value)
  },
  'input .js-auteur-name': (e,tp)=>{
    console.log(`auteur-name:`,e.target.value)
  },
  */


  'input': (e,tp)=>{
    const value = e.target.value;
    const name = e.target.name;
    console.log(`input target.name:(${e.target.name})=>value:(${e.target.value})`);
    tp.titre[e.target.name]=e.target.value;

    if (name == 'last-auteur-entry') {
      if (value.length >0) {
        Session.set('last-auteur-add-display','')
      } else {
        Session.set('last-auteur-add-display','nodisplay')
      }
    }
  }
})

TP.events({
  'submit form': (e,tp)=>{
    e.preventDefault();
    /* NO NEED we have tp.auteur ready.
    const target = e.target;
    const text = target.first_key.value;
    */

    tp.titre.auteurs = tp.auteurs.get();
    tp.titre.auteurs.push(tp.last_auteur.get());

    console.log(`submit tp.titre:`,tp.titre);
    const p1 = app.new_titre(tp.titre);
    p1.then(retv=>{
      console.log('success new-titre =>',retv)
    })
    .catch(err=>{
      console.log('failure new-titre =>',err)
    })

  } // submit
});

// ============================================================================


// ============================================================================

FlowRouter.route('/new-titre', {
  name: 'new-titre',
  action: function(params, queryParams){
        console.log('Router::action for: ', FlowRouter.getRouteName());
        console.log(' --- params:',params);
//        document.auteur = "Museum v9";
//        app.article_id.set(undefined);
    BlazeLayout.render('new-titre');
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
