drop function if exists mapp_index_auteurs;
drop function if exists mapp.index_auteurs;

drop type mapp.index_auteurs;
create type mapp.index_auteurs as (
    name text,
    articles jsonb[]
	);

create or replace function mapp.index_auteurs(cmd jsonb)
returns setof mapp.index_auteurs
as $$
const etime = new Date().getTime();

function notice(x) {plv8.elog(NOTICE,x)}

const query =`
select
   latest_revision,
   title,
   item_id,
   data->>'yp' as yp,
   data->'links' as links,
   data->>'xid' as xid,
   data->>'sec' as sec,
   (data->>'transcription')::boolean as transcription,
   (data->>'restricted')::boolean as restricted,
   data->'auteurs' as auteurs,
   data->'titres' as titles
from cms_articles__directory
where (data->>'sec' = '3')
and (data->>'auteurs' is not null)
`;

if (!cmd.package_id && !cmd.all_packages) {
  cmd.error = `[mapp.index_auteurs] Invalid cmd - Missing cmd.package_id`;
  notice(cmd.error);
  return cmd;
}

var titres;
if (cmd.package_id) {
  titres = plv8.execute(query + `and (package_id = $1);`, [cmd.package_id])
} else {
  titres = plv8.execute(query, []);
}

const auteurs = {}
let mCount = 0;
for (const j in titres) {
  const titre = titres[j];
  const {revision_id, item_id, xid, yp, name, title="*missing*", links, transcription, restricted} = titre;
  const aux = titre.auteurs.map(au=>(au.trim())).filter(au=>(au.length>0)); // FIX.

  if (!aux || (aux.length<1)) {
    notice(`j:${j} titre:${JSON.stringify(titre)}`);
    mCount++;
    notice (`mapp.index-auteurs =>fatal title without auteur xid:${xid} ${mCount}/${j}`);
    continue;
  }

  aux.forEach((au)=>{
    if (au.length<1) throw `fatal-65`;
    if (au.trim().length<1) throw `fatal-66`;
    auteurs[au] = auteurs[au] || [];

    auteurs[au].push({
//      revision_id,
	    item_id,
//	    title,
	    xid,
	    yp,
//	    name,
	    links,
	  title: titre.titles && titre.titles[0],
	    transcription,
	    restricted
	  })
  }); // each auteur.
}; // each titre.


const alist = Object.keys(auteurs).map(au => ({
    name: au,
    articles: auteurs[au]	// list of catalogs.
}));

notice(`etime: ${new Date().getTime() - etime} ms`)
return alist;

$$ language plv8;

select * from mapp.index_auteurs('{"all_packages":true}') order by name limit 100;
select * from mapp.index_auteurs('{"package_id":236393}'::jsonb) order by name --limit 100;
