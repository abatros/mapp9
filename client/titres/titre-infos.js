const json2yaml = require('json2yaml');

const TP = Template['titre-infos'];

TP.onCreated(function(){
  console.log(`onCreated titre:`,this.data.id());
  const ti = this;
  ti.article = new ReactiveVar();
  ti.item_id = this.data.item_id = this.data.id().split('-')[0];

  Meteor.call('titre-infos',{
    item_id:ti.item_id,
    checksum: "", // to be used if we have local copy
  },(err, article)=>{
    console.log('err:',err);
    console.log('article:',article);
    prep(article);
    ti.article.set(article);
  })
})

TP.onRendered(function(){
  console.log(`onRendered titre:`,this.item_id);
  this.x = 'hello'
})

TP.helpers({
  article() {
    const a = Template.instance().article.get();
    return a;
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
  article.yml = json2yaml.stringify(article);
}

// ============================================================================

FlowRouter.route('/titre/:id', { name: 'titre-infos',
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
        BlazeLayout.render('titre-infos', {id:params.id});
        // render template will get article from DB.
    }
});
