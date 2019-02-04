select object_id, title from acs_objects o
join cr_items as i on (i.item_id = object_id)
where
--  o.package_id = 236393
--and o.object_type = 'pdf_file'
--and
i.parent_id = 278109
order by object_id;


--select * from cms_pdf__directory;

delete
from acs_objects o
using cr_items as i
where i.item_id = o.object_id
and o.package_id = 236393
and o.object_type = 'pdf_file'
and i.parent_id = 278109;
