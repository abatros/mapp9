const assert = require('assert')
import {publishers, app} from '../app-client.js';
//import {auteurs, auteurs_array} from '../app-client.js';
const TP = Template['index-constructeurs'];



TP.onCreated(function(){
  console.log(`onCreated index-constructeurs:${Object.keys(publishers).length}`);
  this.index = new ReactiveVar();
  const _index = this.index;

  Meteor.call('index-constructeurs',(err,data)=>{
    if (err) throw err;
    if (data.error) {
      console.log(`index-constructeurs:`,data);
      return;
    }
    console.log(`index-constructeurs receiving ${data.length} rows`)
    /*
        Here we receive 1 record for each article-catalog.
        Inverted index is done on the client.
        First step, fn2 : file-name cleanup and "transcription".
        then add the acronyms.
    */

    data.forEach(cc =>{ // Catalog Construteur
      cc.aka = cc.aka.map(ti=>(ti.trim())).filter(ti=>(ti.length>0)); // FIX.
      if (!cc.links || cc.links.length<1) {
        cc.links.push({
          fn2:"TRANSCRIPTION"
        })
      } else {
        cc.links.forEach((pdf)=>{
          pdf.fn2 = pdf.fn
          .replace(/^[0-9\s]*\s*/,'') // remove 'ca' !!!!
          .replace(/[\s\-]*[0-9]+$/,'');
        })
      }
    }) // each cc.

    const xi = XI(data);
    const y = Object.keys(xi).map(ccName => ({
        ccName,			// constructeur-name
        legalName: xi[ccName].legalName,
        aka: xi[ccName].aka,
        articles: xi[ccName].cats		// list of catalogs.
    }));
    y.sort((a,b)=>{
      //console.log(`--${a.auteurName}`)
      return a.ccName.localeCompare(b.ccName)
    });

    _index.set(y)
    console.log(y)
  });

  if (false) {
  Meteor.call('index-constructeurs',(err,data)=>{
    if (err) throw err;
    if (data.error) {
      console.log(`index-constructeurs:`,data);
      return;
    }
    console.log(`index-constructeurs receiving ${data.length} rows`)
    const y = data.map(({name:cName, articles})=>{
      //console.log(`--v[${k}]:`,v);
      assert(articles[0].restricted !== undefined)
      if (!articles || articles.length <1) {
        articles.push({
          fn:"TRANSCRIPTIONx"
        })
        throw 'stop-24'
      } else {
        articles.forEach(titre=>{
          titre.links.forEach((pdf)=>{
            pdf.fn2 = pdf.fn
            .replace(/^[0-9\s]*\s*/,'')
            .replace(/[\s\-]*[0-9]+$/,'');
          })
        })

        articles.sort((a,b)=>{
          return a.yp.localeCompare(b.yp);
//          return iret || a.title.localeCompare(b.title)
        })
      }
      return {
        cName, // constructeur-name
        articles
      };
    });
    y.sort((a,b)=>{
      //console.log(`--${a.auteurName}`)
      return a.cName.localeCompare(b.cName)
    });


    _index.set(y)
    console.log(y)
  }) // call
}
})

TP.onRendered(function(){
  console.log(`onRendered index-constructeurs:${Object.keys(publishers).length}`);
})

TP.helpers({
  constructeurs() { // is an array.
    const tp = Template.instance();
    return tp.index.get();
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

// ===========================================================================

function XI(articles) {
  const xi = {} // Inverted Index -- for constructor legalName (indexName) and all acronyms => list of catalogs.
  let mCount = 0;

  for (const j in articles) {
    const article = articles[j];
    const {item_id, xid, yp, name, title="*missing*", links, transcription, restricted} = article;

    if (!article.aka || (article.aka.length<1)) {
      notice(`j:${j} titre:${JSON.stringify(article)}`);
      mCount++;
      notice (`index-constructeurs =>fatal article without  xid:${xid} ${mCount}/${j}`);
      continue;
    }
    //notice(JSON.stringify(titre.aka));

//    const aka = article.aka.map(ti=>(ti.trim())).filter(ti=>(ti.length>0)); // FIX.
    aka = new Set(article.aka);

    aka.forEach((cname, ia)=>{
      if (cname.length<1) throw `fatal-65`;
      if (cname.trim().length<1) throw `fatal-66`;
      xi[cname] = xi[cname] || {cats:[]};
      const legalName = (cname == article.aka[0]) ? null : article.aka[0];
//      const legalName = article.aka[0];
//console.log(`legalName(${cname})=>${legalName}`)
      xi[cname].legalName = legalName;
      xi[cname].aka = article.aka;
      aka.delete(cname);
      xi[cname].aka = Array.from(aka);
//      xi[cname].aka = Array.from(aka);
      console.log(`aka(${cname})=>`,xi[cname].aka);

      xi[cname].cats.push({
  	    item_id,
        title,
        xid,
        yp,
        name,
        links,
        transcription,
        restricted
      })
    }); // each aka
  }; // each article.

  /*
  const colist = Object.keys(xi).map(name => ({
      name,			// constructeur-name
      articles: xi[name].cats		// list of catalogs.
  }));
  */
  return xi; // we might need that hash-table, instead of an array.
}

// ============================================================================

FlowRouter.route('/index-c', { //name: 'auteurs_directory',
    action: function(params, queryParams){
        console.log('Router::action for: ', FlowRouter.getRouteName());
        console.log(' --- params:',params);
//        document.auteur = "Museum v9";
//        app.article_id.set(undefined);
        BlazeLayout.render('index-constructeurs');
    }
});
