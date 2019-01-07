const assert = require('assert');
const hash = require('object-hash');

function uploadOne_author(ctx, it) {
  const {db, package_id, folder_id} = ctx;
  assert db;
  assert(folder_id)
  assert(package_id)
  assert(it)
//    assert(it.data)

  if (!it.author_name) {
    console.log(it);
    throw 'fatal-455'
  }

  return new Promise((resolve, reject) => {
    const find_author = `
      select r.revision_id, i.item_id, title,
        checksum
      from cr_revisions r, cms_authors a, cr_items i
      where parent_id = $(parent_id)
      and name = $(item_name)
      and (r.revision_id = latest_revision)
      and (a.author_id = r.revision_id)
      `;
    db.query(find_author, {parent_id:a_folder_id, item_name: it.author_name},
      {single:false}
    )
    .then(async revisions =>{
//        console.log('revisions:',revisions)
      if (revisions.length !=1) {
        assert (revisions.length ==0);
        console.log(`New author: <${it.author_name}>`);
        const {data} = await cms_author__new(it);
        console.log('New author/item data.content_item__new:',data.content_item__new)
        resolve(data);
      }
      else {
        const {item_id, revision_id, title, checksum} = revisions[0];
        // console.log(`found author <${it.author_name}> at revision:${revision_id}`,)
        if (!(item_id && revision_id && title && checksum)) {
          console.log(`author:`,revisions[0])
//            throw 'fatal-491';
        }
//          it.item_id = item_id;
//          it.title = `author::${it.data.author_name}`;
//          it.description = `author::${it.data.author_name}`;
        const data = await cms_author__new_revision(item_id, checksum, it);
        /*
        if (!data) {
          //            console.log(`latest author revision for ${it.data.author_name} up-to-date. Nothing to do.`)
        }
        else
          console.log('New author/revision data:',data)
          */

        resolve(data);
      }
    }); // then
  }) // return promise.

  // --------------------------------------------------------------------------


  // --------------------------------------------------------------------------


module.exports = uploadOne_author;
