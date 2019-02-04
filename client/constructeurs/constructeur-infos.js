const json2yaml = require('json2yaml');

const TP = Template['constructeur-infos'];

TP.onCreated(function(){
  console.log(`onCreated soc:`,this.data.id());
  const ti = this;
  ti.soc = new ReactiveVar();
  ti.catalogs = new ReactiveVar();

  ti.item_id = this.data.item_id = this.data.id().split(/\-/)[0];

  Meteor.call('constructeur-infos',{
    item_id:ti.item_id,
    checksum: "", // to be used if we have local copy
  },(err, retv)=>{
    if (err) throw err;
    console.log('retv:',retv);
    prep_fix(retv.constructeur);
    console.log('after prep retv.constructeur:',retv.constructeur);
    ti.soc.set(retv.constructeur);
    ti.catalogs.set(retv.articles);
    retv.articles.forEach(cc=>{
      cc.yml = json2yaml.stringify(cc);
    })
  })
})

TP.onRendered(function(){
  console.log(`onRendered soc:`,this.item_id);
  this.x = 'hello'
})

TP.helpers({
  soc() {
    const a = Template.instance().soc.get();
    return a;
  },
  catalogs() {
    return Template.instance().catalogs.get();
  },
  fix(x) {
    return x.replace(/\s+/g,'-');
  }
})


// ============================================================================

function prep_fix(soc) {
  soc.yml = json2yaml.stringify(soc);
  soc.fa_ = [];
  soc.data && soc.data.addresses && soc.data.addresses.forEach(a=>{
    const [sa,ci,co] = a.split('<>');
    soc.fa_.push(`${sa?sa:''}${ci?' - '+ci:''}${co?' - '+co:''}`)
  })
  soc.data.indexNames = soc.data.indexNames || soc.data.aka;
}

// ============================================================================

FlowRouter.route('/constructeur/:id', { name: 'constructeur-infos',
    action: function(params, queryParams){
        console.log('Router::action for: ', FlowRouter.getRouteName());
        console.log(' --- params:',params);
        console.log(' --- query:',queryParams);
        if (queryParams.a == 'jj') {
//          Session.set('username','jj');
        }
/*
        document.soc = "Museum v9";
        app.soc_id.set(params.id);
        app.show_soc(params.id);
*/
        BlazeLayout.render('constructeur-infos', {id:params.id});
        // render template will get soc from DB.
    }
});
