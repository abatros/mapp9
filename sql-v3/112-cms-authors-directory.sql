
drop view if exists cms_authors__directory;

/*
      acs_objects.type == 'cms-author'
*/

create or replace view cms_authors__directory as
  select 
    i.item_id,
    i.name,
    i.latest_revision,
    i.parent_id,
    r.title,
    r.checksum,
    r.data,
    o.package_id
  from cr_items as i
  join cr_revisions as r on (r.revision_id = i.latest_revision)
  join acs_objects as o on (o.object_id = i.item_id)
  where (o.object_type = 'cms-author')
  ;

select * from cms_authors__directory;

--select * from acs_objects where object_type = 'cms-author';
