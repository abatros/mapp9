
drop view if exists cms_authors__directory;

/*
      acs_objects.type == 'cms-author'
*/

create or replace view cms_authors__directory as
  select i.item_id,
    i.name,
    r.revision_id, 
    r.checksum,
    r.title,
    f.package_id,
    f.folder_id
  from cr_items as i
  join cr_folders as f on (f.folder_id = i.parent_id)
  join cr_revisions as r on (r.revision_id = i.latest_revision)
  join acs_objects as o on (o.object_id = i.item_id)
  where (o.object_type = 'cms-author')
  ;

select * from cms_authors__directory;

--select * from acs_objects where object_type = 'cms-author';
