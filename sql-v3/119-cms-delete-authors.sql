delete
from acs_objects o
using cr_items as i
where o.package_id = 236393
and o.object_type = 'cms-author'
and i.parent_id = 238770;
