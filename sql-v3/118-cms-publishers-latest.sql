
drop view if exists cms_publishers__latest;

/*
      acs_objects.type == 'cms_publisher'
*/

create or replace view cms_publishers__latest as
  select i.item_id, i.name, o.object_type,
    i.latest_revision, i.live_revision,
    r.revision_id,
    f.folder_id, f.package_id,
    r.data
  from cr_items as i
  join cr_folders as f on (f.folder_id = i.parent_id)
  join cr_revisions as r on (r.revision_id = i.latest_revision)
  join acs_objects as o on (o.object_id = i.item_id)
  where (o.object_type = 'cms-publisher')
--  join apm_packages p on (p.package_id = f.package_id)
--  where (p.package_key = 'cms')
--  and (f.label like 'Publisher%')
  ;

select * from cms_publishers__latest;
