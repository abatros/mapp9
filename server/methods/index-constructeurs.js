import {db, package_id, _assert} from '../cms-server.js'

Meteor.methods({

  'index-constructeurs': (cmd)=>{
      const etime = new Date().getTime();
      const query = `
  -- index-constructeurs
  select
     latest_revision,
     title,
     item_id,
     data->'links' as links,
     data->>'yp' as yp,
     (data->>'transcription')::boolean as transcription,
     (data->>'restricted')::boolean as restricted,
     data->>'xid' as xid,
     data->'indexNames' as indexNames,
     data->>'sec' as sec
  from cms_articles__directory
  where (data->>'sec' != '3')
  --and (data->>'titles' is not null)
  and (package_id = ${package_id})
  `;

    return db.query(query,[],{single:false})
    .then(catalogs =>{
      console.log(`index-constructeurs =>${catalogs.length} rows in ${new Date().getTime()-etime} ms.`)
      catalogs.forEach(catalog =>{
        catalog.indexNames = catalog.indexnames; catalog.indexnames = undefined;
        _assert(catalog.indexNames, catalog, 'fatal-437. Missing indexNames.')
      })
      return catalogs;
    })
    .catch(err=>{
      console.log(`index-constructeurs err:`,err)
      return {
        error: err.message
      }
    })
  },
})


/*
'index-constructeurs2': (cmd)=>{
  const etime = new Date().getTime();
  return db.query(`
    select * from mapp.index_constructeurs($1);
    `,[{package_id}],{single:false})
  .then(retv =>{
    console.log(`index-constructeurs =>${retv.length} rows in ${new Date().getTime()-etime} ms.`)
    return retv
  })
  .catch(err=>{
    console.log(`index-constructeurs err:`,err)
    return {
      error:err.message
    }
  })
},

*/
