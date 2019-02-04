-- drop function if exists publisher__new ();

create or replace function cms_publisher__new (o jsonb) returns jsonb
as $$

  function notice(x) {plv8.elog(NOTICE,x);}

  //  -- name (unique) => title (unique) by nor_au2().

  //notice(`cms_publisher__new:${JSON.stringify(o)}`)

  const v = ['select * from cms_publishers__directory'];
  if (o.package_id) {
    v.push(`where (package_id = ${o.package_id})`)
  } else if (o.parent_id) {
    v.push(`where (parent_id = ${o.parent_id})`)
  } else {
    o.error = 'Missing parameters - package_id or parent_id must be declared - EXIT.';
    return o;
  }

  if (o.name) {
    v.push(`and (name = '${o.name}')`)
  } else if (o.title) {
    v.push(`and (title = '${o.title}')`)
  } else {
    o.error = `Missing parameters - 'name' or 'title' must be declared - EXIT.`;
    return o;
  }

  const query = v.join('\n');
  const retv = plv8.execute(query);
  notice(`cms_publisher__new retv1:${JSON.stringify(retv)}`);
  if (retv.length >0) {
    notice(`cms_publisher__new [Publisher already exists.] =>found ${JSON.stringify(retv)}`)
    notice(`cms_publisher__new [query] =>${query}`)
    retv[0].error = `Publisher already exists. check query.`
    retv[0].query = query;
    return retv[0]
  }

  if (!o.title || !o.name) {
    // prevent create a publisher without name or title.
    if (!o.name) notice(`cms_publisher__new: Missing name`);
    if (!o.title) notice(`cms_publisher__new: Missing title`);
    throw `cms_publisher__new: must have 'title' and 'name' - EXIT.`;
  }
 
  o.item_subtype = 'cms-publisher';

  const retv2 = plv8.execute(`select cms_publisher__new_ ($1)`,[o]);
  return retv2;
end;$$
language 'plv8';

-- select cms_publisher__new('{"name":"po4l2i3t2usan2ex", "package_id":236393}');
-- delete from acs_objects where (object_id = 386656);
--select cms_publisher__new('{"name":"po4l2i3t2usan2ex", "package_id":236393, "parent_id":236394}');
select cms_publisher__new('{"name":"po4l2i3t2usan2ex", "title":"my-title", "package_id":236393, "parent_id":236394}');

