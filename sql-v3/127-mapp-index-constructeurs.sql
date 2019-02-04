drop function if exists mapp_index_constructeurs;
drop function if exists mapp.index_constructeurs;

drop type mapp.index_constructeurs cascade;

create type mapp.index_constructeurs as (
    name text,
    articles jsonb[]
    );

/*
    ONLY for articles S1 and S2. (catalogs constructeurs - appareils/composants)
    This index gives entry to latest_revision.
    See also : index_marques_live
*/

create or replace function mapp.index_constructeurs(cmd jsonb)
returns setof mapp.index_constructeurs
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
--   data->'mk' as mk,
--   data->'titres' as titles,
   data->'isoc' as aka,
   data->>'sec' as sec
from cms_articles__directory
where (data->>'sec' != '3')
--and (data->>'titles' is not null)
`;

if (!cmd.package_id && !cmd.all_packages) {
  cmd.error = `[mapp.index_constructeurs] Invalid cmd - Missing cmd.package_id`;
  notice(cmd.error);
  return cmd;
}

var titres;
if (cmd.package_id) {
  titres = plv8.execute(query + `and (package_id = $1);`, [cmd.package_id])
} else {
  titres = plv8.execute(query, []);
}

notice(`found ${titres.length} titres`)
const xi = {} // for constructor legalName (indexName) and all acronyms => list of catalogs.
let mCount = 0;

for (const j in titres) {
  const titre = titres[j];
  const {item_id, xid, yp, name, title="*missing*", links, transcription, restricted} = titre;

  if (!titre.aka || (titre.aka.length<1)) {
    notice(`j:${j} titre:${JSON.stringify(titre)}`);
    mCount++;
    notice (`mapp_index_byMarques =>fatal title without  xid:${xid} ${mCount}/${j}`);
    continue;
  }
  //notice(JSON.stringify(titre.aka));

  const aka = titre.aka.map(ti=>(ti.trim())).filter(ti=>(ti.length>0)); // FIX.

  aka.forEach((cname)=>{
    if (cname.length<1) throw `fatal-65`;
    if (cname.trim().length<1) throw `fatal-66`;
    xi[cname] = xi[cname] || {cats:[]};

    xi[cname].cats.push({
	item_id,
  title,
	xid,
	yp,
	name,
	links,
	transcription,
	restricted
	})
  }); // each aka
}; // each article.

const colist = Object.keys(xi).map(name => ({
    name,			// constructeur-name
    articles: xi[name].cats		// list of catalogs.
}));

notice(`etime: ${new Date().getTime() - etime} ms`)
return colist;
$$ language plv8;


--select * from mapp.index_constructeurs('{"all_packages":true}'::jsonb) order by name;
--select * from mapp.index_constructeurs('{"package_id":236393}'::jsonb) order by name;
select
  title,
  data->>'xid' as xid,
  data->'isoc' as aka
from cms_articles__directory
where (data->>'sec' != '3')
limit 100;



select * from mapp.index_constructeurs('{"all_packages":true}'::jsonb) order by name;
