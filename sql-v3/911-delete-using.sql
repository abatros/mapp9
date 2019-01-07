delete from acs_objects o
using
cr_items i
where
(i.item_id = o.object_id)
and
--(i.parent_id = 238770)
--(i.parent_id = -100)
(i.parent_id = 236394)
and
(o.object_type = 'cms-article')
--(o.object_type = 'content_folder')
;

with t as (
select * from acs_objects o
join cr_items i
on
(i.item_id = o.object_id)
where
--(i.parent_id = 238770)
--(i.parent_id = -100)
(i.parent_id = 236394)
and
(o.object_type = 'cms-article')
--(o.object_type = 'content_folder')
)
select * from t order by object_id
;

