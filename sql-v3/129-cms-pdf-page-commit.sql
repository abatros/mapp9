/*
      - each page is stored in table 'txt' fti:tsvector
      - a new column data:jsonb is added to store raw-data, and other infos (keywords to be displayed)
      - (data.url) and (data.pageNo) are extra infos for quick build on indexes and reports
      - data.content_type = 'pdf-page'
      - each page is linked to a specific cr_item.revision (txt.object_id = revision_id)
      - Operations: we try to match a subset (package_id) of txt-rows, then report results, then we can look at an item in particular.
      - A pdf_file.revision will have npages txt-row.
      - fti:tsvector will be updated using a trigger, that check changes in data.raw_text
      - that trigger will operate only if data.content_type == 'pdf-page'
      - Also data.lang is used to select the appropriate lexeme.
*/


-- alter table txt add column data jsonb;


create or replace function cms.pdf_page_tsvector_update()
  returns trigger as
$body$
begin
	raise NOTICE '(%) TRIGGER object_id:% data:%',tg_op,new.object_id,new.data;

    if tg_op = 'INSERT' then
	raise NOTICE 'TRIGGER entering insert:%',new.data->>'raw_text';
        new.fti = to_tsvector('pg_catalog.french', coalesce(new.data->>'raw_text', ''));
	raise NOTICE 'TRIGGER entering insert new.fti:%',new.fti;
    end if;
    if tg_op = 'UPDATE' then
	raise NOTICE 'TRIGGER entering update old raw_text:%',old.data->>'raw_text';
	raise NOTICE 'TRIGGER entering update new raw_text:%',new.data->>'raw_text';

        --if new.data->>'raw_test' != old.data->>'raw_test' then
            new.fti = to_tsvector('pg_catalog.french', coalesce(new.data->>'raw_text', ''));
	raise NOTICE 'TRIGGER leaving update:%',new.data->>'raw_text';
	raise NOTICE 'TRIGGER leaving update new.fti:%',new.fti;
        -- end if;
    end if;
raise NOTICE 'TRIGGER leaving:(%)%',tg_op,new.data->>'raw_text';
raise NOTICE 'TRIGGER leaving:(%) fti:%',tg_op,new.fti;
    return new;
end
$body$
language plpgsql;

drop trigger if exists txt_insert on txt;
drop trigger if exists txt_update on txt;

create trigger txt_insert before insert on txt
for each row
execute procedure cms.pdf_page_tsvector_update();

create trigger txt_update before update on txt
for each row
when (OLD.data->>'raw_text' is distinct from NEW.data->>'raw_text')
execute procedure cms.pdf_page_tsvector_update();

-------------------------------------------------------------------------------------

create or replace function cms.pdf_page__commit(o jsonb) returns jsonb as
$$

plv8.elog(NOTICE, `Entering cms.pdf_page__commit (${o.object_id})`)

const errors = [];
const object_id = o.object_id || o.revision_id;

if (!object_id) errors.push('Missing object_id (pdf_file.revision_id)');
if (!o.raw_text) errors.push('Missing raw_text');
if (!o.url) errors.push('Missing fileName/URL');
if (!o.pageNo) eerrors.push('Missing pageNo');

if (errors.length >0) {
  return Object.assign(o,{errors});
}

// o.revision_id = undefined;
// o.object_id = undefined;

const nrows = plv8.execute(`
  update txt
  set data = $2
  where (object_id = $1)
  and (data->>'url' = $3)
  and (data->>'pageNo' = $4)
  `, [object_id, o, o.url, o.pageNo]);

plv8.elog(NOTICE, `Leaving cms.pdf_page__update =>${nrows} changed.`)
if (nrows<=0) {
	plv8.elog(NOTICE, `Going INSERT mode`)
	plv8.execute(`
		insert into txt (object_id, data) values ($1,$2)`,[object_id, o]);
} else if (nrows>1) {
	plv8.execute(`
	with u as (select distinct on (data->>'url',data->>'pageNo') *, ctid from txt)
	delete from txt
	where (object_id = $1)
	and txt.ctid not in (select ctid from u)
	-- should we restrict to this.object_id
	`,[object_id])
}

o.raw_text = undefined;
return o;


$$ language plv8;

/*
DELETE
FROM txt x
USING txt b
WHERE
    x.object_id = b.object_id
AND (x.data->>'url' = b.data->>'url')
and (x.data->>'pageNo' = b.data->>'pageNo');
*/

--delete from txt;

/*
select cms.pdf_page__new('{"revision_id":568833, "url":"test.pdf", "pageNo":1, "raw_text":"Hello Dolly"}');
select cms.pdf_page__update('{"revision_id":568833, "url":"test.pdf", "pageNo":2, "raw_text":"Hello Jules"}');
select cms.pdf_page__commit('{"revision_id":568833, "url":"test.pdf", "pageNo":90, "raw_text":"Hello Julie-90"}');
select cms.pdf_page__commit('{"revision_id":568833, "url":"test.pdf", "pageNo":89, "raw_text":"Hello yaya-89"}');
select cms.pdf_page__commit('{"revision_id":568833, "url":"test.pdf", "pageNo":92, "raw_text":"Hello yaya Ninetytwo"}');
select * from txt
order by data->>'url', data->>'pageNo';
*/
