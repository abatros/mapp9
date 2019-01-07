const json2yaml = require('json2yaml');

const TP = Template['auteur-infos'];

TP.onCreated(function(){
  console.log(`onCreated auteur:`,this.data.id());
  const ti = this;
  ti.auteur = new ReactiveVar();
  ti.item_id = this.data.id().split('-')[0];

  Meteor.call('auteur-infos',{
    item_id:ti.item_id,
    checksum: "", // to be used if we have local copy
  },(err, auteur)=>{
    console.log('err:',err);
    console.log('auteur:',auteur);
    prep(auteur);
    ti.auteur.set(auteur);
  })
})

TP.onRendered(function(){
  console.log(`onRendered auteur:`,this.item_id);
  this.x = 'hello'
})

TP.helpers({
  auteur() {
    const a = Template.instance().auteur.get();
    return a;
  }
})


// ============================================================================

function prep(auteur) {
  auteur.yml = json2yaml.stringify(auteur);
}

// ============================================================================

FlowRouter.route('/auteur/:id', { name: 'auteur-infos',
    action: function(params, queryParams){
        console.log('Router::action for: ', FlowRouter.getRouteName());
        console.log(' --- params:',params);
        console.log(' --- query:',queryParams);
        if (queryParams.a == 'jj') {
//          Session.set('username','jj');
        }
/*
        document.auteur = "Museum v9";
        app.auteur_id.set(params.id);
        app.show_auteur(params.id);
*/
        BlazeLayout.render('auteur-infos', {id:params.id});
        // render template will get auteur from DB.
    }
});
