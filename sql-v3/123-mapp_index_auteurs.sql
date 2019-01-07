-- delete from acs_objects where (object_type = 'cms-article');

drop function if exists index_pdf;

/*

	This is only for section 3.
	We are looking for authors.

*/

create or replace function mapp_index_auteurs() returns jsonb as
$$
const xi = {}
const etime = new Date().getTime();

function notice(x) {plv8.elog(NOTICE,x)}

const titres = plv8.execute(`
select item_id, 
   latest_revision,
   data->>'xid' as xid,
   data->>'sec' as sec,
   data->>'yp' as yp,
   (data->>'transcription')::boolean as transcription,
   (data->>'restricted')::boolean as restricted,
   data->'titres' as titles,
   data->'auteurs' as auteurs,
   data->'links' as links
from cms_articles__latest
where (data->>'sec' is null) -- sensitive - could change. should be 3
or ((data->>'sec')::integer = 3)
;
`)

notice(`cms_articles__latest =>${titres.length}`);

titres.forEach((titre,j) =>{
  if (!titre.auteurs) {
    notice(`j:${j} titre:${JSON.stringify(titre)}`);
    throw 'plv8::index_pdf =>fatal title without author';
  }
//  notice(titre.sec);
  titre.auteurs.forEach((aName)=>{
    xi[aName] = xi[aName] || [];
    xi[aName].push({
	xid: titre.xid,
	yp: titre.yp,
	name: titre.name,
	links: titre.links,
	title: titre.titles[0],
	transcription: titre.transcription,
	restricted: titre.restricted
	})
  });

});
notice(`etime: ${new Date().getTime()-etime} msec`)
//return Object.values(xi);
return {
  auteurs: xi,
  etime: new Date().getTime()-etime
}
$$ language plv8;

/*
do $$
const v = plv8.execute("select index_pdf()")[0].index_pdf;
plv8.elog(NOTICE, JSON.stringify(v));
//plv8.elog(NOTICE, JSON.stringify(v.index_pdf))
$$ language plv8;
*/



select mapp_index_auteurs();

/*

select item_id, revision_id, data->>'restricted' as R, data->'titres' as title, data->'auteurs' as auteurs, data->'links' as pdf
from cms_articles__latest
--where ((data->>'transcription')::boolean = true)
;


select data->>'xid', data->>'restricted', data->>'transcription' from cms_articles__latest;

select data->>'xid', data->>'restricted', data->>'transcription' 
from cr_revisions r where ((r.data->>'restricted')::boolean = true);

select item_id, revision_id, data->>'yp'
from cms_articles__latest
where (data->>'yp' = '1900')

select content_item__delete(268175);

select * from cr_revisions where (item_id = 268175)

*/


