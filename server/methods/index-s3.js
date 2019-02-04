import {db, package_id, _assert} from '../cms-server.js'

Meteor.methods({
  'index-s3': (cmd)=>{
    const etime = new Date().getTime();
    const query = `-- index-s3
select
--   latest_revision,
--   title,
--   item_id,
   data->'indexNames' as inames,
   data->'auteurs' as auteurs,
   data->'links' as links,
   data->>'yp' as yp,
   (data->>'transcription')::boolean as transcription,
   (data->>'restricted')::boolean as restricted,
   data->>'xid' as xid
from cms_articles__directory
where (data->>'sec' = '3')
--and (data->>'titles' is not null)
and (package_id = ${package_id})
`;

    return db.query(query,[],{single:false})
    .then(retv =>{
      console.log(`index-s3 =>${retv.length} rows in ${new Date().getTime()-etime} ms.`)
      return retv
    })
    .catch(err=>{
      console.log(`index-s3 err:`,err)
      return {
        error:err.message
      }
    })
  }

})
