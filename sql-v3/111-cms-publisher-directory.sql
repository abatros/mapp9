
drop view if exists cms_publishers__directory;

/*
      acs_objects.type == 'cms-publisher'
      This is for the latest revisions.
      See also cms_publishers__live_directory
*/

create or replace view cms_publishers__directory as
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
  where (o.object_type = 'cms-publisher')
--  join apm_packages p on (p.package_id = f.package_id)
--  where (p.package_key = 'cms')
--  and (f.label like 'Publisher%')
  ;

select * from cms_publishers__directory;
