const assert = require('assert')

import {auteurs, app} from '../app-client.js';
//import {auteurs, auteurs_array} from '../app-client.js';
const TP = Template['index-marques'];

TP.onCreated(function(){
  console.log(`onCreated index-marques:${Object.keys(auteurs).length}`);
  this.index = new ReactiveVar();
  const _index = this.index;
  Meteor.call('index-marques',(err,data)=>{
    if (err) throw err;
    if (data.error) {
      console.log(`[index-marques] data:`,data);
      return;
    }
    //console.log(`index-marques data:`,data);throw 'fatal-29'

    const y = data.map(({marque, articles:titres})=>{
      //console.log(`--v[${k}]:`,v);
//      assert(titres[0].restricted !== undefined)
      if (!titres || titres.length <1) {
        titres.push({fn:"TRANSCRIPTIONx"})
        throw 'stop-24'
      } else {
        if (!Array.isArray(titres)) {
          console.log(titres);
          throw 'fatal-29 Not an array.'
        }

        titres.forEach(titre=>{
          titre.links.forEach((pdf)=>{
            pdf.fn2 = pdf.fn
            .replace(/^[0-9\s]*\s*/,'')
            .replace(/[\s\-]*[0-9]+$/,'');
          })
        })

        titres.sort((a,b)=>(a.yp.localeCompare(b.yp)));
      };

      return {
        marque,
        titres
      };
    });
    y.sort((a,b)=>{
      //console.log(`--${a.auteurName}`)
      return a.marque.localeCompare(b.marque)
    });


    _index.set(y)
    console.log(y)
  }) // call
})

TP.onRendered(function(){
  console.log(`onRendered auteurs-index:${Object.keys(this.index).length}`);
})

TP.helpers({
  marques() { // is an array.
    const tp = Template.instance();
    const marques = tp.index.get();
    console.log(`helper:marques ${marques && marques.length} items`)
    return marques;
  }
});

TP.events({
  'click .js-save-selection':(e,tp)=>{
    e.stopImmediatePropagation();
    console.log(`.js-save-selection e:`,e);
    /*
        Collect all checked auteurs.
    */
    const v = tp.findAll('.js-select-auteur')
    .filter(it=>(it.checked)).map(it=>it.value);
    console.log(v)
    Session.set('selected-auteurs',v)
  }
});


TP.events({
  'input .js-select-auteur': (e,tp)=>{
    e.stopImmediatePropagation();
    console.log(`input target (${e.target.name})=>(${e.target.value}) checked:`,e.target.checked);
  },
  'input': (e,tp)=>{
    const value = e.target.value;
    const etime = new Date().getTime();
    console.log(`input2 target (${e.target.name})=>(${e.target.value})`);

    const _value = value.toLowerCase()
    .replace(/\s+/g,'\\s+')
    .replace(/[aàáâä]/g,'[aàáâä]')
    .replace(/[eèéêë]/g,'[eèéêë]')
    .replace(/[iìíîï]/g,'[iìíîï]')
    .replace(/[oòóôö]/g,'[oòóôö]')

    // ------------------------------------------
    if (!value || value.length<=2) { // reset to visible.
      console.log('reset to visible')
      for (j in auteurs) {
        if (auteurs[j].dirty || (auteurs[j].hidden == true)) {
          // restore
          auteurs[j].hidden = false;
//          auteurs[j].display_type = 'table-row';
          const y = Object.assign({},auteurs[j]);
          app.auteurs_array.set(j,y)
          auteurs[j].dirty = false;
        }
      }
      return;
    }
    // ------------------------------------------


    console.log('_value:',_value)
    const re = new RegExp(_value,'i')
    console.log('re:',re)
    for (j in auteurs) {
      const name1 = auteurs[j].name;
//      console.log(name1)

      if (!name1.match(re)) {
//        auteurs[j].hidden = true;
        if (auteurs[j].dirty || (auteurs[j].hidden != true)) {
          // restore
//          auteurs[j].display_type = 'none';
          auteurs[j].hidden = true;
          const y = Object.assign({},auteurs[j]);
          app.auteurs_array.set(j,y)
          auteurs[j].dirty = false;
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
//        auteurs[j].display_type = 'none';
        auteurs[j].hidden = true;
        /*
        if (auteurs[j].dirty) {
          // restore
          const y = Object.assign({},auteurs[j]);
          auteurs_array.set(j,y)
          auteurs[j].dirty = false;
        }
        */
      }
      else {
  //      auteurs[j].hidden = false;
//        auteurs[j].display_type = 'table-row';
        auteurs[j].hidden = false;
        const y = Object.assign({},auteurs[j]);
        y.name = new_name;
        auteurs_array.set(j,y)
        auteurs[j].dirty = true;
      }
    } // loop
    console.log(`etime to update: ${new Date().getTime()-etime}ms.`)
  } // input

})


// ============================================================================

FlowRouter.route('/index-m', { //name: 'index-marques',
    action: function(params, queryParams){
        console.log('Router::action for: ', FlowRouter.getRouteName());
        console.log(' --- params:',params);
//        document.auteur = "Museum v9";
//        app.article_id.set(undefined);
        BlazeLayout.render('index-marques');
    }
});
