create or replace function cms_instance__remove(o jsonb)
  returns void as
$$

/*

      CMS instances can be identified by
      - package_id (priority)
      - a folder_name (alternative)

*/

if (o.package_id) {
  // PRIORITY
  plv8.elog(NOTICE, "Removing CMS package instance <",o.package_id,'>');
  const retv1 = plv8.execute("select apm_package__delete($1)",[o.package_id])[0].apm_package__delete;
  plv8.elog(NOTICE, "Removing CMS package instance <",o.package_id,'> retv:',JSON.stringify(retv1));
  return;
}

throw 'fatal-21';

plv8.elog(NOTICE, "Removing CMS package instance <",o.name,'>');
const query = "select * from cms_instances__view where name = 'cms-root-folder-museum-test'";

const retv = plv8.execute(query);
plv8.elog(NOTICE, "retv:",retv.length);

if (!retv || retv.length <=0) {
plv8.elog(NOTICE, "instance <",o.name,"> not found. EXIT Ok.");
return;
}

if (retv.length >1) {
plv8.elog(ERROR, "MULTIPLE CMS package instances.");
return;
}

const package_id = retv[0].package_id;
if (!package_id) {
plv8.elog(ERROR, "Unable to get a package_id");
return;
}

plv8.execute("select apm_package__delete($1)",[package_id]);
$$ language plv8;


--select cms_instance__remove('{"name":"museum-test", "verbose":1}');
select cms_instance__remove('{"package_id":236357, "verbose":1}');

select * from cms_instances;
