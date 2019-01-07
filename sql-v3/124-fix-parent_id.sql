
/*

	fix parent_id

*/

do $$
function notice(x) {plv8.elog(NOTICE,x)}

const titres = plv8.execute(`
select item_id, 
   latest_revision,
   parent_id,
--   data->>'xid' as xid,
   data->>'publisher' as publisher,
   data->>'publisherName' as publisherName,
--   data->'isoc' as isoc,
--   data,
   data->>'sec' as sec
from cms_articles__latest
--where (data->>'sec' is not null) and (data->>'publisherName' is not null)
where (data->'publisherName' is not null)
;
`)


notice(`cms_articles__latest =>${titres.length}`);

for (const j in titres) {
 const titre = titres[j];
 if (j>10) break;
 notice(`parent_id: ${titre.parent_id} => publisherName: ${titre.publishername}`)
}

$$ language plv8;


select x.item_id, x.parent_id,
	data->>'publisher' as publisher, data->>'publisherName' as publisher_name,
	i.item_id as publisher_id,
	title
--from cr_revisions
from cms_articles__latest x
join cr_items i on (i.name = data->>'publisherName')
where (data->'publisherName' is not null);


/*

	sur base de cette table, (WITH)
	update cr_items set parent_id = publisher_id
	where item_id = x.item_id

*/

/*
update cr_items i 
	set parent_id = p.item_id
from cms_articles__latest x
join cr_items p on 
	(p.name = x.data->>'publisherName')
where 
	(i.item_id = x.item_id)
;
*/

select r.data->>'publisherName' as pname, --item_id, parent_id, x.data --->>'publisherName' as publisherName
  o.object_type, r.title
--from cr_items x
from cms_articles__latest x
join cr_revisions r on (r.revision_id = x.latest_revision)
join acs_objects as o on (o.object_id = x.item_id)
where r.data->>'publisherName' is not null
;



