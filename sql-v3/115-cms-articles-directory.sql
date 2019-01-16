-- 115-cms-article-directory.sql

drop view if exists cms_articles__directory;

/*

      acs_objects.type == 'cms-article'
*/

create or replace view cms_articles__directory as
select 
  i.item_id, 
  i.name, 
  i.latest_revision, 
  i.parent_id,
  i.publish_status, -- production-ready-live-expired
  i.content_type,   -- ?= object_type ?= 'cms-article' Obviously NOT ! it's always 'content_revision'
  r.title, 
  r.checksum,
  r.data,
  o.package_id
from cr_items as i
join acs_objects as o on (o.object_id = i.item_id)
join cr_revisions as r on (r.revision_id = i.latest_revision)
where (o.object_type = 'cms-article');

select * from cms_articles__directory;
