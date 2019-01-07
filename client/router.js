//const app = require('./client-app.js');
const assert = require('assert');

console.log('execute/init router.js');



FlowRouter.triggers.enter([
  function(context, redirect) {
    console.log('context.queryParams:',context.queryParams);
    const cur_lang = Session.get('cur-lang');
    const lang = context.queryParams.lang
      || cur_lang || 'fr';

    /*
    if (lang != TAPi18n.getLanguage()) {
      TAPi18n.setLanguage(lang)
      .done(function () {
        //console.log('switching to lang:',lang)
        assert((TAPi18n.getLanguage() == lang), 'fatal-15.0');
        Session.set('cur-lang',lang);
      })
      .fail((err) => {
          // Handle the situation
        console.log('failed to switch to lang:',lang)
        console.log('TAPi18n: ',err);
      });
    }


    console.log('global trigger language:',TAPi18n.getLanguage())
    console.log('languages:',TAPi18n.getLanguages())
    */
  }
]);






FlowRouter.route('/article/:id', { name: 'cc-article',
    action: function(params, queryParams){
        console.log('Router::action for: ', FlowRouter.getRouteName());
        console.log(' --- params:',params);
        console.log(' --- query:',queryParams);
        if (queryParams.a == 'jj') {
          Session.set('username','jj');
        }
        document.title = "Museum v9";
        app.article_id.set(params.id);
        app.show_article(params.id);
        BlazeLayout.render('index');
        // render template will get article from DB.
    }
});

FlowRouter.route('/mktoc', { name: 'toc-index',
    action: function(params, queryParams){
        document.title = "Musee Ultimheat du Chauffage";
        BlazeLayout.render('toc-index');
    }
});




FlowRouter.route('/constructeurs', { name: 'constructeurs',
    action: function(params, queryParams){
        document.title = "Musee Ultimheat du Chauffage";
        BlazeLayout.render('constructeurs');
    }
});
