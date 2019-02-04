

create or replace function cms_revision__new(o jsonb) returns jsonb as
$$

  function notice(x) {plv8.elog(NOTICE,x);}
  
  const {
    title,                // 1: character varying,
    description,          // 2: text,
    publish_date, 	  // 3: timestamp with time zone,
    mime_type,            // 4: character varying,
    nls_language,         // 5: character varying,
    text,                 // 6: character varying,
    item_id,              // 7: integer,
    revision_id,          // 8: integer,
    creation_date,        // 9: timestamp with time zone,
    creation_user,        // 10: integer,
    creation_ip,          // 11: character varying,
    content_length,       // 12: integer,
//    package_id            // 13: defaults to package_id from item_id
  } = o;

  let package_id = o.package_id; // set later by query on item_id.
  o.creation_date = creation_date || new Date();
  o.jsonb_data = o.jsonb_data || {};
  o.checksum = o.checksum || 'xxxxxxxxxxxxxxxx';
  
  if (!item_id) o.error = 'Missing item_id';
  if (!title) o.error = 'Missing title';

  if (o.error) {
    if (o.verbose) {
      notice(`cms_revision__new -- Missing title.`)
    }
    o.latest_revision = undefined;
    return o;
  }

  const items = plv8.execute(`
  select package_id
  from cr_items
  join acs_objects on (object_id = item_id)
  where item_id = $1
  `,[item_id]);

  //notice(`items.length:${items.length}`);
  if (items.length != 1) {
    o.error = `found ${items.length} items for item_id:${item_id}`;
	if (o.verbose) {
	  notice(`cms_revision__new -- ${o.error}`)
	}
    return o;
  }

  if (package_id && items[0].package_id != package_id) {
	o.error = `requested o.package_id:${package_id} conflicts with item.package_id:${items[0].package_id}`;
	if (o.verbose) {
	  notice(`cms_revision__new -- ${o.error}`)
	}
	return o;
  }

  package_id = items[0].package_id;
  if (!package_id) {
	o.error = 'Unable to identify package_id';
	if (o.verbose) {
	  notice(`cms_revision__new -- ${o.error}`)
	}
	return o;
  }

  const p = [
    title,                // 1: character varying,
    description,          // 2: text,
    publish_date, 	    // 3: timestamp with time zone,
    mime_type,            // 4: character varying,
    nls_language,         // 5: character varying,
    text,                 // 6: character varying,
    item_id,              // 7: integer,
    revision_id,          // 8: integer,
    creation_date,        // 9: timestamp with time zone,
    creation_user,        // 10: integer,
    creation_ip,          // 11: character varying,
    content_length,       // 12: integer,
    package_id            // 13: defaults to package_id from item_id
  ];

  //notice(JSON.stringify(o));

  const retv = plv8.execute("select content_revision__new($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)",p);
  notice(`cms_revision__new (item_id:${item_id}) => new_revision: ${retv[0].content_revision__new}`);
  o.latest_revision = retv[0].content_revision__new;

  /*
	update checksum and data (from jsonb_data).
  */

  /*
  const query = `
   update cr_revisions 
   set checksum = '${o.checksum}', data = '${JSON.stringify(o.jsonb_data)}'::jsonb
   where revision_id = ${o.latest_revision};
  `;
  notice(query);
  */
  
  const retv2 = plv8.execute(`
   update cr_revisions 
   set checksum = $1, data = $2
   where revision_id = $3;
  `,[o.checksum, JSON.stringify(o.jsonb_data), o.latest_revision]);

  if (retv2 != 1) {
  notice('ALERT retv2:'+JSON.stringify(retv2));
  }

  /*
	Make-it live if requested.
  */

  if (o.is_live) {
    const p2 = [
      o.latest_revision,  		// 1: revision_id
      o.status || 'ready',		// 2: status
      o.publish_date || new Date(),  	// 3: publish_date
      o.is_latest               	// 4: is_latest boolean (false)
    ];
    plv8.execute("select content_item__set_live_revision($1,$2,$3,$4)",p2);
  }


  return o;
$$
  LANGUAGE plv8;


--delete from acs_objects where object_id > 7175;
--select * from content_item__new('{"name":"soc-xid-12391","parent_id":7171, "package_id":7169,"text":"hello dolly is LIVE","is_live":true}');

--select * from cms_revision__new('{"item_id":349192, "title":"tartempion the publisher", "description":"revision #7", "is_live":true, "verbose":1}');
--select * from cms_revision__new('{"item_id":7308, "title":"revision#6", "description":"revision #6", "text":"hello dolly new revision", "is_live":true}');
