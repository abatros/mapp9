CREATE OR REPLACE FUNCTION public.cms_revision__commit(o jsonb)
  RETURNS jsonb AS
$BODY$

  /*
      A cr_item can be identified either by:
        -1. cr_item.item_id
        -2. (cr_item.parent_id, cr_item.name)
  */

  const q = (!!o.item_id) + (!!o.parent_id)*2 + (!!o.name)*4;
  let w;
  let errq;

  notice(`Entering cms_revision__commit with q:${q}`)
  switch(q) {
    case 0: errq = `We need either item_id or (parent_id,name)`; break;
    case 1: break; // ok we have item_id => cr_revision__new
    case 2: errq = `Missing name item_id:${o.item_id} parent_id:${o.parent_id} name:(%{o.name})`; break;
    case 3: errq = `possible conflict on parent_id item_id:${o.item_id} parent_id:${o.parent_id} name:(%{o.name})`; break;
    case 4: errq = `Missing parent_id item_id:${o.item_id} parent_id:${o.parent_id} name:(%{o.name})`; break;
    case 5: errq = `possible conflict on name item_id:${o.item_id} parent_id:${o.parent_id} name:(%{o.name})`; break;
    case 6: break; // ok => cr_revision_new or cr_item__new
    case 7: errq = `possible conflicts item_id:${o.item_id} parent_id:${o.parent_id} name:(%{o.name})`; break;
  }

  if (o.vebose) {
    notice(`cms_revision__commit validation pass errq:${errq}`);
  }

  switch(q) {
    case 6: // (parent_id, name) and (!item_id)
    const cr_item = pull_cr_item(o.parent_id, o.name);
    if (!cr_item) {
      if (o.verbose) notice(`cms_revision__commit => create cr_item`)
      const o2 = _content_item__new(o);
      if (o.verbose) notice(`cms_revision__commit => new cr_item o2:${JSON.stringify(o2)}`)
      return o2;
      break;
    }
    o.item_id = cr_item.item_id;

    case 3: case 5: case 7:
    case 1: // item_id
    const {revision_id} = _content_revision__new(o);
    if (o.verbose) notice(`=> revision_id:${revision_id}`)
    Object.assign(o, {
      revision_id,
      data:undefined
      })
    return o;
    break;
  }


  function notice(x) {plv8.elog(NOTICE,x);}

  function pull_cr_item(parent_id, name) {
    const retv = plv8.execute(`
      select item_id, parent_id, name, publish_status, content_type, latest_revision
      from cr_items
      where (parent_id = $1)
      and (name = $2)
      `,[parent_id, name]);
    // notice(JSON.stringify(retv))
    return retv[0];
  }

  function _content_revision__new(o) {
    const retv = plv8.execute(`
      select *
      from content_revision__new($1)
      `,[o]);
    // notice(JSON.stringify(retv))
    return retv[0].content_revision__new;
  }

  function _content_item__new(o) {
    const retv = plv8.execute(`
      select *
      from content_item__new($1)
      `,[o]);
    // notice(JSON.stringify(retv))
    return retv[0].content_item__new;
  }




  /*
      if there is an item_id, it's a new Revision.
      else it's the first revision and a cr_item must be created.

      NOTE 1. if there is no change in checksum, no new revision.
      NOTE 2. cr_item change of
        name, parent, live_revision, publish_status
        do not create a new revision.
  */

  if (o.item_id) {
    if(o.verbose) {
      plv8.elog(NOTICE, `cms_revision__commit item_id:${o.item_id}`)
    }
    return plv8.find_fuction('cms_revision___new')(o)
  }

  o.content_type = o.content_type || 'content_revision';
  o.item_subtype = o.item_subtype || 'content_item';
  o.title = o.title || '*undefined title to create revision*';
  o.storage_type = o.storage_type || 'text';

  const p = [
    o.name,                 // 1: character varying,
    o.parent_id,            // 2: integer,
    o.item_id,              // 3: integer,
    o.locale,               // 4: character varying,
    o.creation_date,        // 5: timestamp with time zone,
    o.creation_user,        // 6: integer,
    o.context_id,           // 7: integer,
    o.creation_ip,          // 8: character varying,
    o.item_subtype,        	// 9: character varying,
    o.content_type,        	// 10: character varying,
    o.title,                // 11: character varying,
    o.description,          // 12: text,
    o.mime_type,            // 13: character varying,
    o.nls_language,         // 14: character varying,
    o.text,                 // 15: character varying,
    o.data,                 // 16: text,
    o.relation_tag,         // 17: character varying,
    o.is_live,              // 18: boolean,  DO NOT SET TO TRUE!
    o.storage_type,         // 19: cr_item_storage_type_enum : text,file,lob
    o.package_id,           // 20: integer DEFAULT NULL::integer,
    o.with_child_rels       // 21: boolean DEFAULT true
  ]

  // plv8.elog(INFO, JSON.stringify(o));

  const v = plv8.execute("select * from content_item__new($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)",p);
  if (v.length != 1) {
    return -1;
  }
  plv8.elog(INFO, 'item:',JSON.stringify(v));

  const item_id_ = v[0].content_item__new;
  plv8.elog(INFO, 'item_id_:', item_id_);

  const v2 = plv8.execute("select latest_revision from cr_items where (item_id = $1)",[item_id_]);
  plv8.elog(INFO, 'revision:',JSON.stringify(v2));


  o.item_id = v[0].content_item__new;
  o.revision_id = v2[0].latest_revision;
  return o;
$BODY$
  LANGUAGE plv8;

-- select cms_revision__commit('{"content_type":"cms-pdf","parent_id":278109,"title":"1195 Annales S Jacobi Leodiensis20131126.pdf","name":"another2-pdf","data":{"dirname":"/media/dkz/"},"verbose":0}')->>'revision_id'
