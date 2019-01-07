create or replace function cms_package__uninstall(o jsonb)
  returns void as
$$
plv8.elog(NOTICE, "Uninstalling package CMS.")
const drop_children_p =true;
const drop_table_p =true;
const drop_objects_p =true;

const instances = plv8.execute("select * from apm_packages where package_key = 'cms'");
//plv8.elog(NOTICE, 'found instances:',JSON.stringify(instances));
if (instances.length >0) {
plv8.elog(NOTICE, 'found ',instances.length,'instances - still installed - remove first.');

instances.forEach(function(ii){
  plv8.elog(NOTICE, JSON.stringify(ii));
})

instances.forEach(function(ii){
  const md = instance_metadata(ii)
})


const v1 = plv8.execute("select * from cms_instances__view");

v1.forEach(function(ii){
  plv8.elog(NOTICE, JSON.stringify(ii));
  if (ii.folder_id) {
    plv8.elog(NOTICE, 'Remove folder');
    throw 'fatal-29'
    }

  // here, drop the instance.
  plv8.execute("select apm_package__delete($1)",[ii.package_id]);
})

} // remove all instances.

// ==========================================================================

function instance_metadata(ii) {
  plv8.elog(NOTICE, '')
  plv8.elog(NOTICE, 'Instance package_id:',ii.package_id)
  plv8.elog(NOTICE, 'Instance name: <',ii.instance_name,'>')
}



/*

      ALL packages should be removed before dropping package_key "cms"
      IF NOT, this will stop.

*/

plv8.elog(NOTICE, "dropping package_type <cms>")
plv8.execute("select apm_package_type__drop_type('cms',$1)",[o.cascade ||false])



'cms-article cms-publisher cms-author'.split(' ').forEach(function(content_type) {
  const retv = plv8.execute("select content_type__drop_type($1,$2,$3,$4)",
  [
    content_type,
    drop_children_p,
    drop_table_p,
    drop_objects_p
  ])[0];
  plv8.elog(NOTICE, "dropping content_type <",content_type,'>. retv:',JSON.stringify(retv))

})

var query;

'cms_articles cms_publishers cms_authors'.split(' ').forEach(function(table_name) {
  plv8.elog(NOTICE, "dropping table <",table_name,'>.')
  query = 'drop table if exists '+table_name+' cascade;'
  plv8.execute(query);
//  plv8.execute("drop table if exists cms_articles cascade;");
})

'cms_article_revisions cms_publisher_revisions cms_author_revisions'.split(' ').forEach(function(table_name) {
  plv8.elog(NOTICE, "dropping table <",table_name,'>.')
  query = 'drop table if exists '+table_name+' cascade;'
  plv8.execute(query);
})

'articles publishers authors'.split(' ').forEach(function(table_name) {
  plv8.elog(NOTICE, "dropping table <",table_name,'>.')
  query = 'drop table if exists '+table_name+' cascade;'
  plv8.execute(query);
})

'article_revisions publisher_revisions author_revisions'.split(' ').forEach(function(table_name) {
  plv8.elog(NOTICE, "dropping table <",table_name,'>.')
  query = 'drop table if exists '+table_name+' cascade;'
  plv8.execute(query);
})




$$
language plv8;


select cms_package__uninstall('{}');
