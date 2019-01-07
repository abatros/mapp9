/*
do $$
//this.dang = function() {plv8.elog(NOTICE,'ding-dang')}
$$ language plv8;
*/

create or replace function cms_update_title(cmd jsonb) returns jsonb as
$$

/*
    notice(arguments) {

    }

*/

var notice = function() {
  var args = Array.prototype.slice.call(arguments);
  args = [NOTICE].concat(args);
  plv8.elog.apply(null,args);
}

var info = function() {
  var args = Array.prototype.slice.call(arguments);
  plv8.elog.apply(null, [INFO].concat(args));
}


if (!cmd.verbose) {
  notice = function(){};
  info = function(){};
}

if (!cmd.item_id || (!cmd.name && !cmd.title)) {
  plv8.elog(WARNING, 'cmd:', JSON.stringify(cmd))
  return {
    status:'failed',
    message: 'Missing parameters in cmd.'
  }
}

var retv;

const cr_item = plv8.execute('select i.item_id, name, title, latest_revision from cr_items i, cr_revisions r where (i.item_id = $1) and (r.revision_id = i.latest_revision)',[cmd.item_id])[0];
notice('item:', JSON.stringify(cr_item))

if (cmd.name && cmd.name != cr_item.name) {
  /*
        try the new name : It could fail if (parent_id, new-name) not unique
  */
  // const parent_id = cr_item.parent_id;
//  retv= plv8.execute("update cr_items set name = $2 where item_id = $1",[cmd.item_id,cmd.name]);
  try {
    retv= plv8.execute("select content_item__edit_name($1,$2)",[cmd.item_id,cmd.name]);
    notice('update-name retv:', JSON.stringify(retv))
  } catch (e) {
    notice( 'update-name err:', JSON.stringify(e))
    notice( 'COLLISION WITH ANOTHER CR_ITEM.NAME =>', cmd.name);
//    cmd.name = cr_item.name; // to avoid update on name in next step.
  }
}


  /*
        ALWAYS CHANGE DATA because either name or title => checksum change.
        the caller must set the checksum....
        Create a new Revision with this new title and/or name.
  */
  // should be done earlier....... SAVE 1 step.

  retv = plv8.execute('select * from cr_revisions where (revision_id = $1)',[cr_item.latest_revision])[0];
  notice( 'update-title retv1:', JSON.stringify(retv))

  retv.revision_id = undefined;

  const data = retv.data;
  if (cmd.title) {
    data.title = cmd.title;
    retv.title = cmd.title;
    }
  //retv.checksum = cmd.checksum;

  retv = plv8.execute('select content_revision__new($1)',[retv])[0];
  notice( 'update-title retv2:', JSON.stringify(retv))
  const new_revision_id = retv.content_revision__new.content_revision__new;
  notice( 'new_revision_id:', JSON.stringify(new_revision_id));
  notice( 'data:', JSON.stringify(data));
  retv = plv8.execute('update cr_revisions set data = $2, checksum = $3 where (revision_id = $1)',[new_revision_id, data, cmd.checksum]);
//  retv = plv8.execute('update cr_revisions set data = $(data) where revision_id = $(id)',{id:new_revision_id, data:data});
  notice( 'update-title retv3:', JSON.stringify(retv))

  return {
    status:'ok'
  }
$$ language plv8;

select cms_update_title('{"verbose":0,"item_id":241143, "name":"Ateliers de Charleroi", "title":"Ateliers de Construction Electriques", "checksum":"xxxxxxxxxxxxxxxxxxx"}');
