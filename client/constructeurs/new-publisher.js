const assert = require('assert');
const app = require('../app-client.js'); // for lookup to access auteurs

const TP = Template['new-publisher'];

TP.onCreated(function(){
  this.soc = {};
//  this.data.unique_name = new ReactiveVar(); // postfix:first (prefix:last-middle) postfix:year/city/occupation.
})


TP.helpers({
  form() {
    return Template.instance().form;
  },
  soc() {
    const tp = Template.instance()
    return tp.publisher;
  }
})

TP.events({
  'input': (e,tp)=>{
    const value = e.target.value;
    const name = e.target.name;
    console.log(`input target.name:(${e.target.name})=>value:(${e.target.value})`);
    tp.soc[e.target.name]=e.target.value;

    if (name == 'last-acronym') {
      if (value.length >0) {
  //      Session.set('last-auteur-add-display','')
      } else {
  //      Session.set('last-auteur-add-display','nodisplay')
      }
    }

  }
})

// ============================================================================

TP.events({
  'click .save-new-publisher': (e,tp)=>{
    const o = tp.soc;
    o.name = o.name || o.title;
    const p1 = app.insert_new_publisher(o);
    p1.then(retv=>{
      console.log('success new-publisher =>',retv)
      // update localStore is done in app.insert_new_publisher
    })
    .catch(err=>{
      console.log('failure new-publisher =>',err)
    })
  } // save-new-publisher
})
// ============================================================================

FlowRouter.route('/new-soc', {
  name: 'new-publisher',
  action: function(params, queryParams){
        console.log('Router::action for: ', FlowRouter.getRouteName());
        console.log(' --- params:',params);
//        document.auteur = "Museum v9";
//        app.article_id.set(undefined);
    BlazeLayout.render('new-publisher');
  }
});
