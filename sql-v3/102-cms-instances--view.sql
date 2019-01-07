
drop view if exists cms_instances__view;
drop view if exists cms_instances;

/*

    cms-instance is a package instance
    with package_key 'cms'

    There are 1 main folder (under -100) plus 2 subfolders (publishers, authors)

*/


CREATE OR REPLACE VIEW cms_instances AS
select p.package_id, f.folder_id, i.name, f.label
    -- wrong , object_id, acs_objects.title, OR add a object_type...
from apm_packages p
left join cr_folders as f on (f.package_id = p.package_id)
left join cr_items as i on (i.item_id = f.folder_id)
-- wrong left join acs_objects on (acs_objects.package_id = apm_packages.package_id)
where i.parent_id = -100
--and cr_items.name = o->>'name'
and p.package_key = 'cms';


-- TEST:
select * from cms_instances;


drop view if exists cms_folders;

CREATE OR REPLACE VIEW cms_folders AS
 SELECT f.folder_id,
    i.parent_id,
    i.name,
    f.label,
    p.package_id
   FROM cr_folders f
     LEFT JOIN cr_items i ON i.item_id = f.folder_id
     JOIN apm_packages p ON p.package_id = f.package_id
  WHERE p.package_key::text = 'cms'::text;


select * from cms_folders;
