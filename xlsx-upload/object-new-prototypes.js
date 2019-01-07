
Object.prototype.check_list = (o, s, fn)=>{
  const v = s.split(/[,\s]/).filter(p=>(p && !o[p]));
  if (fn) {
    if (v.length >0) {
      console.log("************************************************************")
      console.log(`ALERT check_missing reported ${v.length} error(s) in object: {${Object.keys(o).join(', ')}}`)
      v.forEach(it=>{
        console.log(` -- MISSING "${it}"`)
      })
      console.log("************************************************************")
    }
    fn((v.length>0)?v:null);
    return;
  }

  return (v.length>0)?v:null;
}
