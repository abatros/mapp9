
create or replace function content_folder__new(o jsonb) returns jsonb as
$$
const errors = [];
if (!o.parent_id) errors.push('Missing parent_id');
if (!o.package_id) errors.push('Missing package_id');
if (!o.name) errors.push('Missing name (unique)');
if (errors.length>0) {
  return Object.assign(o,{errors, error:'Missing parameters - see errors:[]'})
}

o.label = o.label || o.title || o.name; // default.

const {name, label, description, parent_id, package_id} = o;

/*
    should be 11 parameters.
*/
//try {
const v = plv8.execute(`
	--- v2
	select content_folder__new($1,$2,$3,$4,$5)
	`,[
  name,               // 1: varchar unique(parent_id)
  label,              // 2: varchar
  description,        // 3: text
  parent_id,          // 4: references cr_items
  package_id          // 5: references apm_packages
], {single:true});

o.folder_id = v.content_folder__new;

if (!o.folder_id) {
  o.error = 'Unable to get a folder_id';
  plv8.elog(NOTICE, `retv:${JSON.stringify(v)}`)
  throw o;
}
//}

//catch (err) {
//  plv8.elog(NOTICE, `err:${JSON.stringify(err)}`)
//}

return o;
$$ language plv8;
