drop function if exists cms_author__new;

do $$
plv8.elog(NOTICE, 'Setting functions for authors.');
$$ language plv8;


create or replace function cms_author__new (o jsonb) returns jsonb
as $$
declare o2 jsonb;
declare new_revision_id integer;
declare author_id integer;

begin
--  if (o->>'verbose') {
    raise NOTICE 'cms_author__new(%):',o;
--  }

  o := o || jsonb_build_object('item_subtype','cms-author');

  select content_item__new(o) into o2;

  raise NOTICE 'cms_author__new =>%', o2;

  author_id := o2->>'item_id';
  raise NOTICE 'author_id:%', author_id;
  new_revision_id := o2->>'revision_id';

  /*
      raise NOTICE 'new author:%', o2;
      Here, we have cr_item and cr_revision for this new author.
      We need to store xid checksum and and payload.... LATER
      Also create entry for this author.
  */

  update cr_revisions set checksum = o->>'checksum', data = o->'jsonb_data'
  where revision_id = new_revision_id;


  -- raise notice 'o2:%',o2; -- NOTICE:  {"content_item__new":89212}

  insert into cms_authors (author_id) -- revisions
  values (new_revision_id);

  o2 := o2 || jsonb_build_object('author_id',author_id);
  -- raise notice 'o2:%',o2;

  return o2;
end;$$
language 'plpgsql';
