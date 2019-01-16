
drop view if exists cms_publishers__directory;

/*
      acs_objects.type == 'cms-publisher'
      This is for the latest revisions.
      See also cms_publishers__live_directory
*/

/*
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
*/

create or replace view cms_publishers__directory as
  select 
    i.item_id, 
    i.name,
    i.parent_id,
    i.latest_revision,
    r.title,
    r.checksum,
    r.data,
    o.package_id
  from cr_items as i
  join acs_objects as o on (o.object_id = i.item_id)
  join cr_revisions as r on (r.revision_id = i.latest_revision)
  where (o.object_type = 'cms-publisher')
  ;

/*
	All publishers have parent_id => application-folder, ex: 'cms-345567'
	The caller should specify either (object) package_id or  (folder) parent_id.
	Note 1:	- authors are also at that level, 
		- ie: parent_id => application-folder. 
		- Only difference is object_type = 'cms-author'
		- See cms_authors__directory()
	Note 2:	- Investigate if using table cms_publishers can speed up the search.
*/


-- select * from cms_publishers__directory;

--delete from acs_objects where object_id = 386634;
--select * from cms_publishers__directory where name = 'po4l2i3t2usan2e';
select * from cms_publishers__directory where parent_id > 931000;
--select * from cms_publishers__directory where package_id != 236393;
--select * from cms_publishers__latest where package_id != 236393;




do $$
const etime = new Date().getTime();
const retv = plv8.execute(`
select revision_id, i.item_id, title, checksum from cms_publishers p
join cr_revisions r on (r.revision_id = p.publisher_id)
join cr_items i on (i.latest_revision = r.revision_id)
`);
plv8.elog(NOTICE,`retv1.length:${retv.length} etime:${new Date().getTime()-etime} ms.`)
$$ language plv8;


do $$
const etime = new Date().getTime();
const retv = plv8.execute(`
select latest_revision, item_id, title, checksum from cms_publishers__directory p
--join cr_revisions r on r.revision_id = p.publisher_id
`);
plv8.elog(NOTICE,`retv2.length:${retv.length} etime:${new Date().getTime()-etime} ms.`)
$$ language plv8;


do $$
const etime = new Date().getTime();
const retv = plv8.execute(`
select latest_revision, item_id from cms_publishers__latest p
--join cr_revisions r on r.revision_id = p.publisher_id
`);
plv8.elog(NOTICE,`retv2.length:${retv.length} etime:${new Date().getTime()-etime} ms.`)
$$ language plv8;



/*

NOTICE:  retv1.length:2850 etime:20 ms.
NOTICE:  retv2.length:2850 etime:11 ms.

Since using view cmd_publishers__directory is faster than using table cms_publishers,
DO WE REALLY NEED CMS_PUBLISHERS ???

*/

