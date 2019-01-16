
drop view if exists cms_instances__view;
drop view if exists cms_instances;

/*

    cms-instance is a package instance
    with package_key 'cms'

    There are 1 main folder (under -100) - the application-folder.
    Publishers and Authors are directly at level 1 under application-folder.
    Articles are under the publisher-name.
    Publisher is the unique owner of an article.
    Several authors, can collaborate to an article.

*/


CREATE OR REPLACE VIEW cms_instances AS
select 
  p.package_id, 
  f.folder_id, 
  i.name, 
  f.label
from apm_packages p
left join cr_folders as f on (f.package_id = p.package_id)
left join cr_items as i on (i.item_id = f.folder_id)
where i.parent_id = -100
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
select * from cms_instances;
