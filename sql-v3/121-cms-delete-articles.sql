delete
from acs_objects o
using cr_items as i
where o.package_id = 236393
and o.object_type = 'cms-article'
and i.parent_id = 236394;

/*
delete from acs_objects
using cr_items
where (object_id = item_id)
and (object_type = 'cms-author')
and (parent_id = -100)
*/
