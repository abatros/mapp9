const json2yaml = require('json2yaml');

const TP = Template['soc-infos'];

TP.onCreated(function(){
  console.log(`onCreated soc:`,this.data.id());
  const ti = this;
  ti.soc = new ReactiveVar();

  ti.item_id = this.data.item_id = this.data.id().split(/\-/)[0];

  Meteor.call('soc-infos',{
    item_id:ti.item_id,
    checksum: "", // to be used if we have local copy
  },(err, soc)=>{
    console.log('err:',err);
    console.log('soc:',soc);
    prep(soc);
    console.log('after prep soc:',soc);
    ti.soc.set(soc);
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
  }
})


// ============================================================================

function prep(soc) {
  soc.yml = json2yaml.stringify(soc);
  soc.fa_ = [];
  soc.data.addresses && soc.data.addresses.forEach(a=>{
    const [sa,ci,co] = a.split('<>');
    soc.fa_.push(`${sa?sa:''}${ci?' - '+ci:''}${co?' - '+co:''}`)
  })
}

// ============================================================================

FlowRouter.route('/soc/:id', { name: 'soc-infos',
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
        BlazeLayout.render('soc-infos', {id:params.id});
        // render template will get soc from DB.
    }
});
