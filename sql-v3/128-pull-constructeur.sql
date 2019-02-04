drop function if exists mapp.pull_constructeur;


create or replace function mapp.pull_constructeur(cmd jsonb) returns jsonb as
$$
const query = `
SELECT p.title, p.item_id, 
	array_agg(jsonb_build_object(
		'item_id', a.item_id,
		'latest_revision', a.latest_revision,
		'yp', a.data->>'yp',
		'title', a.title
		)) as catalogs      
--	array_agg(row(a)) as catalogs        
FROM cms_publishers__directory p
LEFT JOIN cms_articles__directory a ON a.parent_id = p.item_id
where (p.item_id = $1)
GROUP BY p.title, p.item_id
`;

const data = plv8.execute(query, [cmd.item_id])[0];
plv8.elog(NOTICE, JSON.stringify(data));
return data;
$$ language plv8;


/*
do $$
const constructeur = plv8.execute(`select mapp.pull_constructeur('{"item_id":345051}')`)[0].pull_constructeur;
if (!constructeur || constructeur.length <=0) {
	throw `NO DATA FOUND for item_id:${345052}`
}
plv8.elog(NOTICE, JSON.stringify(constructeur));
plv8.elog(NOTICE, `title:<${constructeur.title}>`);
Object.keys(constructeur).forEach(p=>{
	plv8.elog(NOTICE, `\t${p}:<${constructeur[p]}>`);
})

constructeur.catalogs.forEach(cc=>{
	plv8.elog(NOTICE, `\t${JSON.stringify(cc)}`);
})
$$ language plv8;
*/


create or replace function mapp.pull_constructeur(cmd jsonb) returns jsonb as
$$
const query = `
  select * 
  from cms_articles__directory a
  where a.parent_id = $1
  order by a.data->'yp';
`;

const articles = plv8.execute(query, [cmd.item_id]);
plv8.elog(NOTICE, `articles:${JSON.stringify(articles)}`);

const constructeur = plv8.execute(`select * from cms_publishers__directory where item_id = $1`, [cmd.item_id])[0];
plv8.elog(NOTICE, JSON.stringify(constructeur));

return {
  constructeur,
  articles
}
$$ language plv8;

do $$
const retv = plv8.execute(`select mapp.pull_constructeur('{"item_id":345051}')`)[0].pull_constructeur;
plv8.elog(NOTICE, JSON.stringify(retv.constructeur));
retv.articles.forEach(cc =>{
	plv8.elog(NOTICE, `- ${JSON.stringify(cc)}`);
})
$$ language plv8;

