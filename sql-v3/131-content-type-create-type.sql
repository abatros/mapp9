

create or replace function content_type__create_type(o jsonb) returns jsonb as
$$

//plv8.elog(NOTICE, `dkz::entering content_type__create_type o:${JSON.stringify(o)}`);
try {
const query = 'select content_type__create_type($1,$2,$3,$4,$5,$6,$7)';
const retv = plv8.execute(query,
[
  o.content_type,
  o.super_type,
  o.pretty_name,
  o.pretty_plural,
  o.table_name,
  o.id_column,
  o.name_method
]);
plv8.elog(NOTICE, `dkz::content_type__create_type <${o.content_type}> retv:${JSON.stringify(retv)}`);
return o;
}
catch(err) {
  return Object.assign(o,{
    error: err
  })
//  return {
//    error: err
//  }
}
$$ language plv8;

do $$
return
const retv = plv8.execute(`select content_type__drop_type('pdf_page',true,true)`);
plv8.elog(NOTICE, `Drop (pdf_page) \n=>retv:${JSON.stringify(retv)}`);
$$ language plv8;


do $$
return
const retv = plv8.execute(`select content_type__drop_type('pdf_file',true,true)`);
plv8.elog(NOTICE, `Drop (pdf_file) \n=>retv:${JSON.stringify(retv)}`);
$$ language plv8;


do $$
const o = {
  content_type: 'pdf_file',
  super_type: 'content_revision',
  pretty_name: 'PDF-file',
  pretty_plural: 'PDF-files',
//  table_name: null,
//  id_column: null,
//  name_method: null
}
const retv = plv8.execute(`select content_type__create_type($1)`,[o])[0].content_type__create_type;
//plv8.elog(NOTICE, `dkz(test) ${JSON.stringify(retv)}`);
if (retv.error) {
  plv8.elog(NOTICE, `dkz(test) err:${JSON.stringify(retv.error)}`);
  plv8.elog(NOTICE, `\n\nerror.detail:${retv.error.detail}`);
} else {
  plv8.elog(NOTICE, `dkz::content_type__create_type (${o.content_type}) =>\nretv:${JSON.stringify(retv)}`);
}
$$ language plv8;


do $$
const o = {
  content_type: 'pdf_page',
  super_type: 'content_revision',
  pretty_name: 'PDF-page',
  pretty_plural: 'PDF-pages',
//  table_name: null,
//  id_column: null,
//  name_method: null
}
const retv = plv8.execute(`select content_type__create_type($1)`,[o])[0].content_type__create_type;
//plv8.elog(NOTICE, `dkz(test) ${JSON.stringify(retv)}`);
if (retv.error) {
  plv8.elog(NOTICE, `dkz(test) err:${JSON.stringify(retv.error)}`);
  plv8.elog(NOTICE, `\n\nerror.detail:${retv.error.detail}`);
} else {
  plv8.elog(NOTICE, `dkz::content_type__create_type (${o.content_type}) =>\nretv:${JSON.stringify(retv)}`);
}
$$ language plv8;
