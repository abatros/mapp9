-- 115-cms-article-directory.sql

-- drop view if exists cms_pdf_pages__directory;

/*

      acs_objects.type == 'cms-article'
*/

create or replace view cms_pdf_pages__directory as
select
  p.data->>'url' as url,
  p.data->>'pageNo' as pageno,
--  p.data,
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
from txt as p
join cr_revisions as r on (r.revision_id = p.object_id)
join cr_items as i on (i.latest_revision = r.revision_id)
join acs_objects as o on (o.object_id = i.item_id)
where (o.object_type = 'pdf_file');


select count(*) from cms_pdf_pages__directory;

select pageno from cms_pdf_pages__directory
--where url like '1920%';


--select item_id, parent_id, package_id, pageno, url from cms_pdf_pages__directory;
