const TP = Template['admin'];


// ============================================================================

FlowRouter.route('/admin', { name: 'admin',
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
        BlazeLayout.render('admin', {id:params.id});
        // render template will get article from DB.
    }
});
