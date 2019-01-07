const assert = require('assert');
const app = require('../app-client.js');

const TP = Template['titres-directory'];

const titres = [];
const titres_array = new ReactiveArray(); // should we keep only the columns displayed.

TP.onCreated(function(){
  console.log(`onCreated titres:${Object.keys(titres).length}`);
  // be sure we have the directory in local.
})

TP.onRendered(function(){
  console.log(`onRendered titres:${Object.keys(titres).length}`);
  this.find_input = this.find("#find-titres-input")
  console.log(this.find_input)
})

TP.helpers({
  titres() {
    //const v = titres.get();
    const v = titres_array.get();
    if (!v) return [];
    assert(Array.isArray(v));
    console.log(`helper:titres (${v.length})`)
//    return v.sort((a,b)=>(a.name.localeCompare(b.name)));
    v.forEach(ti=>{
      ti.display_type = (ti.hidden)? 'none':'table-row';
      if (!Array.isArray(ti.h2)) {
        console.log(ti);
        throw 'fatal-33'
      }
    });
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
      for (j in titres) {
        if (titres[j].dirty || (titres[j].hidden == true)) {
          // restore
          titres[j].hidden = false;
//          titres[j].display_type = 'table-row';
          const y = Object.assign({},titres[j]);
          titres_array.set(j,y)
          titres[j].dirty = false;
        }
      }
      return;
    }
    // ------------------------------------------


    console.log('_value:',_value)
    const re = new RegExp(_value,'i')
    console.log('re:',re)
    for (j in titres) {
      const name1 = titres[j].name;
//      console.log(name1)

      if (!name1.match(re)) {
//        titres[j].hidden = true;
        if (titres[j].dirty || (titres[j].hidden != true)) {
          // restore
//          titres[j].display_type = 'none';
          titres[j].hidden = true;
          const y = Object.assign({},titres[j]);
          titres_array.set(j,y)
          titres[j].dirty = false;
        }
        continue;
      }


//      const new_name = name1.replace(re,`<b style="color:blue;">${value}</b>`);
      const new_name = name1.replace(re, (x,y,$3,$4)=>{
        console.log(`replace x:(${x}) y:(${y})(${$3})(${$4})`)
        return `<b style="color:blue;">${x}</b>`;
      });

//      console.log(new_name);
      if (new_name == name1) {
        // unchanged from the original
//        titres[j].display_type = 'none';
        titres[j].hidden = true;
        /*
        if (titres[j].dirty) {
          // restore
          const y = Object.assign({},titres[j]);
          titres_array.set(j,y)
          titres[j].dirty = false;
        }
        */
      }
      else {
  //      titres[j].hidden = false;
//        titres[j].display_type = 'table-row';
        titres[j].hidden = false;
        const y = Object.assign({},titres[j]);
        y.name = new_name;
        titres_array.set(j,y)
        titres[j].dirty = true;
      }
    } // loop
    console.log(`etime to update: ${new Date().getTime()-etime}ms.`)
  } // input

})

function RemoveAccents(strAccents) {
 var strAccents = strAccents.split('');
 var strAccentsOut = new Array();
 var strAccentsLen = strAccents.length;
 var accents = 'ÀÁÂÃÄÅàáâãäåÒÓÔÕÕÖØòóôõöøÈÉÊËèéêëðÇçÐÌÍÎÏìíîïÙÚÛÜùúûüÑñŠšŸÿýŽž';
 var accentsOut = "AAAAAAaaaaaaOOOOOOOooooooEEEEeeeeeCcDIIIIiiiiUUUUuuuuNnSsYyyZz";
 for (var y = 0; y < strAccentsLen; y++) {
   if (accents.indexOf(strAccents[y]) != -1) {
     strAccentsOut[y] = accentsOut.substr(accents.indexOf(strAccents[y]), 1);
   } else
     strAccentsOut[y] = strAccents[y];
 }
 strAccentsOut = strAccentsOut.join('');
 return strAccentsOut;
}


Meteor.startup(() => {
  console.log('startup getting titres...');
  const etime = new Date().getTime();
  Meteor.call('cms-articles-directory', (err,data)=>{
    if (err) {
      console.log('err:',err)
      throw 'fatal-146'
    }
    if (data.error) {
      console.log(data)
      throw 'fatal-150'
    }

    // console.log(data); throw 'fatal-150'

    const _titres = data;
    assert(Array.isArray(_titres));
    _titres.forEach(titre=>{
//      titre.indexName = RemoveAccents(titre.h1).toLowerCase(); // MAYBE NO NEED
      titre.indexName = titre.title
    });

//    const v = Object.values(_titres);
//    v.forEach(au => {au.localeName = RemoveAccents(au.name).toLowerCase();})

  //  .sort((a,b)=>(a.name.localeCompare(b.name, 'fr', {sensitivity: 'base'})))
//    _titres.sort((a,b)=>(a.indexName.localeCompare(b.index, 'fr', {sensitivity: 'base'})))
    console.log(`startup etime:${new Date().getTime()-etime}ms. for ${_titres.length} titres`)


    titres.push(..._titres); // pass an array
//    console.log('BEFORE SORT titres:',titres)
    titres.sort((a,b)=>{
      const iret = a.indexName.localeCompare(b.indexName, 'fr', {sensitivity: 'base'});
      return (iret) || (+a.yp - +b.yp)
    });
    console.log('AFTER SORT titres:',titres)
    titres_array.push(...titres);
  });
});

// ============================================================================

FlowRouter.route('/titres-directory', { name: 'titres_directory',
    action: function(params, queryParams){
        console.log('Router::action for: ', FlowRouter.getRouteName());
        console.log(' --- params:',params);
//        document.titre = "Museum v9";
//        app.article_id.set(undefined);
        BlazeLayout.render('titres-directory');
    }
});
