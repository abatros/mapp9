import { Meteor } from 'meteor/meteor';

import './methods.js'
//import './publisher-methods.js'

/*
(()=>{
  const retv = require('dotenv').config()
  if (retv.error) {
    throw retv.error;
  }
})();
*/

/*
{
  "private": {
    "host":"localhost",
    "user": "postgres",
    "password":"xxxxxxxxxxxxxxxx",
    "database":"cms-oacs",
    "pg_monitor":true,
    "app_instance": "cms-236393"
  }
}
*/


Meteor.startup(() => {
  // code to run on server at startup
});
