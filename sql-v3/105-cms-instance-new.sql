/*
    - get package_key metadata.
    - create package
    - create the root-folder
*/

drop function if exists cms_package_instance__new;
drop function if exists cms_instance__new;

/*

    MINIMAL:

    select cms_package_instance__new($1)",[{name:'museum-test', verbose:1}])

*/

create or replace function cms_instance__new(o jsonb)
  returns jsonb as
$$
// check if package_type exists.
const package_md = (plv8.execute('select * from apm_package_types where package_key = $1',['cms'])[0]);

if (!package_md) {
  if (o.verbose >0) plv8.elog(INFO, 'package_key "cms" not found.')
//    plv8.find_function('cms_package_type__create')(o);
  throw 'fatal-22'
}

if (o.verbose >0)
  plv8.elog(INFO, 'package_key "cms" found :',JSON.stringify(package_md))

/*
    Check if sub-folders exists. (metadata)
*/


// here, we can create the instance.

 var package_id = null;
 const object_type = 'apm_package';

//select apm_package__new(null,'museum','museum','apm_package',null,null,null,null)
const query = 'select apm_package__new($1,$2,$3,$4,$5,$6,$7,$8) as package_id';

const retv = plv8.execute(query,[
 o.package_id || null,
 o.instance_name,
 'cms',
 object_type,
 o.creation_date || null,
 o.creation_user || null,
 o.creation_ip || null,
 o.context_id || null,
])[0];

package_id = retv.package_id;

if (o.verbose >0) {
  plv8.elog(INFO, 'apm_package__new package_id=>', retv.package_id);
}

/*
    create root folder for this package instance.
*/

const root_folder_id = plv8.execute("select content_folder__new($1,$2,$3,$4,$5)",
  [
  'cms-'+package_id,              // name
  o.name,                         // label
  'CMS root folder for '+o.name,  // description
	-100,                           // parent_id
	package_id
  ]
)[0].content_folder__new;


const pfolder_id = plv8.execute("select content_folder__new($1,$2,$3,$4,$5)",
  [
  'publishers',         // 1: name
  'Publishers '+o.name,                    // 2: label
  'CMS Publishers sub-folder',     // 3: description
	root_folder_id,                  // 4: parent_id
	package_id                       // 5: packag_id
  ]
)[0].content_folder__new;

const afolder_id = plv8.execute("select content_folder__new($1,$2,$3,$4,$5)",
  [
  'authors',         // 1: name
  'Authors '+o.name,                    // 2: label
  'CMS Authors sub-folder',     // 3: description
	root_folder_id,               // 4: parent_id
	package_id                    // 5: packag_id
  ]
)[0].content_folder__new;



retv.root_folder_id = root_folder_id;
retv.pfolder_id = pfolder_id;
retv.afolder_id = afolder_id;

if (o.verbose >0) {
  plv8.elog(INFO, 'content_folder__new =>', JSON.stringify(retv));
}



return retv;
$$
LANGUAGE plv8;


select cms_instance__new('{"name":"museum-test"}');

select * from cms_folders;


/*
\if :iname
do $$ begin end $$;
\endif
*/
