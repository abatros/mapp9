delete 
from acs_objects o
using cms_publishers__directory d
where (d.item_id = o.object_id)
and (jsonb_array_length(data->'aka') <= 0);



select title, data->'aka' as aka
from cms_publishers__directory
--where (title != data->'aka'->>0)
where (jsonb_array_length(data->'aka') <= 0)
order by title