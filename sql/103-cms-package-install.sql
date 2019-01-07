
-- create or replace function cms_package__create_tables() returns void as
do $$ begin
  create table if not exists cms_publishers (
    publisher_id integer
      primary key
      references cr_revisions(revision_id)
      on delete cascade
  );

  create table if not exists cms_articles (
    article_id integer
      primary key
      references cr_revisions(revision_id)
      on delete cascade
  );

  create table if not exists cms_authors (
    author_id integer
      primary key
      references cr_revisions(revision_id)
      on delete cascade
  );

end $$ language plpgsql;


do $$

plv8.execute('select cms_package__create_tables()');


const packages_data = [
{
content_type: 'cms-article',
super_type: 'content_revision',
pretty_name: 'CMS Article',
pretty_plural: 'CMS Articles',
table_name: 'cms_articles',
id_column: 'article_id',
name_method: 'content_revision.revision_name' // !!! what for ?
},{
content_type: 'cms-publisher',
super_type: 'content_revision',
pretty_name: 'CMS Publisher',
pretty_plural: 'CMS Publishers',
table_name: 'cms_publishers',
id_column: 'publisher_id',
name_method: 'content_revision.revision_name' // !!!
},{
content_type: 'cms-author',
super_type: 'content_revision',
pretty_name: 'CMS Author',
pretty_plural: 'CMS Authors',
table_name: 'cms_authors',
id_column: 'author_id',
name_method: 'content_revision.revision_name' // !!!
}
];

packages_data.forEach(function(it) {
const found = plv8.execute("select content_type__is_content_type($1)",[it.content_type])[0].content_type__is_content_type;
if (found == undefined) throw 'fatal-34';
//plv8.elog(NOTICE, 'found:',found.content_type__is_content_type);
if (found) {
  plv8.elog(NOTICE, 'content_type <',it.content_type,'> found - do nothing');
} else {
  plv8.elog(NOTICE, 'content_type <',it.content_type,'> not found - create.');
  const query = 'select content_type__create_type($1,$2,$3,$4,$5,$6,$7)';
  const retv = plv8.execute(query,
  [
    it.content_type,
    it.super_type,
    it.pretty_name,
    it.pretty_plural,
    it.table_name,
    it.id_column,
    it.name_method
  ]);
  plv8.elog(NOTICE, 'content_type <',it.content_type,'> retv: ',JSON.stringify(retv));
}
})


const package_key = 'cms';
const pretty_name = 'Classifieds';
const pretty_plural = 'Classifieds';
const package_uri = 'inhelium.com';
const package_type = 'apm_application';
const initial_install_p = false;
const singleton_p = false;
const implement_subsite_p = false;
const inherit_templates_p = false;
const spec_file_path = '/home/dkz/Classifieds';
const spec_file_mtime = 0;

const v = plv8.execute('select * from apm_package_types where package_key = $1',[package_key]);
if (v.length == 1) {
if (o.verbose) plv8.elog(INFO,'Package type already exists:',package_key)
return v[0];
}
if (v.length <1) {

const v2 = plv8.execute("select apm_package_type__create_type($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",
  [
  package_key,
  pretty_name,
  pretty_plural,
  package_uri,
  package_type,
  initial_install_p,
  singleton_p,
  implement_subsite_p,
  inherit_templates_p,
  spec_file_path,
  spec_file_mtime
  ]);

if (o.verbose) plv8.elog(INFO,'Package type created v2:',JSON.stringify(v2))

// would be the place to add parameters

}
$$
language plv8;
