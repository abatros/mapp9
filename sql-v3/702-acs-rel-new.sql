drop function if exists acs_rel__new(o jsonb);

create or replace function acs_rel__new(o jsonb) returns integer as
  $$
  return plv8.execute("select acs_rel__new($1::integer,$2::varchar,$3::integer,$4::integer,$5::integer,$6::integer,$7::varchar)",[
    o.rel_id || null,
    o.rel_type,
    +o.object_id_one,
    +o.object_id_two,
    +o.context_id,
    +o.creation_user,
    o.creation_ip
  ])[0].acs_rel__new;
  $$ language plv8;
