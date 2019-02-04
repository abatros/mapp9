import { Meteor } from 'meteor/meteor';

import './methods.js'
import './cms-server.js'
import './methods/cms-articles-directory.js'
import './methods/cms-authors-directory.js'
import './methods/constructeurs-directory.js'
import './methods/constructeur-infos.js'
import './methods/catalogs-directory.js'
import './methods/index-constructeurs.js'
import './methods/index-s3.js'

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
