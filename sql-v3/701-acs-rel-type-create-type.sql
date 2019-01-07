-- drop function if exists acs_rel_type__create_type;

/*
  rel_type varchar,
  pretty_name character varying,
  pretty_plural character varying,
  supertype character varying,
  table_name character varying,
  id_column character varying,
  package_name character varying,
  object_type_one character varying,
  role_one character varying,
  min_n_rels_one integer,
  max_n_rels_one integer,
  object_type_two character varying,
  role_two character varying,
  min_n_rels_two integer,
  max_n_rels_two integer,
  composable_p boolean DEFAULT true)
*/


create or replace function acs_rel_type__create_type(o jsonb) returns jsonb as
  $$
  const params = [
  'rel_type varchar',
  'pretty_name varchar',
  'pretty_plural varchar',
  'supertype varchar',
  'table_name varchar',
  'id_column varchar',
  'package_name varchar',
  'object_type_one varchar',
  'role_one varchar',
  'min_n_rels_one integer',
  'max_n_rels_one integer',
  'object_type_two varchar',
  'role_two varchar',
  'min_n_rels_two integer',
  'max_n_rels_two integer',
  'composable_p boolean'
  ].map(function(it,j){return '$'+(j+1)+'::'+it.split(' ')[1]}).join(',');

  //plv8.elog(NOTICE,params)

  const query = "select acs_rel_type__create_type(" + params + ")";

  if (o.composable_p == undefined) o.composable_p = true;

  const retv = plv8.execute(query,[
    o.rel_type,
    o.pretty_name || o.rel_type,
    o.pretty_plural || o.rel_type,
    o.supertype,
    o.table_name,
    o.id_column,
    o.package_name,
    o.object_type_one,
    o.role_one,
    +o.min_n_rels_one,
    +o.max_n_rels_one,
    o.object_type_two,
    o.role_two,
    +o.min_n_rels_two,
    +o.max_n_rels_two,
    o.composable_p
  ])[0].acs_rel_type__create_type;
  return {retv:retv};
  $$ language plv8;


do $$

plv8.execute("select acs_rel_type__drop_type($1,$2)",['title-author',true]);

const retv = plv8.execute("select acs_rel_type__create_type($1)",[{
  rel_type: 'title-author',
  object_type_one: 'cms-article',
  object_type_two: 'cms-author',
}])[0].acs_rel_type__create_type;

plv8.elog(NOTICE, 'retv:',JSON.stringify(retv));

if (false)
plv8.execute("select acs_rel_type__create_type($1)",[{
  rel_type: 'title-author',
  object_type_one: 'cms-article',
  object_type_two: 'cms-author',
}]);


$$ language plv8;
