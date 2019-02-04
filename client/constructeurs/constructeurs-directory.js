import dkz from '../../imports/dkz-lib.js';
import {constructeurs, publishers_array, app, _assert} from '../app-client.js';

const TP = Template['constructeurs-directory'];

TP.onCreated(function(){
})

TP.onRendered(function(){
  this.find_input = this.find("#find-soc-input")
  console.log(this.find_input)
})

TP.helpers({
  iNames() {
    const v = publishers_array.get();
    console.log(`helper::indexNames:${v && v.length}`)
    if (!v) return [];
    /*  DO IT on constructeurs[item_id]
    v.forEach(p=>{
      p.display_type = (p.hidden)? 'none':'table-row';
    });
    */
    return v;
  }
});

TP.events({
  'click a.js-constructeur': (e,tp)=>{
    const item_id = e.currentTarget.getAttribute('item_id');
    console.log('click item_id:',item_id);
    const p = constructeurs[item_id];
    FlowRouter.go(`/constructeur/${item_id}-${p.title.replace(/\s+/g,'-')}`)
  }
});


TP.events({
  'input': (e,tp)=>{
    const value = e.target.value;
    const etime = new Date().getTime();
    console.log(`input target.value:`,value);

    const _value = value.toLowerCase()
    .replace(/\s+/g,'\\s+')
    .replace(/[aàáâä]/g,'[aàáâä]')
    .replace(/[eèéêë]/g,'[eèéêë]')
    .replace(/[iìíîï]/g,'[iìíîï]')
    .replace(/[oòóôö]/g,'[oòóôö]')

    // ------------------------------------------
    if (!value || value.length<=2) { // reset to visible.
      console.log('reset to visible')
      for (j in constructeurs) {
        if (constructeurs[j].dirty || (constructeurs[j].hidden == true)) {
          // restore
          constructeurs[j].hidden = false;
//          authors[j].display_type = 'table-row';
          const y = Object.assign({},constructeurs[j]);
          publishers_array.set(j,y)
          constructeurs[j].dirty = false;
        }
      }
      return;
    }
    // ------------------------------------------

    const re = new RegExp(_value,'i')
    for (j in constructeurs) {
      const name1 = constructeurs[j].name;

      if (!name1.match(re)) {
        if (constructeurs[j].dirty || (constructeurs[j].hidden != true)) {
          [j].hidden = true;
          const y = Object.assign({},constructeurs[j]);
          publishers_array.set(j,y)
          constructeurs[j].dirty = false;
        }
        continue;
      }


      const new_name = name1.replace(re, (x,y,$3,$4)=>{
        return `<b style="color:blue;">${x}</b>`;
      });

      if (new_name == name1) {
        // unchanged from the original
        constructeurs[j].hidden = true;
      }
      else {
        constructeurs[j].hidden = false;
        const y = Object.assign({},constructeurs[j]);
        y.name = new_name;
        publishers_array.set(j,y)
        constructeurs[j].dirty = true;
      }
    } // loop
    console.log(`etime to update: ${new Date().getTime()-etime}ms.`)
  } // input

})

/*
      Remove title from aka-list
*/

Meteor.startup(() => {
  console.log('startup getting constructeurs...');
  const etime = new Date().getTime();
  Meteor.call('constructeurs-directory', (err, data)=>{
    if (err) throw err;
    _assert(Array.isArray(data),data,'Not an array.')

    console.log(`constructeurs-directory found ${data.length}`)
    data.forEach(co=>{
      assert(!constructeurs[co]);
      constructeurs[co.item_id] = co;
    })

    const entries = XI(data); // one entry for each indexName.
    console.log(`startup etime:${new Date().getTime()-etime}ms. for ${data.length} constructeurs and ${entries.length} indexNames`)
    publishers_array.push(...entries);
console.log(`index entries:`,entries)
console.log(`index data:`, data)
    /*
        After array set.
    */
    /*
    Object.keys(constructeurs).forEach(item_id =>{
      const name = constructeurs[item_id].name;
      constructeurs[name] = constructeurs[item_id]; // name is unique.
    })*/
  });
});

// ---------------------------------------------------------------------------

function XI(constructeurs) {
  _assert(Array.isArray(constructeurs),constructeurs,'Not an array.')
  console.log(`XI: constructeurs-directory found ${constructeurs.length}`)
  const xi = {}; // p.title + p.aka => all entries.
  // each title and each aka will have an entry
  constructeurs.forEach(p =>{
    xi[p.title] = xi[p.title] || {
      item_id: p.item_id,
      iName: p.title,
      plist: []
    }
    xi[p.title].plist.push(p);

    /*
        legalName is set when xi[name] != p.title
    */
    p.aka = p.aka || [];
    p.aka.forEach(aka => {
      xi[aka] = xi[aka] || {
        item_id: p.item_id,
        iName:aka,
        plist:[],
        legalName:p.title
      };
      xi[aka].plist.push(p);
    });
  });

  /*
  v.forEach(p => {
    p.localeName = dkz.RemoveAccents(p.title).toLowerCase();
//      console.log(`localeName:`,p.localeName)
})*/

  console.log(`xi.size:${Object.keys(xi).length}`)
  return Object.values(xi)
//  .sort((a,b)=>(a.localeName.localeCompare(b.localeName, 'fr', {sensitivity: 'base'})))
  .sort((a,b)=>(a.iName.localeCompare(b.iName, 'fr', {sensitivity: 'base'})))
}

// ============================================================================

FlowRouter.route('/constructeurs-directory', { //name: 'authors_directory',
    action: function(params, queryParams){
        console.log('Router::action for: ', FlowRouter.getRouteName());
        console.log(' --- params:',params);
//        document.title = "Museum v9";
//        app.article_id.set(undefined);
        BlazeLayout.render('constructeurs-directory');
    }
});
