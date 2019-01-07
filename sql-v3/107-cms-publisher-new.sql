drop function if exists publisher__new ();

do $$
plv8.elog(NOTICE, 'Setting functions for publishers.');
$$ language plv8;


create or replace function cms_publisher__new (o jsonb) returns jsonb
as $$
declare o2 jsonb;
declare new_revision_id integer;
declare publisher_id integer;

begin
--  if (o->>'verbose') {
    raise NOTICE 'cms_publisher__new(%):',o;
--  }

  o := o || jsonb_build_object('item_subtype','cms-publisher');

  select content_item__new(o) into o2;

  raise NOTICE 'cms_publisher__new =>%', o2;

  publisher_id := o2->>'item_id';
  raise NOTICE 'publisher_id:%', publisher_id;
  new_revision_id := o2->>'revision_id';

  /*
      raise NOTICE 'new publisher:%', o2;
      Here, we have cr_item and cr_revision for this new publisher.
      We need to store xid checksum and and payload.... LATER
      Also create entry for this publisher.
  */

  update cr_revisions set checksum = o->>'checksum', data = o->'jsonb_data'
  where revision_id = new_revision_id;


  -- raise notice 'o2:%',o2; -- NOTICE:  {"content_item__new":89212}

  insert into cms_publishers (publisher_id) -- revisions
  values (new_revision_id);

  o2 := o2 || jsonb_build_object('publisher_id',publisher_id);
  -- raise notice 'o2:%',o2;

  return o2;
end;$$
language 'plpgsql';
