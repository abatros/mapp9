const TP = Template['edit_title'];

import {utils, app} from './app-client.js';

TP.onCreated(function(){
//  this.original_title = Session.get('original-title'); // flip-flop
// this.normal_name.set(utils.normal_title(this.original));
  this.autogen = true;
  console.log('data:',this.data)
  this.new_title = this.data.parent.title;
//  this.new_name = new ReactiveVar(utils.normal_title(this.new_title));
//  this.new_name = new ReactiveVar(this.data.parent.name);
  this.new_name = new ReactiveVar(utils.normal_title(this.new_title));
  // this.data.original is data from parent.
})

TP.onRendered(()=>{

})

TP.helpers({
  uname() {
    tp = Template.instance();
    return tp.new_name.get();
  }
})

TP.events({
  'input .js-new-title': (e,tp)=>{
    tp.new_title = e.target.value;
    const new_name = utils.normal_title(tp.new_title);
    console.log(`(${tp.new_title})=>(${new_name})`)
    // check if collision.
    if (tp.autogen) {
      tp.new_name.set(new_name)
    }
  },
  'click .js-quit': (e,tp)=>{
    Session.set('original-title',null);
    tp.data.parent._post_edit_title({
      retCode: 'quit'
    })
    // the parent will close.
  },
  'click .js-apply': async (e,tp)=>{
    /*
      collect new data and send back to caller for processing.
    */

    const new_name = tp.new_name.get();
    if (!new_name) {
      console.log('UNAME NOT SET. try again or quit')
      return;
    }

    const parent = tp.data.parent
    const cmd = {
      name: new_name,
      title: tp.new_title,
      retCode: 'apply'
    }

    console.log('popup returning cmd:',cmd)
    parent._post_edit_title(cmd)
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
