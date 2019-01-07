//import _ from 'lodash'
const _ = require('lodash');

module.exports = {
// ----------------------------------------------------------------------------

check_missing: function (o,s,fn) {
  const v = s.split(/[,\s]/).filter(p=>(p && !o[p]));
  if (fn) {
    if (v.length >0) {
      console.log("************************************************************")
      console.log(`ALERT check_missing reported ${v.length} error(s) in object:`,Object.keys(o))
      v.forEach(it=>{
        console.log(` -- MISSING "${it}"`)
      })
      console.log("************************************************************")
    }
    fn.apply(v);
    return;
  }
  return (v.length>0)?v:null;
},

undefine: function(o,s) { // NO cloning here.
  s.split(/[,\s]/).forEach(p =>{o[p]=undefined;})
  return o;
},

pick: function(o,s) { // NO cloning here.
  return _.pick(o, s.split(/[,\s]/))
},

RemoveAccents: function (strAccents) {
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
},

// ----------------------------------------------------------------------------
}
