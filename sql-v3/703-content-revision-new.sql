

create or replace function content_revision__new(o jsonb) returns jsonb as
$$

  function notice(x) {plv8.elog(NOTICE,x);}

  if (!o.item_id) {
    o.error = 'Missing item_id';
    return o
  }

  const nitems = plv8.execute("select count(*) as nitems from cr_items where item_id = $1",o.item_id)[0].nitems;
  // plv8.elog(INFO, 'nitems:'+nitems);
  if (nitems != 1) {
    o.err = 'Unable to find cr_item';
    o.nitems = nitems;
    return o
  }


  const p = [
    o.title,                // 1: character varying,
    o.description,          // 2: text,
    o.publish_date, 	    // 3: timestamp with time zone,
    o.mime_type,            // 4: character varying,
    o.nls_language,         // 5: character varying,
    o.text,                 // 6: character varying,
    o.item_id,              // 7: integer,
    o.revision_id,          // 8: integer,
    o.creation_date,        // 9: timestamp with time zone,
    o.creation_user,        // 10: integer,
    o.creation_ip,          // 11: character varying,
    o.content_length,       // 12: integer,
    o.package_id            // 13: defaults to package_id from item_id
  ]

//notice(JSON.stringify(o));

//  const item_id = plv8.find_function("content_item__new")(p);
  const v = plv8.execute("select content_revision__new($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)",p);
//notice(JSON.stringify(v[0]));
  o.content_revision__new = v[0].content_revision__new;
  o.revision_id = v[0].content_revision__new;

  if (o.is_live) {
    const p2 = [
      o.content_revision__new,  // 1: revision_id
      o.status || 'ready',	// 2: status
      o.publish_date || new Date(),  // 3: publish_date
      o.is_latest               // 4: is_latest boolean (false)
    ];
    plv8.execute("select content_item__set_live_revision($1,$2,$3,$4)",p2);
  }


  return o;
$$
  LANGUAGE plv8;


--delete from acs_objects where object_id > 7175;
--select * from content_item__new('{"name":"soc-xid-12391","parent_id":7171, "package_id":7169,"text":"hello dolly is LIVE","is_live":true}');

select * from content_revision__new('{"item_id":7376, "description":"revision #7", "text":"hello dolly new revision", "is_live":true}');



select * from content_revision__new('{"item_id":7308, "description":"revision #6", "text":"hello dolly new revision", "is_live":true}');
