import dkz from '../../imports/dkz-lib.js';
import {publishers, publishers_array, app} from '../app-client.js';

const TP = Template['soc-directory'];

TP.onCreated(function(){
})

TP.onRendered(function(){
  this.find_input = this.find("#find-soc-input")
  console.log(this.find_input)
})

TP.helpers({
  soc() {
    const v = publishers_array.get();
    if (!v) return [];
    /*  DO IT on publishers[item_id]
    v.forEach(p=>{
      p.display_type = (p.hidden)? 'none':'table-row';
    });
    */
    return v;
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
      for (j in publishers) {
        if (publishers[j].dirty || (publishers[j].hidden == true)) {
          // restore
          publishers[j].hidden = false;
//          authors[j].display_type = 'table-row';
          const y = Object.assign({},publishers[j]);
          publishers_array.set(j,y)
          publishers[j].dirty = false;
        }
      }
      return;
    }
    // ------------------------------------------

    const re = new RegExp(_value,'i')
    for (j in publishers) {
      const name1 = publishers[j].name;

      if (!name1.match(re)) {
        if (publishers[j].dirty || (publishers[j].hidden != true)) {
          [j].hidden = true;
          const y = Object.assign({},publishers[j]);
          publishers_array.set(j,y)
          publishers[j].dirty = false;
        }
        continue;
      }


      const new_name = name1.replace(re, (x,y,$3,$4)=>{
        return `<b style="color:blue;">${x}</b>`;
      });

      if (new_name == name1) {
        // unchanged from the original
        publishers[j].hidden = true;
      }
      else {
        publishers[j].hidden = false;
        const y = Object.assign({},publishers[j]);
        y.name = new_name;
        publishers_array.set(j,y)
        publishers[j].dirty = true;
      }
    } // loop
    console.log(`etime to update: ${new Date().getTime()-etime}ms.`)
  } // input

})



Meteor.startup(() => {
  console.log('startup getting publishers...');
  const etime = new Date().getTime();
  Meteor.call('soc-directory','xx', (err,data)=>{
    if (err) {
      console.log('err:',err)
      throw 'fatal-116'
      return;
    }

    console.log(`soc-directory found ${data.length} soc data:`,data)
    data.forEach(it=>{
      const p = dkz.pick(it, 'item_id, name, title, revision_id');
      publishers[p.item_id] = p; // name is unique.
    })
    const v = Object.values(publishers);
    v.forEach(p => {
      p.localeName = dkz.RemoveAccents(p.title).toLowerCase();
//      console.log(`localeName:`,p.localeName)
    })

  //  .sort((a,b)=>(a.name.localeCompare(b.name, 'fr', {sensitivity: 'base'})))
    v.sort((a,b)=>(a.localeName.localeCompare(b.localeName, 'fr', {sensitivity: 'base'})))
    console.log(`startup etime:${new Date().getTime()-etime}ms. for ${v.length} publishers`)
    publishers_array.push(...v);

    /*
        After array set.
    */

    Object.keys(publishers).forEach(item_id =>{
      const name = publishers[item_id].name;
      publishers[name] = publishers[item_id]; // name is unique.
    })
  });
});

// ============================================================================

FlowRouter.route('/soc-directory', { //name: 'authors_directory',
    action: function(params, queryParams){
        console.log('Router::action for: ', FlowRouter.getRouteName());
        console.log(' --- params:',params);
//        document.title = "Museum v9";
//        app.article_id.set(undefined);
        BlazeLayout.render('soc-directory');
    }
});
