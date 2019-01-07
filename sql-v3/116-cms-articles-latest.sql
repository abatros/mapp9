
drop view if exists cms_articles__latest;

/*
      acs_objects.type == 'cms-article'

	- Sun Jan 6, 2019. 
		In CMS, an article belongs to a publisher.
		That means that parent_id -> another cr_item (publisher); NOT cr_folder.
		In turn, p.parent_id is a cr_folder.
      
*/

create or replace view cms_articles__latest as
  select i.item_id, 
    i.name,
    i.parent_id,  -- a publisher
    i.latest_revision, -- less confusing that revision_id, and re-inforce we are getting the latest_revision.
    r.title,		-- indexName := isoc[0]
    p.item_id as publisher_id, -- always == i.parent_id
    p.parent_id as folder_id, -- replace f.folder_id
--    f.folder_id,
--    f.package_id, -- to limit 
    o.package_id,
    r.data
  from cr_items as i
  join cr_items as p on (p.item_id = i.parent_id)
  join cr_folders as f on (f.folder_id = p.parent_id) -- enforce: p.parent MUST be a folder.
  join cr_revisions as r on (r.revision_id = i.latest_revision)
  join acs_objects as o on (o.object_id = i.item_id)
  where (o.object_type = 'cms-article')
--  join apm_packages p on (p.package_id = f.package_id)
--  where (p.package_key = 'cms')
--  and (f.label like 'Publisher%')
  ;

--select data->>'publisherName' from cms_articles__latest;
select title, data->'isoc', data->'h1' from cms_articles__latest;
