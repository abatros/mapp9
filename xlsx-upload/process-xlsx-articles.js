const assert = require('assert');
const hash = require('object-hash');



module.exports.process_xlsx_articles = function(ctx,json) {
  const {db, package_id, main_folder, auteurs_folder, publishers_folder} = ctx;
  return new Promise(async (resolve,reject)=>{
//      const publishers = Object.entries(hp);
    // [h1,{lines,data}]
    console.log(`process_xlsx_articles count:${json.length}`)

    let sec3_count =0;

    for (const lineNo in json) {
      if (sec3_count >3) break;
      const it = json[lineNo]; // SHOULD BE A SUBSET.

      if (it.sec != 3) continue;

      if (+it.sec ==3) {
        sec3_count ++;
        /*
            - prep everything to normalize data.
            - article_name is title.
        */

        const {xid, sec, yp, pic, h1, h2, isoc, fr,en,cn, co, ci, sa, aka, links, flags, rev, ori} = it;
        if (it.sec != sec) throw 'fatal-23';

        const {auteurs, title, titles} = it;
        const title_article = `${title|'*undefined*'}::${xid}`;


        console.log(auteurs, titles)


        /*
        const retv = await uploadOne_article(ctx,{
          title_article,
          sec, yp, pic,
          h1,
          aka:isoc,
          h2,
          fr, en, zh:cn,
          co,ci,sa,
          au: aka,
          links, flags, rev, ori,
          auteurs, title, aka_titles,
          xid
        });
        */

        const o = {};
        'title, alt_titles, fr, en, zh,'
          title:null,
          alt_titles:null,
        }

        const retv = await uploadOne_article(ctx,o);


        for (const ai in auteurs) {
          const au = auteurs[ai];
          auteurs[au] = auteurs[au] || {titles:new Set(), new_titles: []}
          if (!auteurs[au].titles.has(title_article)) {
            auteurs[au].new_titles.push({
              title_article,
              item_id: retv.item_id,
              revision_id: retv.revision_id
            });
            // auteurs[au].titles.add(title_article);
          }
          // database update will be done later, when each auteur has all titles.
        }
        continue;
      }

      const retv = await uploadOne_article(ctx,
      {
        title_article,
        sec, yp, pic,
        h1,
        aka:isoc,
        h2,
        fr, en, zh:cn,
        co,ci,sa,
        au: aka,
        links, flags, rev, ori,
        auteurs, title, aka_titles,
        xid
      });
    } // loop

    console.log('process_xlsx_articles All Done!');
    resolve();
  }) // promise.
}

/*
    For articles uploaded from xlsx, name is (nor(h1)+xid)
    problem is if a new xlsx change the h1 (title) !!!!
    So, for xlsx name is 'xlsx-${xid}'
*/



function uploadOne_article(ctx, it) {

  utils.check_missing(ctx, 'db, package_id, main_folder',(missing)=>{
    if (missing) throw 'fatal-86'
  });

  const {db, package_id, main_folder} = ctx;
  const parent_id = main_folder;

  utils.check_missing(it, 'h1',(missing)=>{
    if (missing) throw 'fatal-87'
  });


  const data = Object.update({
    xid:null,
    h1:null,
    h2:null,
    sec:null,
    yp:null,
    fr:null, en:null, zh:null,
    links:null,
    auteurs:null,
    produits:null,
    addresses:null,
    co:null,
    flags:null,
//    rev:null,
    ori:null,
    titles:null, // main + alternate titles.
  },it);


  const o = {
    parent_id,
    name: `xlsx-museum-${data.xid}`,
    title: data.h1,
    data
  }

//  console.log('it:',it)
//  console.log('it=>data:',data)

  const find_article = `
    select r.revision_id, i.item_id, title, i.name,
      checksum
    from cr_revisions r, cms_articles a, cr_items i
    where parent_id = $(parent_id)
    and i.name = $(name)
    and (r.revision_id = latest_revision)
    and (a.article_id = r.revision_id)
    `;

  return new Promise((resolve, reject) => {
    db.query(find_article, o, {single:false}
    )
    .then(async cr_items =>{
      if (cr_items.length <1) {
        const retv = await cms_article__new(o);
        console.log('New Article retv=>',retv)
        resolve(retv);
      }
      else {
        assert(cr_items.length ==1)
        const {revision_id, item_id, checksum, name} = cr_items[0];
        o.item_id = item_id;
        o.checksum = checksum;
        assert(name == o.name)
        const retv = await cms_article__new_revision(o);
        return retv;
      }
    })
    .then(async retv =>{
//      console.log(`then2 check auteurs sec:${data.sec}`);
//      console.log('New revision/article retv:',retv)
      resolve(retv);
    }); // then
  }) // return promise.



  // --------------------------------------------------------------------------

  function cms_article__new(o) {

//    console.log('cms_article__new data:\n',o);
    console.log(`cms_article__new title: <${o.title}>`);

    const checksum = hash(o.data, {algorithm: 'md5', encoding: 'base64' }) // goes int cr_revision.

    Object.assign(o, {
      checksum,
      description: `initial revision for article <${o.name}>`
    })

    Object.check_list(o, 'parent_id, title, name, checksum', (missing)=>{
      if (missing) throw 'fatal-175'
    })

  //    return db.query('select content_item__new($1) as data',
    return db.query('select cms_article__new($1)',[o], {single:true})
    .then(retv=>{
      console.log(`cms_article__new retv:`,retv);
      return retv;
    })
  }

  // --------------------------------------------------------------------------

  function cms_article__new_revision(o) {

    assert (o.data)

//    o.data.title = 'BUG...hehe'
//    o.title = 'BUG...'
    const new_checksum = hash(o.data, {algorithm: 'md5', encoding: 'base64' }) // goes int cr_revision.

//    console.log(`o.checksum:${o.checksum} <=> new_checksum:${new_checksum}`);

    if (o.checksum && (o.checksum == new_checksum)) {
      //console.log('latest revision up-to-date. Nothing to do.')
      console.log(`article revision (latest) is up-to-date. Nothing to do. <${o.name}>`)
      return {
        retCode: 'Ok',
        msg: 'this article is up-to-date.',
        item_id: o.item_id,
        revision_id: o.revision_id
      };
    }

    // this does not affect o.data

    Object.assign(o, {
      description: `article revision for <${o.name}>`,
      is_live: true,
      checksum: new_checksum
    })

  //    console.log(`article__new_revision o:`,data);

    return db.query('select cms_article__new_revision($1)', [o], {single:true})
      .then(retv=>{
        console.log(`cms_article__new_revision retv:`,retv.cms_article__new_revision);
        return retv;
      })

  }

  // --------------------------------------------------------------------------

} // uploadOne_article(lineNo)
