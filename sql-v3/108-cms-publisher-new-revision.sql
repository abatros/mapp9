drop function if exists cms_publisher__new_revision;

create or replace function cms_publisher__new_revision (o jsonb) returns jsonb
as $$
declare o2 jsonb;
declare new_revision integer;

begin
  select content_revision__new(o) into o2;
  new_revision := o2->>'content_revision__new';

  raise notice 'cms_pubisher__new_revision o2:%',o2; -- NOTICE:  {"content_item__new":89212}
  raise notice 'cms_pubisher__new_revision new_revision_id:%', new_revision; -- NOTICE:  {"content_item__new":89212}

  /*
      Need to update cr_revisions with:
        - data:jsonb
        - checksum.
  */

  update cr_revisions set checksum = o->>'checksum', data = o->'jsonb_data'
  where revision_id = new_revision;

  -- Not sure we need this table... (Jan 2019).
  insert into cms_publishers (publisher_id)
  values (new_revision);

  o := o || jsonb_build_object('revision_id', new_revision);
  return o;
end;$$
language 'plpgsql';

-- select * from muu__new_document('{"name":"soc-xid-19232","parent_id":7171, "package_id":7169,"text":"hello dolly is LIVE","is_live":true}');


-- delete from acs_objects where object_id >7175;
