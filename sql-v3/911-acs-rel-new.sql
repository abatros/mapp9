-- Function: public.acs_rel__new(integer, character varying, integer, integer, integer, integer, character varying)

-- DROP FUNCTION public.acs_rel__new(integer, character varying, integer, integer, integer, integer, character varying);

CREATE OR REPLACE FUNCTION public.acs_rel__new(
    new__rel_id integer,
    new__rel_type character varying,
    new__object_id_one integer,
    new__object_id_two integer,
    context_id integer,
    creation_user integer,
    creation_ip character varying)
  RETURNS integer AS
$BODY$
DECLARE
  v_rel_id               acs_rels.rel_id%TYPE;
BEGIN
    v_rel_id := acs_object__new (
      new__rel_id,
      new__rel_type,
      now(),
      creation_user,
      creation_ip,
      context_id,
      't',
      new__rel_type || ': ' || new__object_id_one || ' - ' || new__object_id_two,
      null
    );

    insert into acs_rels
     (rel_id, rel_type, object_id_one, object_id_two)
    values
     (v_rel_id, new__rel_type, new__object_id_one, new__object_id_two);

    return v_rel_id;

END;
$BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
ALTER FUNCTION public.acs_rel__new(integer, character varying, integer, integer, integer, integer, character varying)
  OWNER TO postgres;
