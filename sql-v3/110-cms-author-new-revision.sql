﻿drop function if exists cms_author__new_revision;

create or replace function cms_author__new_revision (o jsonb) returns jsonb
as $$
declare o2 jsonb;
declare new_revision_id integer;

begin
  select content_revision__new(o) into o2;
  new_revision_id := o2->>'content_revision__new';

  raise notice 'cms_author__new_revision o2:%',o2; -- NOTICE:  {"content_item__new":89212}
  raise notice 'cms_author__new_revision new_revision_id:%', new_revision_id; -- NOTICE:  {"content_item__new":89212}

  /*
      Need to update cr_revisions with:
        - data:jsonb
        - checksum.
  */

  update cr_revisions set checksum = o->>'checksum', data = o->'jsonb_data'
  where revision_id = new_revision_id;


  insert into cms_authors (author_id)
  values (new_revision_id);

  return new_revision_id;
end;$$
language 'plpgsql';

-- select * from muu__new_document('{"name":"soc-xid-19232","parent_id":7171, "package_id":7169,"text":"hello dolly is LIVE","is_live":true}');


-- delete from acs_objects where object_id >7175;
