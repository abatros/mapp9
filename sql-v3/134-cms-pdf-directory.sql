drop view cms_pdf__directory;

CREATE OR REPLACE VIEW public.cms_pdf__directory AS 
 SELECT 
    i.item_id,
    i.name,
    i.latest_revision,
    i.parent_id,
    i.publish_status,
    i.content_type,
    r.title,
    r.checksum,
    r.data,
    o.package_id
   FROM cr_items i
     JOIN acs_objects o ON o.object_id = i.item_id
     JOIN cr_revisions r ON r.revision_id = i.latest_revision
  WHERE
    i.parent_id = 278109 
  and
    o.object_type::text = 'pdf_file'::text;

;

select count(*) from cms_pdf__directory2;

-- select parent_id from cms_pdf__directory2 limit 10;