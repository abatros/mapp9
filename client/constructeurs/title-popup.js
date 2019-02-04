const TP = Template['title_popup'];

import {utils, app} from '../app-client.js';
import {nor_au2} from '../../xlsx-upload/dkz-lib.js'

TP.onCreated(function(){
//  this.original_title = Session.get('original-title'); // flip-flop
// this.normal_name.set(utils.normal_title(this.original));
  this.autogen = true;
  console.log('onCreated data:',this.data) // is the original.
  const {name, title, on_apply} = this.data;
  // this.data is the original
  this.data._title = title;
  this.data._name = new ReactiveVar(nor_au2(title));

  const tp = this;
  this.assert = function(err){
    tp.data.err_message = err;
  }
})

TP.onRendered(()=>{

})

TP.helpers({
  uname() {
    const new_name = Template.instance().data._name.get()
    return new_name;
  }
})

TP.events({
  'input .js-new-title': (e,tp)=>{
    tp._title = e.target.value; // so we don't need to consult the UI. later
    const _name = nor_au2(tp._title);
    console.log(`(${tp._title})=>(${_name})`)
    // check if collision.
    if (tp.autogen) {
      tp.data._name.set(_name)
    }
  },
  'click .js-quit': (e,tp)=>{
    // How to tell the parent to close.
    tp.data.on_exit({
      retCode: 'js-quit'
    })
    return;
  },
});


TP.events({
  'click .js-apply': async (e,tp)=>{
    /*
      collect new data and send back to caller for processing.
    */

    /*
    const name = tp.data._name.get();
    if (!name) {
      console.log('UNAME NOT SET. try again or quit')
      return;
    }*/

//    const parent = tp.data.parent
    const cmd = {
      name: tp.data._name.get(),
      title: tp._title,
      retCode: 'js-apply'
    }

    tp.assert(cmd.name, `Missing name`)
    tp.assert(cmd.title, `Missing title`)

  console.log('popup returning cmd:',cmd)
    tp.data.on_exit(cmd)
    return;
/*
    const parent = tp.data.parent
    const find_byName = parent._find_byName;

    app.update_title(parent, {
      title: tp.new_title,
      name: uname
    }).then(retv=>{
      console.log('retv:',retv)
      // here some logic: change name only if not orginal
    }).catch(err =>{
      console.log('err:',err);
    })
*/
    /*
    if ((uname != parent.name) || (tp.new_title != parent.title)) {
      const update_title = parent.update_title;
    }
    */

    return;


    if (uname != parent.name) {
      // let's change the name if new available
      // do one operation.
      const update_title = parent.update_title;
//      const find_byName = Template.currentData().parent.find_byName;
      const find_byName = parent.find_byName;
      find_byName(uname).then(retv=>{
        console.log('retv:',retv)
        // here some logic: change name only if not orginal
      }).catch(err =>{
        console.log('err:',err);
      })
      return;
    }

    /*

        Here, we might have to update title.

    */
    console.log(`(${tp.new_title})<=>(${parent.title})`)
    if (tp.new_title != parent.title) {
      console.log('update title');
    }

  },
})


TP.events({
  'click .js-validate': (e,tp)=>{
    console.log(`validate name:(${tp.uname})`);
    console.log('dataset:',tp.data.dataset)
    // execute callback, set ...
  }
})

/*
<template name='edit-title-popup'>
  <div id="edit-title">
    <label for="">original</label>
    <div>{{title.original}}</div>
    <label for="">new title</label>
    <input type="text" name="new-title">
    <label for="">new name</label>
    <input type="text" name="new-name">
  </div>
</template>
*/
