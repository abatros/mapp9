drop function if exists mapp_index_marques;
drop function if exists mapp.index_marques;

drop type mapp.index_marques cascade;

create type mapp.index_marques as (
    marque text,
    articles jsonb[]
	);

/*
    ONLY for articles S1 and S2. (catalogs constructeurs - appareils/composants)
    This index gives entry to latest_revision.
    See also : index_marques_live
*/

create or replace function mapp.index_marques(cmd jsonb)
returns setof mapp.index_marques
as $$
const etime = new Date().getTime();

function notice(x) {plv8.elog(NOTICE,x)}

const query = `
select
   latest_revision,
   title,
   item_id,
   data->'links' as links,
   data->>'yp' as yp,
   (data->>'transcription')::boolean as transcription,
   (data->>'restricted')::boolean as restricted,
   data->>'xid' as xid,
   data->'mk' as mk,
--   data->'titres' as titles,
   data->>'sec' as sec
from cms_articles__directory
where (data->>'sec' != '3')
and (data->>'mk' is not null)
`;

if (!cmd.package_id && !cmd.all_packages) {
  cmd.error = `[mapp.index_marques] Invalid cmd - Missing cmd.package_id`;
  notice(cmd.error);
  return cmd;
}

var titres;
if (cmd.package_id) {
  titres = plv8.execute(query + `and (package_id = $1);`, [cmd.package_id])
} else {
  titres = plv8.execute(query, []);
}

const marques = {}
let mCount = 0;
for (const j in titres) {
  const titre = titres[j];
  const {item_id, xid, yp, name, title="*missing*", links, transcription, restricted} = titre;

  const mk = titre.mk.map(mk1=>(mk1.trim())).filter(mk1=>(mk1.length>0)); // FIX.

  if (!mk || (mk.length<1)) {
    notice(`j:${j} titre:${JSON.stringify(titre)}`);
    mCount++;
    notice (`mapp_index_byMarques =>fatal title without marque xid:${xid} ${mCount}/${j}`);
    continue;
  }
//  notice(titre.sec);


  mk.forEach((mk1)=>{
    if (mk1.length<1) throw `fatal-65`;
    if (mk1.trim().length<1) throw `fatal-66`;
    marques[mk1] = marques[mk1] || [];

    marques[mk1].push({
	item_id,
  title,
	xid,
	yp,
	name,
	links,
	transcription,
	restricted
	})
  });
}; // loop.


/*
const mlist = Object.entries(marques).map((marque,value)=>({
    marque,
    nc: value.length,
    articles: value
}))
*/

const mlist = Object.keys(marques).map(mk1 => ({
    marque: mk1,		// marque
//    nc: marques[mk1].length,
    articles: marques[mk1]	// list of catalogs.
}));

notice(`etime: ${new Date().getTime() - etime} ms`)
return mlist;
$$ language plv8;

/*
do $$

function notice(x) {plv8.elog(NOTICE,x)}

const ii = plv8.execute(`
select * from mapp.index_marques() order by marque;
`)

ii.forEach(it =>{
  notice(`${it.marque} (${it.nc})`)
  it.articles.forEach(a=>{
    notice(`  ${a.xid}`)
    a.links.forEach(pdf=>{
      notice(`    pdf: (${pdf.np} pages) ${pdf.fn}`)
    })
  })
})
$$ language plv8;
*/

select * from mapp.index_marques('{"all_packages":true}'::jsonb) order by marque;
select * from mapp.index_marques('{"package_id":236393}'::jsonb) order by marque;
