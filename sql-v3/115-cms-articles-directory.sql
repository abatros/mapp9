-- 115-cms-article-directory.sql

drop view if exists cms_articles__directory;

/*

      acs_objects.type == 'cms-article'
*/

create or replace view cms_articles__directory as
  select i.item_id, i.name, i.live_revision, i.latest_revision, i.parent_id, 
	r.title, r.checksum, 
	o.package_id
  from cr_items as i
  join acs_objects as o on (o.object_id = i.item_id)
  join cr_revisions as r on (r.revision_id = i.latest_revision)
  where (o.object_type = 'cms-article')
--  join apm_packages p on (p.package_id = f.package_id)
--  where (p.package_key = 'cms')
--  and (f.label like 'Publisher%')
  ;

select * from cms_articles__directory;
